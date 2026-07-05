import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TenantContext, claimStubId, rpcError } from '@app/common';
import { PrismaService } from './prisma.service';

export const NOTIFICATION_CLIENT = 'NOTIFICATION_CLIENT';

export const APPLICATION_STATUSES = ['PENDING_PAYMENT', 'PROCESSING', 'READY', 'CLAIMED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Legal transitions of the e-gov claim flow (Reference §5.2). */
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  PENDING_PAYMENT: ['PROCESSING'],
  PROCESSING: ['READY'],
  READY: ['CLAIMED'],
  CLAIMED: [],
};

interface Transition {
  from: string | null;
  to: string;
  actor: string;
  at: string;
  note?: string;
}

@Injectable()
export class EgovService {
  private readonly logger = new Logger(EgovService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_CLIENT) private readonly notifications: ClientProxy,
  ) {}

  async catalog(tenant: TenantContext) {
    const items = await this.prisma.serviceCatalogItem.findMany({
      where: { tenantId: tenant.tenantId, active: true },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
    const groups = new Map<string, object[]>();
    for (const item of items) {
      const list = groups.get(item.group) ?? [];
      list.push({
        code: item.code,
        name: item.name,
        description: item.description,
        fee: Number(item.fee),
        requirements: item.requirements,
        processing_days: item.processingDays,
      });
      groups.set(item.group, list);
    }
    return [...groups.entries()].map(([group, services]) => ({ group, services }));
  }

  async createApplication(
    tenant: TenantContext,
    userId: string,
    serviceCode: string,
    formData: Record<string, unknown>,
  ) {
    const service = await this.prisma.serviceCatalogItem.findUnique({
      where: { tenantId_code: { tenantId: tenant.tenantId, code: serviceCode } },
    });
    if (!service || !service.active) rpcError(404, `Unknown service: ${serviceCode}`);
    const feeRule = await this.prisma.feeRule.findUnique({
      where: { tenantId: tenant.tenantId },
    });
    const convenienceFee = Number(feeRule?.convenienceFee ?? 0);

    const [seqRow] = await this.prisma.$transaction([
      this.prisma.applicationSequence.upsert({
        where: {
          tenantId_serviceCode: { tenantId: tenant.tenantId, serviceCode: service.code },
        },
        create: { tenantId: tenant.tenantId, serviceCode: service.code, seq: 1 },
        update: { seq: { increment: 1 } },
      }),
    ]);
    const stubId = claimStubId(tenant.ticketPrefix, service.code, seqRow.seq);
    const fee = Number(service.fee);
    const now = new Date();
    const app = await this.prisma.application.create({
      data: {
        tenantId: tenant.tenantId,
        userId,
        serviceId: service.id,
        stubId,
        status: 'PENDING_PAYMENT',
        formData: formData as object,
        fee,
        convenienceFee,
        total: fee + convenienceFee,
        transitions: [
          { from: null, to: 'PENDING_PAYMENT', actor: `user:${userId}`, at: now.toISOString() },
        ] as object[],
      },
      include: { service: true },
    });
    return this.publicApplication(app);
  }

  async pay(
    tenant: TenantContext,
    userId: string,
    applicationId: string,
    method: string,
    idempotencyKey: string,
    allowedMethods: string[],
  ) {
    if (!allowedMethods.includes(method)) {
      rpcError(400, `Payment method '${method}' not enabled for this tenant`);
    }
    // Idempotency: same key returns the original result, never a double charge.
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { application: { include: { service: true } } },
    });
    if (existing) {
      return {
        payment: this.publicPayment(existing),
        application: this.publicApplication(existing.application),
        idempotent_replay: true,
      };
    }

    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId: tenant.tenantId, userId },
      include: { service: true },
    });
    if (!app) rpcError(404, 'Application not found');
    if (app.status !== 'PENDING_PAYMENT') rpcError(409, `Application is ${app.status}`);

    // Provider adapter seam (PayMongo/Xendit-class). Mock settles instantly.
    const providerRef = `mock-${method}-${Date.now()}`;

    const year = new Date().getFullYear();
    const [receiptSeq] = await this.prisma.$transaction([
      this.prisma.receiptSequence.upsert({
        where: { tenantId_year: { tenantId: tenant.tenantId, year } },
        create: { tenantId: tenant.tenantId, year, seq: 1 },
        update: { seq: { increment: 1 } },
      }),
    ]);
    const receiptNo = `${tenant.ticketPrefix}-OR-${year}-${String(receiptSeq.seq).padStart(6, '0')}`;

    const transitions = [
      ...(app.transitions as unknown as Transition[]),
      {
        from: 'PENDING_PAYMENT',
        to: 'PROCESSING',
        actor: `payment:${method}`,
        at: new Date().toISOString(),
        note: `Paid via ${method}, OR ${receiptNo}`,
      },
    ];
    const readyEta = new Date(Date.now() + app.service.processingDays * 86400000);
    const windowNo = `W${(receiptSeq.seq % 6) + 1}`;

    const [payment, updatedApp] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          tenantId: tenant.tenantId,
          applicationId: app.id,
          userId,
          method,
          amount: app.total,
          status: 'completed',
          idempotencyKey,
          receiptNo,
          providerRef,
        },
      }),
      this.prisma.application.update({
        where: { id: app.id },
        data: {
          status: 'PROCESSING',
          transitions: transitions as object[],
          readyEta,
          windowNo,
        },
        include: { service: true },
      }),
    ]);

    this.notify(tenant, userId, updatedApp.stubId, 'PROCESSING', `Official receipt ${receiptNo}.`);
    return {
      payment: this.publicPayment(payment),
      application: this.publicApplication(updatedApp),
      idempotent_replay: false,
    };
  }

  async listMine(tenant: TenantContext, userId: string) {
    const apps = await this.prisma.application.findMany({
      where: { tenantId: tenant.tenantId, userId },
      orderBy: { createdAt: 'desc' },
      include: { service: true },
      take: 50,
    });
    return apps.map((a) => this.publicApplication(a));
  }

  async get(tenant: TenantContext, userId: string, stubId: string) {
    const app = await this.prisma.application.findFirst({
      where: { stubId, tenantId: tenant.tenantId, userId },
      include: { service: true },
    });
    if (!app) rpcError(404, 'Application not found');
    return this.publicApplication(app);
  }

  /** Staff/control-plane transition (PROCESSING → READY → CLAIMED), audited. */
  async transition(tenant: TenantContext, stubId: string, to: ApplicationStatus, actor: string, note?: string) {
    const app = await this.prisma.application.findFirst({
      where: { stubId, tenantId: tenant.tenantId },
      include: { service: true },
    });
    if (!app) rpcError(404, 'Application not found');
    const allowed = APPLICATION_TRANSITIONS[app.status as ApplicationStatus] ?? [];
    if (!allowed.includes(to)) rpcError(409, `Illegal transition ${app.status} -> ${to}`);
    const transitions = [
      ...(app.transitions as unknown as Transition[]),
      { from: app.status, to, actor, at: new Date().toISOString(), note },
    ];
    const updated = await this.prisma.application.update({
      where: { id: app.id },
      data: { status: to, transitions: transitions as object[] },
      include: { service: true },
    });
    this.notify(tenant, app.userId, app.stubId, to, note);
    return this.publicApplication(updated);
  }

  private notify(tenant: TenantContext, userId: string, stubId: string, status: string, note?: string) {
    const titles: Record<string, string> = {
      PROCESSING: `Application ${stubId} is being processed`,
      READY: `${stubId} is ready for claiming`,
      CLAIMED: `${stubId} has been claimed`,
    };
    this.notifications
      .send(
        { cmd: 'notifications.create' },
        {
          tenant,
          data: {
            user_id: userId,
            title: titles[status] ?? `Application ${stubId}: ${status}`,
            body: note ?? `Your application ${stubId} is now ${status.replace('_', ' ').toLowerCase()}.`,
            category: 'egov',
            data: { stub_id: stubId, status },
          },
        },
      )
      .subscribe({
        error: (e: Error) => this.logger.warn(`notification dispatch failed: ${e.message}`),
      });
  }

  private publicApplication(app: {
    stubId: string;
    status: string;
    formData: unknown;
    fee: unknown;
    convenienceFee: unknown;
    total: unknown;
    windowNo: string | null;
    readyEta: Date | null;
    transitions: unknown;
    createdAt: Date;
    service: { code: string; name: string; group: string };
  }) {
    return {
      stub_id: app.stubId,
      service: { code: app.service.code, name: app.service.name, group: app.service.group },
      status: app.status,
      form_data: app.formData,
      fees: {
        fee: Number(app.fee),
        convenience_fee: Number(app.convenienceFee),
        total: Number(app.total),
      },
      window_no: app.windowNo,
      ready_eta: app.readyEta?.toISOString() ?? null,
      timeline: app.transitions,
      qr_payload: app.stubId,
      created_at: app.createdAt.toISOString(),
    };
  }

  private publicPayment(p: {
    id: string;
    method: string;
    amount: unknown;
    status: string;
    receiptNo: string | null;
    createdAt: Date;
  }) {
    return {
      payment_id: p.id,
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      receipt_no: p.receiptNo,
      created_at: p.createdAt.toISOString(),
    };
  }
}
