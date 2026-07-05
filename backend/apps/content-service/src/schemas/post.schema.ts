import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { POST_CATEGORIES, PostCategory } from '@app/common';

export { POST_CATEGORIES };
export type { PostCategory };

@Schema({ timestamps: true, collection: 'posts' })
export class Post {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: String, required: true, enum: POST_CATEGORIES })
  category!: PostCategory;

  @Prop()
  heroImage?: string;

  @Prop({ required: true })
  author!: string;

  @Prop({ default: false })
  pinned!: boolean;

  @Prop({ type: [String], default: [] })
  targetUnits!: string[];

  @Prop({ type: Date, default: () => new Date() })
  publishedAt!: Date;
}

export type PostDocument = HydratedDocument<Post>;
export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ tenantId: 1, publishedAt: -1 });
PostSchema.index({ tenantId: 1, pinned: 1, publishedAt: -1 });
PostSchema.index({ tenantId: 1, category: 1, publishedAt: -1 });
