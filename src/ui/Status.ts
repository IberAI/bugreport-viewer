export function createStatus(opts: {
  metaEl: HTMLDivElement;
  progressEl: HTMLDivElement;
  barEl: HTMLDivElement;
}) {
  const { metaEl, progressEl, barEl } = opts;

  function setMeta(text: string) {
    metaEl.textContent = text;
  }
  function setBusy(phase = 'Filtering') {
    progressEl.hidden = false;
    barEl.style.width = '12%';
    metaEl.textContent = `${phase}…`;
  }
  function setProgress(phase: string, percent: number, lines: number) {
    progressEl.hidden = false;
    barEl.style.width = `${percent}%`;
    metaEl.textContent = `${phase}… ${percent.toFixed(0)}% (${lines.toLocaleString()} lines)`;
  }
  function done() {
    progressEl.hidden = true;
  }
  function bytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  return { setMeta, setBusy, setProgress, done, bytes };
}
