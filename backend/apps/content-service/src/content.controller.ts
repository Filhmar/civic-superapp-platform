import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { ContentService, PostListQuery } from './content.service';
import { Post } from './schemas/post.schema';

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @MessagePattern({ cmd: 'content.posts.list' })
  listPosts(@Payload() p: TenantScoped<PostListQuery>) {
    return this.content.listPosts(p.tenant, p.data);
  }

  @MessagePattern({ cmd: 'content.posts.get' })
  getPost(@Payload() p: TenantScoped<{ id: string }>) {
    return this.content.getPost(p.tenant, p.data.id);
  }

  @MessagePattern({ cmd: 'content.posts.create' })
  createPost(@Payload() p: TenantScoped<Partial<Post>>) {
    return this.content.createPost(p.tenant, p.data);
  }

  @MessagePattern({ cmd: 'content.posts.search' })
  searchPosts(@Payload() p: TenantScoped<{ query: string }>) {
    return this.content.searchPosts(p.tenant, p.data.query);
  }

  @MessagePattern({ cmd: 'content.faq.list' })
  listFaq(@Payload() p: TenantScoped<{ locale: string }>) {
    return this.content.listFaq(p.tenant, p.data.locale);
  }

  @MessagePattern({ cmd: 'content.feedback.create' })
  createFeedback(
    @Payload() p: TenantScoped<{ user_id?: string; message: string; contact?: string }>,
  ) {
    return this.content.createFeedback(p.tenant, p.data.user_id, p.data.message, p.data.contact);
  }
}
