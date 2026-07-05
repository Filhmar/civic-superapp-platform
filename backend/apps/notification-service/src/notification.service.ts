import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantContext, rpcError } from '@app/common';
import { Notification } from './schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
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
    return { id: String(doc._id) };
  }
}
