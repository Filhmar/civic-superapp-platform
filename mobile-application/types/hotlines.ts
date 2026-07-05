export type HotlineTag =
  | "rescue"
  | "police"
  | "fire"
  | "medical"
  | "utility"
  | (string & {});

export interface Hotline {
  org: string;
  tag: HotlineTag;
  numbers: string[];
}
