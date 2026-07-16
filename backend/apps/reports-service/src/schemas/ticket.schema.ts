import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const TICKET_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Legal transitions of the 311 status machine (Reference §5.3). */
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

@Schema({ _id: false })
export class TicketTransition {
  @Prop({ type: String })
  from!: string | null;

  @Prop({ type: String, required: true })
  to!: string;

  @Prop({ required: true })
  actor!: string;

  @Prop({ type: Date, required: true })
  at!: Date;

  @Prop()
  note?: string;
}
const TicketTransitionSchema = SchemaFactory.createForClass(TicketTransition);

@Schema({ timestamps: true, collection: 'tickets' })
export class Ticket {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, unique: true })
  ticketId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  categoryKey!: string;

  @Prop({ required: true })
  categoryLabel!: string;

  @Prop({ required: true })
  department!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  photos!: string[];

  @Prop({ type: { lat: Number, lng: Number }, required: true })
  geo!: { lat: number; lng: number };

  @Prop()
  address?: string;

  /** Barangay from the tenant's own gazetteer (geo-service reverse-geocode). */
  @Prop()
  unit?: string;

  @Prop({ type: String, required: true, enum: TICKET_STATUSES, default: 'SUBMITTED' })
  status!: TicketStatus;

  @Prop({ type: [TicketTransitionSchema], default: [] })
  transitions!: TicketTransition[];
}

export type TicketDocument = HydratedDocument<Ticket>;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
TicketSchema.index({ tenantId: 1, status: 1 });

@Schema({ collection: 'ticket_counters' })
export class TicketCounter {
  @Prop({ required: true, unique: true })
  tenantId!: string;

  @Prop({ default: 0 })
  seq!: number;
}
export const TicketCounterSchema = SchemaFactory.createForClass(TicketCounter);

@Schema({ collection: 'report_categories' })
export class ReportCategory {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  key!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  icon!: string;

  @Prop({ required: true })
  department!: string;

  @Prop({ default: 0 })
  order!: number;
}
export const ReportCategorySchema = SchemaFactory.createForClass(ReportCategory);
ReportCategorySchema.index({ tenantId: 1, key: 1 }, { unique: true });
