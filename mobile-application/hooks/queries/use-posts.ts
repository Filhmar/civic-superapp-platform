import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getPost, getPosts } from "@/services/posts";
import type { PostsFilter } from "@/types/posts";

export function usePostsQuery(filter?: PostsFilter) {
  return useQuery({
    queryKey: queryKeys.posts.list(filter),
    queryFn: () => getPosts(filter),
  });
}

export function usePostQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: () => getPost(id),
    enabled: id.length > 0,
  });
}
