import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantContext, rpcError } from '@app/common';
import { Post, PostCategory } from './schemas/post.schema';
import { Faq } from './schemas/faq.schema';
import { Feedback } from './schemas/feedback.schema';

export interface PostListQuery {
  category?: PostCategory;
  pinned?: boolean;
  unit?: string;
  limit?: number;
  before?: string;
}

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    @InjectModel(Faq.name) private readonly faqs: Model<Faq>,
    @InjectModel(Feedback.name) private readonly feedback: Model<Feedback>,
  ) {}

  async listPosts(tenant: TenantContext, q: PostListQuery) {
    const filter: Record<string, unknown> = {
      tenantId: tenant.tenantId,
      publishedAt: { $lte: new Date() },
    };
    if (q.category) filter.category = q.category;
    if (q.pinned !== undefined) filter.pinned = q.pinned;
    if (q.unit) {
      // Barangay-targeted advisories: empty targetUnits = city-wide.
      filter.$or = [{ targetUnits: { $size: 0 } }, { targetUnits: q.unit }];
    }
    if (q.before) filter._id = { $lt: q.before };
    const docs = await this.posts
      .find(filter)
      .sort({ pinned: -1, publishedAt: -1 })
      .limit(Math.min(q.limit ?? 20, 50))
      .lean();
    return docs.map((d) => this.publicPost(d));
  }

  async getPost(tenant: TenantContext, id: string) {
    const doc = await this.posts.findOne({ _id: id, tenantId: tenant.tenantId }).lean();
    if (!doc) rpcError(404, 'Post not found');
    return this.publicPost(doc);
  }

  async createPost(tenant: TenantContext, data: Partial<Post>) {
    const doc = await this.posts.create({ ...data, tenantId: tenant.tenantId });
    return this.publicPost(doc.toObject() as unknown as Record<string, unknown>);
  }

  async searchPosts(tenant: TenantContext, query: string) {
    const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const docs = await this.posts
      .find({
        tenantId: tenant.tenantId,
        publishedAt: { $lte: new Date() },
        $or: [{ title: rx }, { body: rx }],
      })
      .sort({ publishedAt: -1 })
      .limit(10)
      .lean();
    return docs.map((d) => this.publicPost(d));
  }

  async listFaq(tenant: TenantContext, locale: string) {
    const docs = await this.faqs
      .find({ tenantId: tenant.tenantId, locale })
      .sort({ order: 1 })
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      question: d.question,
      answer: d.answer,
    }));
  }

  async listFeedback(tenant: TenantContext, limit = 50) {
    const docs = await this.feedback
      .find({ tenantId: tenant.tenantId })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      message: d.message,
      contact: d.contact ?? null,
      user_id: d.userId ?? null,
      status: d.status,
      created_at: (d as { createdAt?: Date }).createdAt,
    }));
  }

  async createFeedback(tenant: TenantContext, userId: string | undefined, message: string, contact?: string) {
    const doc = await this.feedback.create({
      tenantId: tenant.tenantId,
      userId,
      message,
      contact,
    });
    return { id: String(doc._id), received: true };
  }

  private publicPost(d: Record<string, unknown>) {
    return {
      id: String(d._id),
      title: d.title,
      body: d.body,
      category: d.category,
      hero_image: d.heroImage ?? null,
      author: d.author,
      pinned: d.pinned,
      published_at: d.publishedAt,
    };
  }
}
