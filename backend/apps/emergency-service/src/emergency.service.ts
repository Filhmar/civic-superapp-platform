import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantContext, rpcError } from '@app/common';
import { Hotline, SosCounter, SosSession } from './schemas/emergency.schema';

const MAX_LOCATIONS_KEPT = 200;

@Injectable()
export class EmergencyService {
  constructor(
    @InjectModel(Hotline.name) private readonly hotlines: Model<Hotline>,
    @InjectModel(SosSession.name) private readonly sessions: Model<SosSession>,
    @InjectModel(SosCounter.name) private readonly counters: Model<SosCounter>,
  ) {}

  async listHotlines(tenant: TenantContext, tag?: string) {
    const filter: Record<string, unknown> = { tenantId: tenant.tenantId };
    if (tag) filter.tag = tag;
    const docs = await this.hotlines.find(filter).sort({ order: 1 }).lean();
    return docs.map((h) => ({ org: h.org, tag: h.tag, numbers: h.numbers }));
  }

  async openSos(tenant: TenantContext, userId: string, lat: number, lng: number) {
    const counter = await this.counters.findOneAndUpdate(
      { tenantId: tenant.tenantId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const sessionId = `${tenant.ticketPrefix}-SOS-${String(counter.seq).padStart(6, '0')}`;
    // Dispatch routing per tenant: the rescue hotline org is the dispatch target (data).
    const rescue = await this.hotlines
      .findOne({ tenantId: tenant.tenantId, tag: 'rescue' })
      .sort({ order: 1 })
      .lean();
    const doc = await this.sessions.create({
      tenantId: tenant.tenantId,
      sessionId,
      userId,
      status: 'OPEN',
      dispatchTarget: rescue?.org ?? 'City Emergency Dispatch',
      locations: [{ lat, lng, at: new Date() }],
    });
    return this.publicSession(doc.toObject() as unknown as Record<string, unknown>);
  }

  async pushLocation(tenant: TenantContext, userId: string, sessionId: string, lat: number, lng: number) {
    const res = await this.sessions.updateOne(
      { tenantId: tenant.tenantId, sessionId, userId, status: 'OPEN' },
      {
        $push: {
          locations: { $each: [{ lat, lng, at: new Date() }], $slice: -MAX_LOCATIONS_KEPT },
        },
      },
    );
    if (res.matchedCount === 0) rpcError(404, 'No open SOS session');
    return { received: true };
  }

  async closeSos(tenant: TenantContext, userId: string, sessionId: string) {
    const doc = await this.sessions.findOneAndUpdate(
      { tenantId: tenant.tenantId, sessionId, userId, status: 'OPEN' },
      { $set: { status: 'CLOSED', closedAt: new Date() } },
      { new: true },
    );
    if (!doc) rpcError(404, 'No open SOS session');
    return this.publicSession(doc.toObject() as unknown as Record<string, unknown>);
  }

  async getSos(tenant: TenantContext, sessionId: string) {
    const doc = await this.sessions.findOne({ tenantId: tenant.tenantId, sessionId }).lean();
    if (!doc) rpcError(404, 'Session not found');
    return this.publicSession(doc as unknown as Record<string, unknown>);
  }

  private publicSession(d: Record<string, unknown>) {
    const locations = d.locations as { lat: number; lng: number; at: Date }[];
    return {
      session_id: d.sessionId,
      status: d.status,
      dispatch_target: d.dispatchTarget,
      opened_at: (d as { createdAt?: Date }).createdAt,
      closed_at: d.closedAt ?? null,
      last_location: locations.length ? locations[locations.length - 1] : null,
      location_count: locations.length,
    };
  }
}
