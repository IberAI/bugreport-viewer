import './style.css';
import { createControls } from './ui/Controls';
import { createChips, PRESETS } from './ui/Chips';
import { createStatus } from './ui/Status';
import { createScroller } from './ui/Scroller';
import { WorkerBridge } from './workerBridge';
import ParserWorker from './parser.worker.ts?worker';
import faviconUrl from '/vite.svg?url';

// After DOM is ready / before your app runs:
const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (link) link.href = faviconUrl;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <div class="brand">Bugreport Viewer</div>
    <div id="controls" class="controls"></div>
  </header>

  <div class="chipsbar" id="chips"></div>

  <section class="status">
    <div id="meta">No file loaded.</div>
    <div class="progress" id="progress" hidden><div id="bar"></div></div>
  </section>

  <main id="viewport" class="viewport">
    <div id="spacer"></div>
    <div id="canvas"></div>
  </main>
`;

const worker = new WorkerBridge(new ParserWorker());
const status = createStatus({
  metaEl: document.getElementById('meta') as HTMLDivElement,
  progressEl: document.getElementById('progress') as HTMLDivElement,
  barEl: document.getElementById('bar') as HTMLDivElement
});
const scroller = createScroller({
  viewport: document.getElementById('viewport') as HTMLDivElement,
  spacer: document.getElementById('spacer') as HTMLDivElement,
  canvas: document.getElementById('canvas') as HTMLDivElement,
  requestWindow: (start, end) => worker.getWindow(start, end)
});

const chips = createChips(document.getElementById('chips') as HTMLDivElement, PRESETS);
const controls = createControls(document.getElementById('controls') as HTMLDivElement);

// worker → ui wiring
worker.onReady(() => status.setMeta('Drop a bugreport file to start.'));
worker.onProgress(p => status.setProgress(p.phase ?? 'Indexing', p.percent, p.lines));
worker.onMeta(m => {
  status.done();
  scroller.setCount(m.filteredCount);
  status.setMeta(
    `Showing ${m.filteredCount.toLocaleString()} / ${m.totalLines.toLocaleString()} lines • Size: ${status.bytes(m.fileSize)}${m.phase ? ' • ' + m.phase : ''}`
  );
  scroller.request(0); // always request the first window after any meta
});
worker.onWindow(w => scroller.update(w));

// apply filters from controls + chips
function applyFilters() {
  const c = controls.getState();
  const { tags, needles } = chips.getSelection();

  status.setBusy('Filtering');   // feels responsive
  scroller.resetScroll();        // virtual list back to top

  worker.applyFilters({
    minLevel: c.minLevel,
    pid: c.pid ?? -1,
    tid: c.tid ?? -1,
    tag: c.tag,
    notTag: c.notTag,
    q: c.q,
    notQ: c.notQ,
    catTags: tags,
    needles,
    buffers: Array.from(c.buffers),
    start: c.start ?? '',
    end: c.end ?? ''
  });
}
controls.onApply(applyFilters);
chips.onChange(applyFilters);

// file load → index → initial filters
controls.onFile(async (file) => {
  status.setMeta(`Loading ${file.name}…`);
  status.setBusy('Indexing');
  scroller.resetScroll();
  await worker.indexFile(file);
  applyFilters(); // immediately apply current UI filters to the fresh index
});
