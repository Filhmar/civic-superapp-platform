import { api } from "@/services/api";
import type { Post, PostsFilter } from "@/types/posts";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getPosts(filter?: PostsFilter): Promise<Post[]> {
  const params: Record<string, string | number | boolean> = {};
  if (filter?.pinned !== undefined) params.pinned = filter.pinned;
  if (filter?.category) params.category = filter.category;
  if (filter?.limit !== undefined) params.limit = filter.limit;
  const body = await api.get<Envelope<Post[]>>("/v1/posts", { params });
  return body.data;
}

export async function getPost(id: string): Promise<Post> {
  const body = await api.get<Envelope<Post>>(`/v1/posts/${id}`);
  return body.data;
}
