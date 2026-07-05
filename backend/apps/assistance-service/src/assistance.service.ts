import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { TenantContext, rpcError } from '@app/common';
import {
  AssistanceProgram,
  AssistanceRequest,
  RequestCounter,
  RequestStatus,
  REQUEST_TRANSITIONS,
} from './schemas/assistance.schema';

export const NOTIFICATION_CLIENT = 'NOTIFICATION_CLIENT';

@Injectable()
export class AssistanceService {
  private readonly logger = new Logger(AssistanceService.name);

  constructor(
    @InjectModel(AssistanceProgram.name) private readonly programs: Model<AssistanceProgram>,
    @InjectModel(AssistanceRequest.name) private readonly requests: Model<AssistanceRequest>,
    @InjectModel(RequestCounter.name) private readonly counters: Model<RequestCounter>,
    @Inject(NOTIFICATION_CLIENT) private readonly notifications: ClientProxy,
  ) {}

  async listPrograms(tenant: TenantContext) {
    const docs = await this.programs.find({ tenantId: tenant.tenantId }).sort({ order: 1 }).lean();
    return docs.map((p) => ({
      key: p.key,
      name: p.name,
      description: p.description,
      icon: p.icon,
      office: p.office,
      requirements: p.requirements,
    }));
  }

  async create(tenant: TenantContext, userId: string, programKey: string, details: string) {
    const program = await this.programs
      .findOne({ tenantId: tenant.tenantId, key: programKey })
      .lean();
    if (!program) rpcError(400, `Unknown assistance program: ${programKey}`);
    const counter = await this.counters.findOneAndUpdate(
      { tenantId: tenant.tenantId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const requestId = `${tenant.ticketPrefix}-AST-${String(counter.seq).padStart(6, '0')}`;
    const doc = await this.requests.create({
      tenantId: tenant.tenantId,
      requestId,
      userId,
      programKey: program.key,
      programName: program.name,
      office: program.office,
      details,
      checklist: program.requirements.map((name) => ({ name, provided: false })),
      status: 'SUBMITTED',
      transitions: [{ from: null, to: 'SUBMITTED', actor: `user:${userId}`, at: new Date() }],
    });
    return this.publicRequest(doc.toObject() as unknown as Record<string, unknown>);
  }

  async listMine(tenant: TenantContext, userId: string) {
    const docs = await this.requests
      .find({ tenantId: tenant.tenantId, userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return docs.map((d) => this.publicRequest(d as unknown as Record<string, unknown>));
  }

  async get(tenant: TenantContext, userId: string, requestId: string) {
    const doc = await this.requests
      .findOne({ tenantId: tenant.tenantId, userId, requestId })
      .lean();
    if (!doc) rpcError(404, 'Request not found');
    return this.publicRequest(doc as unknown as Record<string, unknown>);
  }

  /** Staff transition; APPROVED can carry a claim schedule + location. */
  async transition(
    tenant: TenantContext,
    requestId: string,
    to: RequestStatus,
    actor: string,
    note?: string,
    claimSchedule?: string,
    claimLocation?: string,
    checklist?: { name: string; provided: boolean }[],
  ) {
    const doc = await this.requests.findOne({ tenantId: tenant.tenantId, requestId });
    if (!doc) rpcError(404, 'Request not found');
    const allowed = REQUEST_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(to)) rpcError(409, `Illegal transition ${doc.status} -> ${to}`);
    doc.transitions.push({ from: doc.status, to, actor, at: new Date(), note });
    doc.status = to;
    if (checklist) doc.checklist = checklist;
    if (to === 'APPROVED') {
      doc.claimSchedule = claimSchedule ? new Date(claimSchedule) : new Date(Date.now() + 3 * 86400000);
      doc.claimLocation = claimLocation ?? doc.office;
    }
    await doc.save();

    const titles: Record<string, string> = {
      UNDER_REVIEW: `Assistance request ${doc.requestId} is under review`,
      APPROVED: `Assistance request ${doc.requestId} approved`,
      DENIED: `Assistance request ${doc.requestId} was denied`,
    };
    this.notifications
      .send(
        { cmd: 'notifications.create' },
        {
          tenant,
          data: {
            user_id: doc.userId,
            title: titles[to] ?? `Request ${doc.requestId}: ${to}`,
            body:
              to === 'APPROVED'
                ? `Claim at ${doc.claimLocation} on ${doc.claimSchedule?.toDateString()}.${note ? ` ${note}` : ''}`
                : (note ?? `Your ${doc.programName} request is now ${to.replace('_', ' ').toLowerCase()}.`),
            category: 'assistance',
            data: { request_id: doc.requestId, status: to },
          },
        },
      )
      .subscribe({
        error: (e: Error) => this.logger.warn(`notification dispatch failed: ${e.message}`),
      });
    return this.publicRequest(doc.toObject() as unknown as Record<string, unknown>);
  }

  private publicRequest(d: Record<string, unknown>) {
    return {
      request_id: d.requestId,
      program: { key: d.programKey, name: d.programName },
      office: d.office,
      details: d.details,
      checklist: (d.checklist as { name: string; provided: boolean }[]).map((c) => ({
        name: c.name,
        provided: c.provided,
      })),
      status: d.status,
      claim_schedule: d.claimSchedule ?? null,
      claim_location: d.claimLocation ?? null,
      timeline: (d.transitions as { from: string | null; to: string; actor: string; at: Date; note?: string }[]).map(
        (t) => ({ from: t.from, to: t.to, actor: t.actor, at: t.at, note: t.note ?? null }),
      ),
      created_at: (d as { createdAt?: Date }).createdAt,
    };
  }
}
