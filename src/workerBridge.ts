// src/workerBridge.ts

// ---------- Messages FROM the worker ----------
export type ReadyMsg = { kind: 'ready' };
export type ProgressMsg = { kind: 'progress'; percent: number; lines: number; phase?: string };
export type MetaMsg = { kind: 'meta'; totalLines: number; filteredCount: number; fileSize: number; phase?: string };
export type WindowMsg = { kind: 'window'; start: number; lines: string[]; levels: Uint8Array };
export type ExportMsg = { kind: 'export'; text: string };

export type Reply = ReadyMsg | ProgressMsg | MetaMsg | WindowMsg | ExportMsg;

// ---------- Messages TO the worker ----------
export type IndexFileCmd = { kind: 'indexFile'; file: File };
export type ApplyFiltersCmd = {
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
  buffers: string[]; // e.g. ["main","system","events","radio","kernel"]
  start: string;     // optional date/time filter as string (empty = off)
  end: string;       // optional date/time filter as string (empty = off)
};
export type GetWindowCmd = { kind: 'getWindow'; start: number; end: number };
export type ExportFilteredCmd = { kind: 'exportFiltered'; maxLines: number };

export type Request =
  | IndexFileCmd
  | ApplyFiltersCmd
  | GetWindowCmd
  | ExportFilteredCmd;

// ---------- Callback types ----------
export type ReadyCb = () => void;
export type ProgressCb = (p: ProgressMsg) => void;
export type MetaCb = (m: MetaMsg) => void;
export type WindowCb = (w: WindowMsg) => void;
export type ExportCb = (e: ExportMsg) => void;
export type ErrorCb = (e: MessageEvent) => void;

export class WorkerBridge {
  private w: Worker;

  private readyCb: ReadyCb = () => { };
  private progressCb: ProgressCb = () => { };
  private metaCb: MetaCb = () => { };
  private windowCb: WindowCb = () => { };
  private exportCb: ExportCb = () => { };
  private errorCb: ErrorCb = () => { };

  constructor(w: Worker) {
    this.w = w;

    this.w.onmessage = (ev: MessageEvent<Reply>) => {
      const m = ev.data;
      switch (m?.kind) {
        case 'ready':
          this.readyCb();
          break;
        case 'progress':
          this.progressCb(m);
          break;
        case 'meta':
          this.metaCb(m);
          break;
        case 'window':
          this.windowCb(m);
          break;
        case 'export':
          this.exportCb(m);
          break;
        default:
          // Unknown message kind — ignore gracefully
          break;
      }
    };

    this.w.onmessageerror = (ev: MessageEvent) => {
      this.errorCb(ev);
    };
  }

  // ---------- subscription API ----------
  onReady(cb: ReadyCb) { this.readyCb = cb; }
  onProgress(cb: ProgressCb) { this.progressCb = cb; }
  onMeta(cb: MetaCb) { this.metaCb = cb; }
  onWindow(cb: WindowCb) { this.windowCb = cb; }
  onExport(cb: ExportCb) { this.exportCb = cb; }
  onError(cb: ErrorCb) { this.errorCb = cb; }

  // Promise helper if you prefer awaiting readiness
  onceReady(): Promise<void> {
    return new Promise(resolve => {
      const prev = this.readyCb;
      this.readyCb = () => { prev(); resolve(); };
    });
  }

  // ---------- commands ----------
  indexFile(file: File) {
    const msg: IndexFileCmd = { kind: 'indexFile', file };
    this.w.postMessage(msg);
  }

  applyFilters(filters: Omit<ApplyFiltersCmd, 'kind'>) {
    const msg: ApplyFiltersCmd = { kind: 'applyFilters', ...filters };
    this.w.postMessage(msg);
  }

  getWindow(start: number, end: number) {
    const msg: GetWindowCmd = { kind: 'getWindow', start, end };
    this.w.postMessage(msg);
  }

  exportFiltered(maxLines = 200_000) {
    const msg: ExportFilteredCmd = { kind: 'exportFiltered', maxLines };
    this.w.postMessage(msg);
  }

  // Optional: allow cleanup when navigating away
  dispose() {
    this.w.terminate();
  }
}
