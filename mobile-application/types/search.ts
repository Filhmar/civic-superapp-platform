import type { Hotline } from "@/types/hotlines";
import type { Place } from "@/types/places";
import type { Post } from "@/types/posts";
import type { TransportRoute } from "@/types/transport";

export interface SearchServiceHit {
  code: string;
  name: string;
  description?: string;
  fee?: number;
  group?: string;
}

export interface SearchResults {
  places: Place[];
  routes: TransportRoute[];
  posts: Post[];
  hotlines: Hotline[];
  services: SearchServiceHit[];
}
