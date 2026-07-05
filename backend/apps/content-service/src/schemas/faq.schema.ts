import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'faqs' })
export class Faq {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  locale!: string;

  @Prop({ required: true })
  question!: string;

  @Prop({ required: true })
  answer!: string;

  @Prop({ default: 0 })
  order!: number;
}

export type FaqDocument = HydratedDocument<Faq>;
export const FaqSchema = SchemaFactory.createForClass(Faq);
FaqSchema.index({ tenantId: 1, locale: 1, order: 1 });
