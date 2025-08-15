// src/ui/Controls.ts
export type ControlsState = {
  minLevel: number;
  tag: string;
  notTag: string;
  pid?: number;
  tid?: number;
  q: string;
  notQ: string;
  start: string;
  end: string;
  buffers: Set<string>;
};

export function createControls(root: HTMLDivElement) {
  root.innerHTML = `
    <label class="file">
      <input id="file" type="file" accept=".txt,.log,.bugreport,.zip" />
      <span>Open file…</span>
    </label>

    <select id="level" title="Minimum log level">
      <option value="0" selected>Level ≥ Verbose</option>
      <option value="1">Level ≥ Debug</option>
      <option value="2">Level ≥ Info</option>
      <option value="3">Level ≥ Warn</option>
      <option value="4">Level ≥ Error</option>
      <option value="5">Level ≥ Fatal</option>
    </select>

    <input id="tag" type="text" placeholder="tag filter (e.g. tag:=ActivityManager or am_proc_start,ActivityManager)" />
    <input id="notTag" type="text" placeholder="exclude tags (comma or partial)" />

    <input id="pid" type="number" placeholder="pid:=1234" />
    <input id="tid" type="number" placeholder="tid:=5678" />

    <input id="q" type="search" placeholder="text contains (supports A|B OR)" />
    <input id="notQ" type="search" placeholder="NOT text (A|B)" />

    <div class="toggle-wrap">
      <span class="lbl">Buffers:</span>
      <div class="toggle-group" id="bufToggles" role="group" aria-label="Log buffers">
        <button class="toggle on" data-value="main"   type="button">main</button>
        <button class="toggle on" data-value="system" type="button">system</button>
        <button class="toggle on" data-value="events" type="button">events</button>
        <button class="toggle on" data-value="radio"  type="button">radio</button>
      </div>
    </div>

    <input id="start" type="text" placeholder="start time (MM-DD HH:MM:SS)" />
    <input id="end" type="text" placeholder="end time (MM-DD HH:MM:SS)" />

    <button id="apply" class="primary">Apply</button>
    <button id="clear">Clear</button>
  `;

  const fileIn = root.querySelector('#file') as HTMLInputElement;
  const level = root.querySelector('#level') as HTMLSelectElement;
  const tag = root.querySelector('#tag') as HTMLInputElement;
  const notTag = root.querySelector('#notTag') as HTMLInputElement;
  const pid = root.querySelector('#pid') as HTMLInputElement;
  const tid = root.querySelector('#tid') as HTMLInputElement;
  const q = root.querySelector('#q') as HTMLInputElement;
  const notQ = root.querySelector('#notQ') as HTMLInputElement;
  const start = root.querySelector('#start') as HTMLInputElement;
  const end = root.querySelector('#end') as HTMLInputElement;
  const bufToggles = root.querySelector('#bufToggles') as HTMLDivElement;
  const applyBtn = root.querySelector('#apply') as HTMLButtonElement;
  const clearBtn = root.querySelector('#clear') as HTMLButtonElement;

  let onApplyCb = () => { };

  function getBuffers(): Set<string> {
    const set = new Set<string>();
    bufToggles
      .querySelectorAll<HTMLButtonElement>('.toggle.on')
      .forEach(b => set.add(b.dataset.value!));
    if (set.size === 0) set.add('main');
    return set;
  }

  function getState(): ControlsState {
    return {
      minLevel: parseInt(level.value, 10),
      tag: tag.value.trim(),
      notTag: notTag.value.trim(),
      pid: pid.value ? parseInt(pid.value, 10) : undefined,
      tid: tid.value ? parseInt(tid.value, 10) : undefined,
      q: q.value.trim(),
      notQ: notQ.value.trim(),
      start: start.value.trim(),
      end: end.value.trim(),
      buffers: getBuffers(),
    };
  }

  function onApply(fn: () => void) {
    onApplyCb = fn;
  }

  function onFile(fn: (f: File) => void) {
    fileIn.addEventListener('change', () => {
      const f = fileIn.files?.[0];
      if (f) fn(f);
    });
  }

  // Toggle behavior (ensure at least one stays on). Immediate apply.
  bufToggles.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.toggle') as HTMLButtonElement | null;
    if (!btn) return;
    btn.classList.toggle('on');
    const anyOn = bufToggles.querySelector('.toggle.on');
    if (!anyOn) btn.classList.add('on'); // keep at least one selected
    onApplyCb(); // immediate (buffers feel snappier)
  });

  // Debounced apply-on-input for live rerender
  let t: number | undefined;
  const DEBOUNCE = 120;
  function schedule() {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => onApplyCb(), DEBOUNCE);
  }

  // Fire for typing and programmatic changes
  root.addEventListener('input', (e) => {
    if (e.target === fileIn) return;
    schedule();
  });
  root.addEventListener('change', (e) => {
    if (e.target === fileIn) return;
    schedule();
  });
  root.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onApplyCb(); }
  });

  applyBtn.addEventListener('click', () => onApplyCb());
  clearBtn.addEventListener('click', () => {
    // Default to VERBOSE per your requirement
    level.value = '0';
    tag.value = ''; notTag.value = '';
    pid.value = ''; tid.value = ''; q.value = ''; notQ.value = '';
    start.value = ''; end.value = '';
    bufToggles.querySelectorAll('.toggle').forEach(b => b.classList.add('on')); // default all on
    onApplyCb();
  });

  return { getState, onApply, onFile };
}
