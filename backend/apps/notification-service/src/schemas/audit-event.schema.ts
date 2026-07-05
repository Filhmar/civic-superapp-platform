import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Append-only audit log (Reference §5.13, COA compliance posture): every
 * status-machine change and payment event lands here via the notification
 * dispatch path. There are no update or delete code paths on this model.
 */
@Schema({ collection: 'audit_events', timestamps: { createdAt: true, updatedAt: false } })
export class AuditEvent {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ type: Object })
  data?: Record<string, unknown>;
}
export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);
AuditEventSchema.index({ tenantId: 1, category: 1, createdAt: -1 });
