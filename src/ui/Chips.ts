export type Preset = { label: string; tags: string[]; needles: string[] };
export const PRESETS: Record<string, Preset> = {
  anr: { label: 'ANR', tags: ['activitymanager'], needles: ['am_anr', 'anr in', 'vm traces at last anr', 'watchdog killing system process'] },
  deadlock: { label: 'Deadlock', tags: ['art', 'activitymanager'], needles: ['long monitor contention', 'watchdog killing system process'] },
  broadcasts: { label: 'Broadcasts', tags: ['broadcastqueue', 'activitymanager'], needles: ['historical broadcasts', 'receiver resolver table', 'broadcastrecord{', 'active ordered broadcasts'] },
  process: { label: 'Proc start/kill', tags: ['activitymanager'], needles: ['start proc', 'am_proc_start', 'am_proc_died'] },
  memory: { label: 'Low memory', tags: ['activitymanager', 'lmkd', 'lowmemorykiller'], needles: ['am_low_memory', 'total pss by oom adjustment', 'kswapd', 'mmcqd'] },
  power: { label: 'Power', tags: ['powermanagerservice', 'batterystatsservice'], needles: ['screen_toggled', 'wakelock'] },
  wifi: { label: 'Wi-Fi', tags: ['wifiservice', 'wificlientmodeimpl', 'wificond', 'wpa_supplicant'], needles: ['wlan', 'connectivity_change'] },
  bluetooth: { label: 'Bluetooth', tags: ['bluetoothadaptor', 'bt_stack', 'bluetoothlescanner', 'bluetootha2dp'], needles: ['bluetoothlescanner', 'onclientregistered'] },
  nfc: { label: 'NFC', tags: ['nfcservice', 'nfcdispatcher', 'nfctag', 'hostemulationmanager'], needles: ['nfc'] },
  location: { label: 'Location', tags: ['gnsslocationprovider', 'locationmanagerservice', 'fusedlocationprovider'], needles: ['location'] },
  telephony: { label: 'Telephony', tags: ['telephonymanager', 'rilj', 'ims', 'phoneinterfacemanager'], needles: ['rilj', 'ims'] },
  camera: { label: 'Camera', tags: ['cameraservice', 'camera', 'mm-qcamera-daemon'], needles: ['googlecamera', 'camera'] },
  audio: { label: 'Audio', tags: ['audioflinger', 'audiopolicymanager', 'audiotrack', 'audioservice'], needles: ['audio'] },
  graphics: { label: 'Graphics', tags: ['surfaceflinger', 'hwcomposer', 'renderthread'], needles: ['surfaceflinger'] },
  webview: { label: 'WebView', tags: ['chromium', 'webview'], needles: ['webviewchromium'] },
  packages: { label: 'Install/Dex2Oat', tags: ['packagemanager', 'packageinstaller', 'installd', 'packagemanager.dexoptimizer'], needles: ['dex2oat', 'running dexopt', 'finsky'] },
  kernel: { label: 'Kernel', tags: [], needles: ['pm: suspend exit', 'pm: suspend entry'] },
  battery: { label: 'Battery', tags: ['batteryservice', 'batterystatsservice'], needles: ['battery'] },
  systemui: { label: 'SystemUI', tags: ['systemui'], needles: [] },
};

export function createChips(root: HTMLDivElement, PRESETS_IN: typeof PRESETS) {
  root.innerHTML = '';
  const selected = new Set<string>();
  Object.entries(PRESETS_IN).forEach(([key, p]) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = p.label;
    btn.dataset.key = key;
    btn.onclick = () => {
      selected.has(key) ? selected.delete(key) : selected.add(key);
      btn.classList.toggle('on', selected.has(key));
      changeCb && changeCb();
    };
    root.appendChild(btn);
  });

  let changeCb: () => void;
  function onChange(fn: () => void) { changeCb = fn; }
  function getSelection() {
    const tags: string[] = []; const needles: string[] = [];
    selected.forEach(k => {
      tags.push(...PRESETS_IN[k].tags);
      needles.push(...PRESETS_IN[k].needles);
    });
    return { tags, needles };
  }
  return { onChange, getSelection };
}
