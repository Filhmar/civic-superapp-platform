import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'hotlines' })
export class Hotline {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  org!: string;

  @Prop({ required: true })
  tag!: string;

  @Prop({ type: [String], required: true })
  numbers!: string[];

  @Prop({ default: 0 })
  order!: number;
}
export const HotlineSchema = SchemaFactory.createForClass(Hotline);
HotlineSchema.index({ tenantId: 1, tag: 1, order: 1 });

@Schema({ _id: false })
export class SosLocation {
  @Prop({ required: true })
  lat!: number;

  @Prop({ required: true })
  lng!: number;

  @Prop({ type: Date, required: true })
  at!: Date;
}
const SosLocationSchema = SchemaFactory.createForClass(SosLocation);

@Schema({ timestamps: true, collection: 'sos_sessions' })
export class SosSession {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, unique: true })
  sessionId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ default: 'OPEN' })
  status!: string;

  @Prop({ type: [SosLocationSchema], default: [] })
  locations!: SosLocation[];

  @Prop({ required: true })
  dispatchTarget!: string;

  @Prop({ type: Date })
  closedAt?: Date;

  // SOS location retention ~30 days (RA 10173 posture, Reference §6).
  @Prop({ type: Date, default: () => new Date(), expires: 60 * 60 * 24 * 30 })
  retainedAt!: Date;
}
export type SosSessionDocument = HydratedDocument<SosSession>;
export const SosSessionSchema = SchemaFactory.createForClass(SosSession);

@Schema({ collection: 'sos_counters' })
export class SosCounter {
  @Prop({ required: true, unique: true })
  tenantId!: string;

  @Prop({ default: 0 })
  seq!: number;
}
export const SosCounterSchema = SchemaFactory.createForClass(SosCounter);
