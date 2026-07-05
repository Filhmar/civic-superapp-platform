import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'feedback' })
export class Feedback {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop()
  userId?: string;

  @Prop({ required: true })
  message!: string;

  @Prop()
  contact?: string;

  @Prop({ default: 'new' })
  status!: string;
}

export type FeedbackDocument = HydratedDocument<Feedback>;
export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
FeedbackSchema.index({ tenantId: 1, createdAt: -1 });
