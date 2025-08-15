/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

type Progress = { kind: 'progress'; percent: number; lines: number; phase?: string };
type Meta = { kind: 'meta'; totalLines: number; filteredCount: number; fileSize: number; phase?: string };
type WindowMsg = { kind: 'window'; start: number; lines: string[]; levels: Uint8Array };
type ExportMsg = { kind: 'export'; text: string };

type ApplyPayload = {
  kind: 'applyFilters';
  minLevel: number;
  pid: number;
  tid: number;
  tag: string;
  notTag: string;
  q: string;
  notQ: string;
  catTags: string[];
  needles: string[];
  buffers: string[];       // "main" | "system" | "events" | "radio" | "kernel"
  start: string;           // "MM-DD HH:MM:SS(.mmm)" optional
  end: string;             // same
};

type GetWindowPayload = { kind: 'getWindow'; start: number; end: number };
type IndexFilePayload = { kind: 'indexFile'; file: File };
type ExportPayload = { kind: 'exportFiltered'; maxLines?: number };

declare const self: DedicatedWorkerGlobalScope;

const LVLMAP: Record<string, number> = { V: 0, D: 1, I: 2, W: 3, E: 4, F: 5 };
const BUFIDS: Record<string, number> = { main: 0, system: 1, events: 2, radio: 3, kernel: 4 };

let fileSize = 0;

// Raw store (indexed by line)
let raw: string[] = [];
let lvl: Uint8Array = new Uint8Array(0);
let pid: Uint32Array = new Uint32Array(0);
let tid: Uint32Array = new Uint32Array(0);
let buf: Uint8Array = new Uint8Array(0);
let tag: string[] = [];
let tsNum: Float64Array = new Float64Array(0); // numeric timestamp for range filtering

// Active filtered index (points into raw[])
let filtered: Uint32Array = new Uint32Array(0);
postMessage({ kind: 'ready' });

self.onmessage = (ev: MessageEvent<ApplyPayload | GetWindowPayload | IndexFilePayload | ExportPayload>) => {
  const m = ev.data as any;
  switch (m.kind) {
    case 'indexFile': return indexFile(m.file);
    case 'applyFilters': return applyFilters(m);
    case 'getWindow': return sendWindow(m.start, m.end);
    case 'exportFiltered': return exportFiltered(m.maxLines ?? 200000);
  }
};

/* -------------------- Indexing -------------------- */

function toU32(v: unknown): number {
  // convert strings like "1234" safely; treat null/undefined as 0
  const n = typeof v === 'number' ? v : (v != null ? parseInt(String(v), 10) : 0);
  // clamp to uint32
  return (n >>> 0);
}

