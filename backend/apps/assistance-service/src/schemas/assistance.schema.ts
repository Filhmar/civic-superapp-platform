import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const REQUEST_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Legal transitions of the assistance machine (Reference §5.4). */
export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'DENIED'],
  UNDER_REVIEW: ['APPROVED', 'DENIED'],
  APPROVED: [],
  DENIED: [],
};

@Schema({ collection: 'programs' })
export class AssistanceProgram {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  key!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  icon!: string;

  @Prop({ required: true })
  office!: string;

  @Prop({ type: [String], default: [] })
  requirements!: string[];

  @Prop({ default: 0 })
  order!: number;
}
export const AssistanceProgramSchema = SchemaFactory.createForClass(AssistanceProgram);
AssistanceProgramSchema.index({ tenantId: 1, key: 1 }, { unique: true });

@Schema({ _id: false })
export class RequestTransition {
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
const RequestTransitionSchema = SchemaFactory.createForClass(RequestTransition);

@Schema({ timestamps: true, collection: 'requests' })
export class AssistanceRequest {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, unique: true })
  requestId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  programKey!: string;

  @Prop({ required: true })
  programName!: string;

  @Prop({ required: true })
  office!: string;

  @Prop({ required: true })
  details!: string;

  @Prop({ type: [{ name: String, provided: Boolean }], default: [] })
  checklist!: { name: string; provided: boolean }[];

  @Prop({ type: String, required: true, enum: REQUEST_STATUSES, default: 'SUBMITTED' })
  status!: RequestStatus;

  @Prop({ type: Date })
  claimSchedule?: Date;

  @Prop()
  claimLocation?: string;

  @Prop({ type: [RequestTransitionSchema], default: [] })
  transitions!: RequestTransition[];
}
export type AssistanceRequestDocument = HydratedDocument<AssistanceRequest>;
export const AssistanceRequestSchema = SchemaFactory.createForClass(AssistanceRequest);
AssistanceRequestSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

@Schema({ collection: 'request_counters' })
export class RequestCounter {
  @Prop({ required: true, unique: true })
  tenantId!: string;

  @Prop({ default: 0 })
  seq!: number;
}
export const RequestCounterSchema = SchemaFactory.createForClass(RequestCounter);
