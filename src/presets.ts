export type Preset = { label: string; tags: string[]; needles: string[] };

export const PRESETS: Record<string, Preset> = {
  anr: { label: 'ANR', tags: ['ActivityManager'], needles: ['am_anr', 'ANR in', 'VM TRACES AT LAST ANR', 'WATCHDOG KILLING SYSTEM PROCESS'] },
  deadlock: { label: 'Deadlock', tags: ['art', 'ActivityManager'], needles: ['Long monitor contention', 'WATCHDOG KILLING SYSTEM PROCESS'] },
  broadcasts: { label: 'Broadcasts', tags: ['BroadcastQueue', 'ActivityManager'], needles: ['Historical broadcasts', 'Receiver Resolver Table', 'BroadcastRecord{', 'Active ordered broadcasts'] },
  process: { label: 'Proc start/kill', tags: ['ActivityManager'], needles: ['Start proc', 'am_proc_start', 'am_proc_died'] },
  memory: { label: 'Low memory', tags: ['ActivityManager', 'lmkd', 'LowMemoryKiller'], needles: ['am_low_memory', 'Total PSS by OOM adjustment', 'kswapd', 'mmcqd'] },
  power: { label: 'Power', tags: ['PowerManagerService', 'BatteryStatsService'], needles: ['screen_toggled', 'wakelock'] },
  wifi: { label: 'Wi-Fi', tags: ['WifiService', 'WifiStateMachine', 'wpa_supplicant', 'wificond', 'WifiClientModeImpl', 'SupplicantStaNetwork'], needles: ['wlan', 'CONNECTIVITY_CHANGE'] },
  bluetooth: { label: 'Bluetooth', tags: ['BluetoothAdapter', 'BluetoothManagerService', 'BtGatt', 'bt_stack', 'BluetoothLeScanner', 'BluetoothA2dp'], needles: ['BluetoothLeScanner', 'onClientRegistered'] },
  nfc: { label: 'NFC', tags: ['NfcService', 'NfcDispatcher', 'NfcTag', 'HostEmulationManager'], needles: ['NFC'] },
  location: { label: 'Location', tags: ['GnssLocationProvider', 'LocationManagerService', 'FusedLocationProvider'], needles: ['am_focused_activity', 'location'] },
  telephony: { label: 'Telephony', tags: ['TelephonyManager', 'RILJ', 'IMS', 'PhoneInterfaceManager'], needles: ['RILJ', 'IMS'] },
  camera: { label: 'Camera', tags: ['Camera', 'Camera2', 'CameraService', 'mm-qcamera-daemon'], needles: ['GoogleCamera', 'camera'] },
  audio: { label: 'Audio', tags: ['AudioFlinger', 'AudioPolicyManager', 'AudioTrack', 'AudioService'], needles: ['audio'] },
  graphics: { label: 'Graphics', tags: ['SurfaceFlinger', 'HWComposer', 'RenderThread'], needles: ['surfaceflinger'] },
  webview: { label: 'WebView', tags: ['chromium', 'webview'], needles: ['WebViewChromium'] },
  packages: { label: 'Install/Dex2Oat', tags: ['PackageManager', 'PackageInstaller', 'installd', 'PackageManager.DexOptimizer'], needles: ['dex2oat', 'Running dexopt', 'Finsky'] },
  kernel: { label: 'Kernel', tags: [], needles: ['PM: suspend exit', 'PM: suspend entry'] },
  battery: { label: 'Battery', tags: ['BatteryService', 'BatteryStatsService'], needles: ['Battery'] },
  systemui: { label: 'SystemUI', tags: ['SystemUI'], needles: [] },
};
