import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Model } from 'mongoose';
import { TenantContext, rpcError } from '@app/common';
import { Notification } from './schemas/notification.schema';
import { AuditEvent } from './schemas/audit-event.schema';

export const INTEGRATION_CLIENT = 'INTEGRATION_CLIENT';
export const IDENTITY_CLIENT = 'IDENTITY_CLIENT';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
    @InjectModel(AuditEvent.name) private readonly auditEvents: Model<AuditEvent>,
    @Inject(INTEGRATION_CLIENT) private readonly integration: ClientProxy,
    @Inject(IDENTITY_CLIENT) private readonly identity: ClientProxy,
  ) {}

  async list(tenant: TenantContext, userId: string, limit = 20, before?: string) {
    const filter: Record<string, unknown> = { tenantId: tenant.tenantId, userId };
    if (before) filter._id = { $lt: before };
    const docs = await this.notifications
      .find(filter)
      .sort({ _id: -1 })
      .limit(Math.min(limit, 50))
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      title: d.title,
      body: d.body,
      category: d.category,
      read: d.read,
      data: d.data ?? null,
      created_at: (d as { createdAt?: Date }).createdAt,
    }));
  }

  async unreadCount(tenant: TenantContext, userId: string) {
    const count = await this.notifications.countDocuments({
      tenantId: tenant.tenantId,
      userId,
      read: false,
    });
    return { unread: count };
  }

  async markRead(tenant: TenantContext, userId: string, id: string) {
    const res = await this.notifications.updateOne(
      { _id: id, tenantId: tenant.tenantId, userId },
      { $set: { read: true } },
    );
    if (res.matchedCount === 0) rpcError(404, 'Notification not found');
    return { read: true };
  }

  async markAllRead(tenant: TenantContext, userId: string) {
    const res = await this.notifications.updateMany(
      { tenantId: tenant.tenantId, userId, read: false },
      { $set: { read: true } },
    );
    return { marked: res.modifiedCount };
  }

  /** Internal: other services dispatch user notifications through this. */
  async create(
    tenant: TenantContext,
    userId: string,
    title: string,
    body: string,
    category: string,
    data?: Record<string, unknown>,
  ) {
    const doc = await this.notifications.create({
      tenantId: tenant.tenantId,
      userId,
      title,
      body,
      category,
      data,
    });
    // Append-only audit trail: every dispatched status/payment event is
    // recorded and never mutated (Reference §5.13).
    await this.auditEvents
      .create({ tenantId: tenant.tenantId, category, title, userId, data })
      .catch(() => undefined);
    // Best-effort outbound fan-out. Never fails or delays the in-app write.
    void this.maybePush(tenant, userId, title, body);
    return { id: String(doc._id) };
  }

  async auditLog(tenant: TenantContext, category?: string, limit = 50) {
    const filter: Record<string, unknown> = { tenantId: tenant.tenantId };
    if (category) filter.category = category;
    const docs = await this.auditEvents
      .find(filter)
      .sort({ _id: -1 })
      .limit(Math.min(limit, 200))
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      category: d.category,
      title: d.title,
      user_id: d.userId,
      data: d.data ?? null,
      at: (d as { createdAt?: Date }).createdAt,
    }));
  }

  /** Fan a notification out to the citizen's Usapp account, if the tenant opts in. */
  private async maybePush(
    tenant: TenantContext,
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    if (tenant.pushChannel !== 'usapp') return;
    try {
      const { phone_number } = await firstValueFrom(
        this.identity.send<{ phone_number: string | null }>(
          { cmd: 'identity.phone.resolve' },
          { tenant, data: { user_id: userId } },
        ),
      );
      if (!phone_number) return; // guest / no phone on file
      await firstValueFrom(
        this.integration.send(
          { cmd: 'integration.usapp.send' },
          { phone: phone_number, content: `${title}\n${body}` },
        ),
      );
    } catch (e) {
      const msg = (e as { error?: { message?: string }; message?: string })?.error?.message
        ?? (e as { message?: string })?.message
        ?? String(e);
      this.logger.warn(`Usapp push skipped: ${msg}`);
    }
  }
}
