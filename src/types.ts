export type Filters = {
  minLevel: number;
  pid: number;
  tid: number;
  tag: string;
  notTag?: string;
  q: string;
  notQ?: string;
  catTags: string[];
  needles: string[];
  buffers: string[];  // e.g. ["main","system","events","radio"]
  start: string; // time start (optional)
  end: string;   // time end (optional)
};
