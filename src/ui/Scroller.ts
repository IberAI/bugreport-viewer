type WindowReply = { start: number; lines: string[]; levels: Uint8Array };

export function createScroller(opts: {
  viewport: HTMLDivElement;
  spacer: HTMLDivElement;
  canvas: HTMLDivElement;
  requestWindow: (start: number, end: number) => void;
}) {
  const ROW_POOL = 200;
  const LINE_H = 16;

  const { viewport, spacer, canvas, requestWindow } = opts;
  const pool: HTMLDivElement[] = [];
  let filteredCount = 0;
  let scrollPending = false;

  function mkRow(): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'row';
    d.style.lineHeight = LINE_H + 'px';
    d.style.height = LINE_H + 'px';
    canvas.appendChild(d);
    return d;
  }
  function ensurePool() {
    if (pool.length) return;
    for (let i = 0; i < ROW_POOL; i++) pool.push(mkRow());
  }

  function setCount(n: number) {
    filteredCount = n;
    spacer.style.height = (filteredCount * LINE_H) + 'px';
    ensurePool();
  }

  function request(start: number) {
    const end = Math.min(start + ROW_POOL, filteredCount);
    requestWindow(start, end);
  }

  function update(w: WindowReply) {
    const { start, lines, levels } = w;
    canvas.style.transform = `translateY(${start * LINE_H}px)`;
    for (let i = 0; i < ROW_POOL; i++) {
      const d = pool[i];
      d.style.transform = `translateY(${i * LINE_H}px)`;
      const line = lines[i] ?? '';
      d.textContent = line;
      const lvl = levels[i] ?? 0xff;
      d.classList.toggle('warn', lvl === 3);
      d.classList.toggle('error', lvl >= 4 && lvl <= 5);
    }
  }

  viewport.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => {
      scrollPending = false;
      const y = viewport.scrollTop | 0;
      const start = Math.max(0, Math.min(((y / LINE_H) | 0), Math.max(0, filteredCount - ROW_POOL)));
      request(start);
    });
  });

  function resetScroll() {
    viewport.scrollTop = 0;
    canvas.style.transform = 'translateY(0)';
  }

  return { setCount, request, update, resetScroll };
}