async function indexFile(file: File) {
  fileSize = file.size;
  postMessage({ kind: 'progress', percent: 0, lines: 0, phase: 'Indexing' } as Progress);

  // Read as stream + decode lines
  const dec = new TextDecoder('utf-8');
  const reader = (file.stream ? file.stream() : (file as any).stream()).getReader();
  let { value, done } = await reader.read();
  let chunk = value ? dec.decode(value, { stream: true }) : '';
  let bufferText = chunk;
  let lines: string[] = [];
  let totalBytes = value ? value.byteLength : 0;

  const pushLines = (text: string) => {
    // normalize CRLF
    const parts = text.replace(/\r\n/g, '\n').split('\n');
    if (parts.length) {
      // keep last partial in bufferText
      bufferText = parts.pop() as string;
      lines.push(...parts);
    }
  };

  pushLines(bufferText);

  while (!done) {
    ({ value, done } = await reader.read());
    if (value) {
      totalBytes += value.byteLength;
      chunk = dec.decode(value, { stream: true });
      pushLines(bufferText + chunk);
      postMessage({ kind: 'progress', percent: Math.min(99, (totalBytes / fileSize) * 100), lines: lines.length, phase: 'Indexing' } as Progress);
    }
  }

  // finalize trailing
  const tail = dec.decode();
  if (tail) {
    pushLines(bufferText + tail);
  } else if (bufferText) {
    lines.push(bufferText);
    bufferText = '';
  }

  // Allocate typed stores
  raw = lines;
  const n = raw.length;
  lvl = new Uint8Array(n);
  pid = new Uint32Array(n);
  tid = new Uint32Array(n);
  buf = new Uint8Array(n);
  tag = new Array(n);
  tsNum = new Float64Array(n);

  // Parse
  let currentBuf = BUFIDS.main; // default
  const reHdr = /------\s*(SYSTEM|EVENT|RADIO|MAIN|KERNEL)\s+LOG/i;
  const reThreadTime = /^(\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]+):\s?(.*)$/;

  for (let i = 0; i < n; i++) {
    const line = raw[i];

    // Buffer markers
    const mHdr = line.match(reHdr);
    if (mHdr) {
      const k = mHdr[1].toLowerCase();
      switch (k) {
        case 'system': currentBuf = BUFIDS.system; break;
        case 'event': currentBuf = BUFIDS.events; break;
        case 'radio': currentBuf = BUFIDS.radio; break;
        case 'main': currentBuf = BUFIDS.main; break;
        case 'kernel': currentBuf = BUFIDS.kernel; break;
        default: currentBuf = BUFIDS.main;
      }
      lvl[i] = 7; pid[i] = 0; tid[i] = 0; buf[i] = currentBuf; tag[i] = ''; tsNum[i] = Number.NaN;
      continue;
    }

    const m = reThreadTime.exec(line);
    if (m) {
      const [, mmdd, hms, p, t, L, tg] = m;
      lvl[i] = LVLMAP[L] ?? 0;
      pid[i] = toU32(p);
      tid[i] = toU32(t);
      buf[i] = currentBuf;
      tag[i] = tg.trim();
      tsNum[i] = parseTs(mmdd, hms);
      continue;
    }

    // Unknown line; keep buffer id, but leave others relaxed
    lvl[i] = 0;
    pid[i] = 0;
    tid[i] = 0;
    buf[i] = currentBuf;
    tag[i] = '';
    tsNum[i] = Number.NaN;
  }

  // Default filtered set = everything that looks like a log line
  const idx = new Uint32Array(n);
  let w = 0;
  for (let i = 0; i < n; i++) {
    // Skip obvious headers/empty lines from the default view
    if (raw[i].trim().length === 0) continue;
    idx[w++] = i;
  }
  filtered = idx.subarray(0, w);

  postMessage({ kind: 'progress', percent: 100, lines: n, phase: 'Indexing' } as Progress);
  postMeta('Indexed');
  // NOTE: main will immediately call applyFilters with current UI state
}

/* -------------------- Filters -------------------- */

function parseListOR(s: string): string[] {
  if (!s) return [];
  // split on comma or |
  return s.split(/[|,]/).map(x => x.trim()).filter(Boolean);
}
function parseTagFilter(tag: string) {
  // supports "tag:=Exact" to force exact match; otherwise partial
  const exact = /^tag:=/i.test(tag);
  const raw = exact ? tag.replace(/^tag:=/i, '') : tag;
  return { exact, list: parseListOR(raw) };
}
function parseTs(mmdd: string, hms: string): number {
  // MM-DD and HH:MM:SS(.mmm) -> numeric sortable timestamp
  const mm = parseInt(mmdd.slice(0, 2), 10);
  const dd = parseInt(mmdd.slice(3, 5), 10);
  const hh = parseInt(hms.slice(0, 2), 10);
  const mi = parseInt(hms.slice(3, 5), 10);
  const ss = parseInt(hms.slice(6, 8), 10);
  const mmm = hms.length > 8 ? parseInt(hms.slice(9, 12), 10) : 0;
  // pack into number: MMDDHHMMSSmmm (not strictly time, but monotonic in log)
  return (((((mm * 100 + dd) * 100 + hh) * 100 + mi) * 100 + ss) * 1000 + mmm);
}
function parseTsInput(s: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)$/);
  if (!m) return undefined;
  return parseTs(m[1], m[2]);
}

