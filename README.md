# Bugreport Viewer

A fast, client-side viewer for huge Android bugreports. Drop in a `bugreport-*.txt` and slice through logs with live filters (level, tag, PID/TID, buffers, time range, and smart presets like ANR, Broadcasts, BLE scans). Nothing leaves your browser. ⚡

* **Live demo:** `https://iberai.github.io/bugreport-viewer/` (builds from this repo)
* **License:** [MIT](./LICENSE)



## 🧩 Feature requests (when I can’t build it right away)

If you’d like a new capability and I don’t have time to implement it, **please open a feature request**. It really helps prioritize work and lets others chime in.

➡️ **Open an issue:**
[https://github.com/IberAI/bugreport-viewer/issues/new?labels=enhancement\&template=feature\_request.md\&title=%5BFeature%5D+Your+idea+here](https://github.com/IberAI/bugreport-viewer/issues/new?labels=enhancement&template=feature_request.md&title=%5BFeature%5D+Your+idea+here)

When filing, include:

* **What & why:** a clear description of the feature and the problem it solves.
* **Example log lines / flows:** a few anonymized lines or a tiny sample file (remove PII!).
* **Where it fits:** UI placement (chip, control, panel, shortcut, etc.).
* **Scope guess:** minimal version vs. “nice to have” extras.
* **Performance thoughts:** expected file sizes and interaction pattern.
* **Screens / mockups (optional):** even a quick sketch is great.

If it’s a **quick win (≤1h)** I might slot it in soon; otherwise it’ll go on the roadmap for community discussion and contributions.


## ✨ Features

* **Massive-file friendly:** virtualized rendering + worker parsing
* **Rich filters:** level (V…F), tag (supports `tag:=Exact` and OR with `,` or `|`), PID/TID, text and NOT-text, buffers (main/system/events/radio), time range
* **Smart chips:** AOSP-inspired presets (ANR, deadlock, broadcasts, memory thrash, BLE scans, power, etc.)
* **Copy/export:** copy visible lines or export filtered text
* **Privacy:** everything runs locally in your browser

---

## 📥 Getting an Android bugreport

You can capture a bugreport **from a device** (Developer options) or **via ADB**.

### Option A — On-device (no computer)

1. Enable **Developer options**.
2. **Developer options → Take bug report**.
3. Wait for the notification, then **share** the bugreport (`.zip`) to your computer.

### Option B — ADB (recommended)

**One command, zipped:**

```bash
adb bugreport bugreport.zip
```

**Or, older devices (single text file):**

```bash
adb bugreport > bugreport.txt
```

> Tip: If `adb bugreport` takes too long, try:
>
> ```bash
> adb shell bugreportz
> adb pull /path/from/bugreportz/output.zip bugreport.zip
> ```

---

## 🗜️ Unzipping the bugreport

Most modern devices produce a **ZIP** that contains a top-level `bugreport-<device>-<date>.txt` plus extras (tombstones, dumpsys, etc.).

**macOS / Linux**

```bash
unzip bugreport.zip -d ./bugreport
# The main file is usually: ./bugreport/bugreport-*.txt
```

**Windows PowerShell**

```powershell
Expand-Archive -Path .\bugreport.zip -DestinationPath .\bugreport
# Main file: .\bugreport\bugreport-*.txt
```

> ⚠️ **Privacy:** Bugreports may include PII and app/package names. Avoid sharing them publicly.

---

## ▶️ Using Bugreport Viewer

1. Open the app (or your local build).
2. Click **Open file…** and select the **top-level `bugreport-*.txt`** (recommended).
3. Use filters:

   * **Level:** default is **Verbose** (shows everything).
   * **Tag:**

     * Partial match: `ActivityManager`
     * Exact match: `tag:=ActivityManager`
     * OR lists: `am_proc_start,ActivityManager` or `am_proc_start|ActivityManager`
   * **PID/TID:** integers; leave empty for “any”.
   * **Text / NOT text:** OR with `,` or `|`. `NOT text` excludes lines containing any term.
   * **Buffers:** toggle main/system/events/radio.
   * **Time range:** `MM-DD HH:MM:SS(.mmm)` (example: `10-03 17:19:52`).

Use the **preset chips** for quick AOSP recipes, e.g. **ANR**, **Broadcasts**, **Memory**, **BLE**, **Power**.

Copy the current view using the 📋 button in the status bar, or “Export filtered” if you’ve added that action.

---

## 🛠️ Local development

Prereqs: Node 18+

```bash
# Install
npm i

# Run dev server
npm run dev

# Typecheck + production build
npm run build

# Preview the build locally
npm run preview
```

* Vite config: [vite.config.ts](./vite.config.ts) (base path set for GitHub Pages)
* Entry: [index.html](./index.html)
* App: [src/main.ts](./src/main.ts)
* UI: [src/ui/](./src/ui/)
* Worker: [src/parser.worker.ts](./src/parser.worker.ts)
* Bridge: [src/workerBridge.ts](./src/workerBridge.ts)

---

## 🚀 Deploying to GitHub Pages

This repo is already set up for Pages via Actions.

1. Ensure `base` matches your repo name in [vite.config.ts](./vite.config.ts):

   ```ts
   export default defineConfig({ base: '/bugreport-viewer/' })
   ```
2. Push to `main`. The workflow builds and publishes the site.
3. In **Settings → Pages**, set **Source: GitHub Actions**.
4. Site will be available at:

   ```
   https://<your-username>.github.io/bugreport-viewer/
   ```

> If you see 404s for assets, double-check you don’t use root-absolute paths like `/vite.svg`. Use relative `./vite.svg` or import assets in TS.

---

## 🧠 Tips & Troubleshooting

* **0 lines shown?**
  Set level to **Verbose**, clear **Tag** and **Text** filters, ensure you loaded the `.txt` (not HTML or PDF).
* **Huge files (100–500MB):**
  Prefer Chromium-based browsers; keep one tab; close heavy extensions.
* **Time filter not matching:**
  Use the log’s **MM-DD HH\:MM\:SS(.mmm)** format (no year).
* **Buffers empty:**
  Keep at least one buffer enabled; toggling will auto-re-apply filters.
* **Performance:**
  Use preset chips to narrow quickly; avoid overly broad `Text` OR lists.

---

## 🙌 Purpose

This project exists to make **Android bugreport triage fast and pleasant**:

* Bring AOSP guidance into actionable filters.
* Keep data **local & private**.
* Handle **massive** log files without freezing the browser.

Contributions welcome—ideas, presets, and perf tweaks are especially appreciated.

---

## 👤 Author

Made by [IberAI](https://github.com/IberAI).
MIT licensed — see [LICENSE](./LICENSE).
