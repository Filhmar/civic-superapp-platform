import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const MEDIA_KINDS = ['report', 'avatar', 'cms', 'poi', 'brand'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

@Schema({ timestamps: true, collection: 'media' })
export class Media {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ type: String, required: true, enum: MEDIA_KINDS })
  kind!: MediaKind;

  @Prop({ required: true })
  contentType!: string;

  @Prop({ default: 'pending' })
  status!: string;

  @Prop()
  sizeBytes?: number;
}

export type MediaDocument = HydratedDocument<Media>;
export const MediaSchema = SchemaFactory.createForClass(Media);