function applyFilters(p: ApplyPayload) {
  const allowBuf = new Set<number>((p.buffers || ['main', 'system', 'events', 'radio']).map(b => BUFIDS[b] ?? BUFIDS.main));
  const { exact, list: tagList } = parseTagFilter(p.tag);
  const notTagList = parseListOR(p.notTag);
  const qList = parseListOR(p.q);
  const notQList = parseListOR(p.notQ);
  const catTagSet = new Set(p.catTags || []);
  const needles = (p.needles || []).map(x => x.toLowerCase());

  const startNum = parseTsInput(p.start);
  const endNum = parseTsInput(p.end);

  const n = raw.length;
  const tmp: number[] = [];
  const hasTagFilter = tagList.length > 0;
  const hasNotTag = notTagList.length > 0;
  const hasQ = qList.length > 0;
  const hasNotQ = notQList.length > 0;
  const hasNeedles = needles.length > 0;
  const hasCatTags = catTagSet.size > 0;
  const pidWanted = p.pid >= 0 ? p.pid : undefined;
  const tidWanted = p.tid >= 0 ? p.tid : undefined;
  const minL = p.minLevel ?? 0;

  for (let i = 0; i < n; i++) {
    if (!allowBuf.has(buf[i])) continue;
    if (lvl[i] < minL) continue;

    if (pidWanted !== undefined && pidWanted !== pid[i]) continue;
    if (tidWanted !== undefined && tidWanted !== tid[i]) continue;

    // time range
    if (startNum !== undefined || endNum !== undefined) {
      const t = tsNum[i];
      if (!Number.isFinite(t)) continue;
      if (startNum !== undefined && t < startNum) continue;
      if (endNum !== undefined && t > endNum) continue;
    }

    // tag filters
    if (hasTagFilter) {
      const tg = tag[i];
      let ok = false;
      if (exact) {
        for (const want of tagList) if (tg === want) { ok = true; break; }
      } else {
        const low = tg.toLowerCase();
        for (const want of tagList) if (low.includes(want.toLowerCase())) { ok = true; break; }
      }
      if (!ok) continue;
    }
    if (hasNotTag) {
      const low = (tag[i] || '').toLowerCase();
      let blocked = false;
      for (const nt of notTagList) if (low.includes(nt.toLowerCase())) { blocked = true; break; }
      if (blocked) continue;
    }

    const line = raw[i];
    const lineL = line.toLowerCase();

    // free-text OR
    if (hasQ) {
      let ok = false;
      for (const qv of qList) if (lineL.includes(qv.toLowerCase())) { ok = true; break; }
      if (!ok) continue;
    }
    // NOT free-text
    if (hasNotQ) {
      let blocked = false;
      for (const nq of notQList) if (lineL.includes(nq.toLowerCase())) { blocked = true; break; }
      if (blocked) continue;
    }

    // Preset category "catTags" (OR with needles)
    if (hasCatTags || hasNeedles) {
      let ok = false;

      if (hasCatTags) {
        // match if the log tag exactly equals one of the preset tags (case sensitive like logcat)
        if (catTagSet.has(tag[i])) ok = true;
      }
      if (!ok && hasNeedles) {
        for (const nd of needles) if (lineL.includes(nd)) { ok = true; break; }
      }
      if (!ok) continue;
    }

    tmp.push(i);
  }

  filtered = Uint32Array.from(tmp);
  postMeta('Filtered');
}

function postMeta(phase?: string) {
  const totalLines = raw.length;
  const filteredCount = filtered.length;
  const meta: Meta = { kind: 'meta', totalLines, filteredCount, fileSize, phase };
  postMessage(meta);
}

/* -------------------- Windows -------------------- */

function sendWindow(start: number, end: number) {
  // clamp
  if (start < 0) start = 0;
  if (end < start) end = start;

  const N = filtered.length;
  if (N === 0) {
    const lv = new Uint8Array(200); // pool size shadow
    postMessage({ kind: 'window', start: 0, lines: [], levels: lv } as WindowMsg);
    return;
  }

  // clamp end to available items
  end = Math.min(end, N);
  const count = end - start;

  const lines: string[] = new Array(count);
  const levels = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    const idx = filtered[start + i];
    lines[i] = raw[idx];
    levels[i] = lvl[idx];
  }

  postMessage({ kind: 'window', start, lines, levels } as WindowMsg);
}

/* -------------------- Export -------------------- */


function exportFiltered(maxLines: number) {
  const N = Math.min(filtered.length, maxLines);
  let out = '';
  for (let i = 0; i < N; i++) {
    out += raw[filtered[i]] + '\n';
  }
  const msg: ExportMsg = { kind: 'export', text: out };
  postMessage(msg);
}
