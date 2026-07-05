export type PlaceKind = "tourism" | "business" | "civic";

export interface PlaceHours {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  open: string;
  close: string;
}

export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  description: string;
  category: string;
  photos?: string[];
  rating: number | null;
  geo: { lat: number; lng: number };
  address: string | null;
  contact: string | null;
  open_now: boolean;
  hours: PlaceHours[];
  favorite: boolean;
  distance_km?: number;
}

export interface PlacesFilter {
  kind?: PlaceKind;
  /** "lat,lng" */
  near?: string;
  limit?: number;
}
