export type PostCategory =
  | "ADVISORY"
  | "EVENT"
  | "PROGRAM"
  | "NEWS"
  | "TRAFFIC"
  | "WEATHER"
  | (string & {});

export interface Post {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  hero_image: string | null;
  author: string;
  pinned: boolean;
  published_at: string;
}

export interface PostsFilter {
  pinned?: boolean;
  category?: string;
  limit?: number;
}
