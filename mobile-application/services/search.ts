import { api } from "@/services/api";
import type { SearchResults } from "@/types/search";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function search(q: string): Promise<SearchResults> {
  const body = await api.get<Envelope<SearchResults>>("/v1/search", {
    params: { q },
  });
  return body.data;
}

export async function getRecentSearches(): Promise<string[]> {
  const body = await api.get<Envelope<string[]>>("/v1/search/recent");
  return body.data;
}
