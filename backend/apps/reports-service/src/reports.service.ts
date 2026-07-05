import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { TenantContext, rpcError, ticketId } from '@app/common';
import {
  ReportCategory,
  Ticket,
  TicketCounter,
  TicketStatus,
  TICKET_TRANSITIONS,
} from './schemas/ticket.schema';

export const NOTIFICATION_CLIENT = 'NOTIFICATION_CLIENT';

export interface CreateTicketInput {
  user_id: string;
  category_key: string;
  description: string;
  photos?: string[];
  geo: { lat: number; lng: number };
  address?: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Ticket.name) private readonly tickets: Model<Ticket>,
    @InjectModel(TicketCounter.name) private readonly counters: Model<TicketCounter>,
    @InjectModel(ReportCategory.name) private readonly categories: Model<ReportCategory>,
    @Inject(NOTIFICATION_CLIENT) private readonly notifications: ClientProxy,
  ) {}

  async listCategories(tenant: TenantContext) {
    const docs = await this.categories
      .find({ tenantId: tenant.tenantId })
      .sort({ order: 1 })
      .lean();
    return docs.map((c) => ({ key: c.key, label: c.label, icon: c.icon, department: c.department }));
  }

  async create(tenant: TenantContext, input: CreateTicketInput) {
    const category = await this.categories
      .findOne({ tenantId: tenant.tenantId, key: input.category_key })
      .lean();
    if (!category) rpcError(400, `Unknown report category: ${input.category_key}`);

    const counter = await this.counters.findOneAndUpdate(
      { tenantId: tenant.tenantId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const id = ticketId(tenant.ticketPrefix, counter.seq);
    const now = new Date();
    const doc = await this.tickets.create({
      tenantId: tenant.tenantId,
      ticketId: id,
      userId: input.user_id,
      categoryKey: category.key,
      categoryLabel: category.label,
      department: category.department,
      description: input.description,
      photos: input.photos ?? [],
      geo: input.geo,
      address: input.address,
      status: 'SUBMITTED',
      transitions: [{ from: null, to: 'SUBMITTED', actor: `user:${input.user_id}`, at: now }],
    });
    return this.publicTicket(doc.toObject() as unknown as Record<string, unknown>);
  }

  async listMine(tenant: TenantContext, userId: string, limit = 20) {
    const docs = await this.tickets
      .find({ tenantId: tenant.tenantId, userId })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();
    return docs.map((d) => this.publicTicket(d as unknown as Record<string, unknown>));
  }

  async get(tenant: TenantContext, userId: string, id: string) {
    const doc = await this.tickets
      .findOne({ tenantId: tenant.tenantId, userId, ticketId: id })
      .lean();
    if (!doc) rpcError(404, 'Ticket not found');
    return this.publicTicket(doc as unknown as Record<string, unknown>);
  }

  /** Staff/control-plane transition; every hop audited (actor + timestamp). */
  async transition(
    tenant: TenantContext,
    id: string,
    to: TicketStatus,
    actor: string,
    note?: string,
  ) {
    const doc = await this.tickets.findOne({ tenantId: tenant.tenantId, ticketId: id });
    if (!doc) rpcError(404, 'Ticket not found');
    const allowed = TICKET_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(to)) {
      rpcError(409, `Illegal transition ${doc.status} -> ${to}`);
    }
    doc.transitions.push({ from: doc.status, to, actor, at: new Date(), note });
    doc.status = to;
    await doc.save();

    // Notifications subscribe to every status change (Reference §5.9).
    this.notifications
      .send(
        { cmd: 'notifications.create' },
        {
          tenant,
          data: {
            user_id: doc.userId,
            title: `Report ${doc.ticketId} ${to === 'UNDER_REVIEW' ? 'is under review' : to.toLowerCase()}`,
            body:
              to === 'RESOLVED'
                ? `Your ${doc.categoryLabel} report has been resolved by ${doc.department}.${note ? ` ${note}` : ''}`
                : `Your ${doc.categoryLabel} report is now ${to.replace('_', ' ').toLowerCase()} with ${doc.department}.`,
            category: 'reports311',
            data: { ticket_id: doc.ticketId, status: to },
          },
        },
      )
      .subscribe({
        error: (e: Error) => this.logger.warn(`notification dispatch failed: ${e.message}`),
      });

    return this.publicTicket(doc.toObject() as unknown as Record<string, unknown>);
  }

  private publicTicket(d: Record<string, unknown>) {
    const transitions = (d.transitions as { from: string | null; to: string; actor: string; at: Date; note?: string }[]).map(
      (t) => ({ from: t.from, to: t.to, actor: t.actor, at: t.at, note: t.note ?? null }),
    );
    return {
      ticket_id: d.ticketId,
      category: { key: d.categoryKey, label: d.categoryLabel },
      department: d.department,
      description: d.description,
      photos: d.photos,
      geo: d.geo,
      address: d.address ?? null,
      status: d.status,
      timeline: transitions,
      created_at: (d as { createdAt?: Date }).createdAt,
    };
  }
}
