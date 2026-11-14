import { closeContextMenu } from './context-menu.js';

/* ============================================================
   Icons
   ============================================================ */
const VOL_ICONS = {
  muted: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
    <path d="M3 9 V15 H7 L12 19 V5 L7 9 Z"/>
    <path d="M16 9 L21 14 M21 9 L16 14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,
  low: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
    <path d="M3 9 V15 H7 L12 19 V5 L7 9 Z"/>
  </svg>`,
  med: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
    <path d="M3 9 V15 H7 L12 19 V5 L7 9 Z"/>
    <path d="M15.5 8.5 C17 10 17 14 15.5 15.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,
  high: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
    <path d="M3 9 V15 H7 L12 19 V5 L7 9 Z"/>
    <path d="M15.5 8.5 C17 10 17 14 15.5 15.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M18 6 C21 8.5 21 15.5 18 18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,
};

const WIFI_ICONS = {
  offline: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M2 8.5 C7 4 17 4 22 8.5" opacity="0.25"/>
    <path d="M5 12 C8.5 9 15.5 9 19 12" opacity="0.25"/>
    <path d="M8.5 15.5 C10.5 14 13.5 14 15.5 15.5" opacity="0.25"/>
    <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" opacity="0.25"/>
    <path d="M3 3 L21 21" stroke-width="2"/>
  </svg>`,
  connected: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M2 8.5 C7 4 17 4 22 8.5"/>
    <path d="M5 12 C8.5 9 15.5 9 19 12"/>
    <path d="M8.5 15.5 C10.5 14 13.5 14 15.5 15.5"/>
    <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/>
  </svg>`,
};

const BATTERY_ICONS = {
  full: `<svg viewBox="0 0 24 24" width="17" height="15">
    <rect x="2.5" y="8" width="16" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="4" y="9.5" width="12" height="5" rx="0.5" fill="currentColor"/>
    <rect x="19.5" y="10.5" width="1.5" height="3" rx="0.5" fill="currentColor"/>
  </svg>`,
  med: `<svg viewBox="0 0 24 24" width="17" height="15">
    <rect x="2.5" y="8" width="16" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="4" y="9.5" width="7" height="5" rx="0.5" fill="currentColor"/>
    <rect x="19.5" y="10.5" width="1.5" height="3" rx="0.5" fill="currentColor"/>
  </svg>`,
  low: `<svg viewBox="0 0 24 24" width="17" height="15">
    <rect x="2.5" y="8" width="16" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="4" y="9.5" width="3" height="5" rx="0.5" fill="#f87171"/>
    <rect x="19.5" y="10.5" width="1.5" height="3" rx="0.5" fill="currentColor"/>
  </svg>`,
  charging: `<svg viewBox="0 0 24 24" width="17" height="15">
    <rect x="2.5" y="8" width="16" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M11 9 L8 13 H10.5 L10 16 L13.5 12 H11 Z" fill="#4ade80"/>
    <rect x="19.5" y="10.5" width="1.5" height="3" rx="0.5" fill="currentColor"/>
  </svg>`,
  unknown: `<svg viewBox="0 0 24 24" width="17" height="15">
    <rect x="2.5" y="8" width="16" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
    <text x="11" y="14.5" text-anchor="middle" font-size="7" fill="currentColor" opacity="0.7">?</text>
  </svg>`,
};

const POWER_ICON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <path d="M12 3 V12"/>
  <path d="M6.3 6.3 C3.5 9 3.5 13 6.3 15.7 C9 18.5 13 18.5 15.7 15.7 C18.5 13 18.5 9 15.7 6.3"/>
</svg>`;

/* ============================================================
   State
   ============================================================ */
const STORAGE_KEY = 'webos.statusbar';

let state = {
  volume: 70,
  muted: false,
  brightness: 100,
  airplaneMode: false,
};

function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) state = { ...state, ...JSON.parse(s) };
  } catch (e) {}
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

/* ============================================================
   Audio (Web Audio API — real, playable sound)
   ============================================================ */
let audioCtx = null;
let masterGain = null;

function ensureAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    applyGain();
  } catch (e) {
    console.warn('Web Audio not available');
  }
}

function applyGain() {
  if (!masterGain || !audioCtx) return;
  const target = (state.muted || state.airplaneMode)
    ? 0
    : (state.volume / 100) * 0.4;
  masterGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.02);
}

export function playTestTone() {
  ensureAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(env);
  env.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.32);
}

/* ============================================================
   Brightness overlay
   ============================================================ */
function ensureBrightnessOverlay() {
  let overlay = document.getElementById('brightnessOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'brightnessOverlay';
    document.body.appendChild(overlay);
  }
  return overlay;
}

function applyBrightness() {
  const overlay = ensureBrightnessOverlay();
  overlay.style.opacity = String((100 - state.brightness) / 200);
  overlay.style.display = '';
}

export function hideBrightnessOverlay() {
  const o = document.getElementById('brightnessOverlay');
  if (o) o.style.display = 'none';
}

export function restoreBrightnessOverlay() {
  applyBrightness();
}

/* ============================================================
   Icon selectors
   ============================================================ */
function getVolIcon() {
  if (state.muted || state.volume === 0) return VOL_ICONS.muted;
  if (state.volume < 30) return VOL_ICONS.low;
  if (state.volume < 70) return VOL_ICONS.med;
  return VOL_ICONS.high;
}

function getWifiIcon() {
  const net = getNetworkInfo();
  return net.online ? WIFI_ICONS.connected : WIFI_ICONS.offline;
}

function getBatteryIcon() {
  if (!batteryState) return BATTERY_ICONS.unknown;
  if (batteryState.charging) return BATTERY_ICONS.charging;
  if (batteryState.level > 60) return BATTERY_ICONS.full;
  if (batteryState.level > 25) return BATTERY_ICONS.med;
  return BATTERY_ICONS.low;
}

/* ============================================================
   Real network info (via Network Information API)
   ============================================================ */
function getNetworkInfo() {
  const trulyOnline = navigator.onLine;
  const online = trulyOnline && !state.airplaneMode;

  const conn = navigator.connection
    || navigator.mozConnection
    || navigator.webkitConnection;

  const info = {
    online,
    trueStatus: trulyOnline,
    type: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
  };

  if (conn) {
    info.type = conn.type || null;
    info.effectiveType = conn.effectiveType || null;
    info.downlink = typeof conn.downlink === 'number' ? conn.downlink : null;
    info.rtt = typeof conn.rtt === 'number' ? conn.rtt : null;
    info.saveData = !!conn.saveData;
  }

  return info;
}

/* ============================================================
   Real battery (via Battery API)
   ============================================================ */
let batteryManager = null;
let batteryState = null;

async function initBattery() {
  if (!navigator.getBattery) {
    batteryState = null;
    return;
  }
  try {
    batteryManager = await navigator.getBattery();
    updateBatteryState();
    batteryManager.addEventListener('levelchange', updateBatteryState);
    batteryManager.addEventListener('chargingchange', updateBatteryState);
    batteryManager.addEventListener('chargingtimechange', updateBatteryState);
    batteryManager.addEventListener('dischargingtimechange', updateBatteryState);
  } catch (e) {
    batteryState = null;
  }
}

function updateBatteryState() {
  if (!batteryManager) return;
  batteryState = {
    level: Math.round(batteryManager.level * 100),
    charging: batteryManager.charging,
    chargingTime: batteryManager.chargingTime,
    dischargingTime: batteryManager.dischargingTime,
  };
  updateStatusWidgets();
  if (panelEl) refreshBatteryPanel();
}

/* ============================================================
   Status widgets (Top Bar)
   ============================================================ */
export function renderStatusWidgets(container) {
  loadState();

  container.innerHTML = `
    <div class="status-widgets">
      <button class="status-widget" data-widget="sound"   title="Sound">${getVolIcon()}</button>
      <button class="status-widget" data-widget="wifi"    title="Network">${getWifiIcon()}</button>
      <button class="status-widget" data-widget="battery" title="Battery">${getBatteryIcon()}</button>
      <button class="status-widget" data-widget="power"   title="Power">${POWER_ICON}</button>
    </div>
  `;

  container.querySelectorAll('.status-widget').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panelEl) closeQuickSettings();
      else         openQuickSettings();
    });
  });

  applyBrightness();
  initBattery();
}

export function updateStatusWidgets() {
  const container = document.getElementById('topbarIndicators');
  if (!container) return;
  const sound   = container.querySelector('[data-widget="sound"]');
  const wifi    = container.querySelector('[data-widget="wifi"]');
  const battery = container.querySelector('[data-widget="battery"]');
  if (sound)   sound.innerHTML   = getVolIcon();
  if (wifi)    wifi.innerHTML    = getWifiIcon();
  if (battery) battery.innerHTML = getBatteryIcon();
}

/* Network events */
window.addEventListener('online',  () => {
  updateStatusWidgets();
  if (panelEl) refreshNetworkPanel();
});
window.addEventListener('offline', () => {
  updateStatusWidgets();
  if (panelEl) refreshNetworkPanel();
});

if (navigator.connection) {
  navigator.connection.addEventListener('change', () => {
    updateStatusWidgets();
    if (panelEl) refreshNetworkPanel();
  });
}

/* ============================================================
   Quick Settings Panel
   ============================================================ */
let panelEl = null;

export function openQuickSettings() {
  closeQuickSettings();
  closeContextMenu();

  panelEl = document.createElement('div');
  panelEl.id = 'quickSettings';
  panelEl.innerHTML = buildPanelHTML();
  document.body.appendChild(panelEl);

  requestAnimationFrame(() => panelEl.classList.add('open'));
  bindPanelEvents();

  setTimeout(() => {
    document.addEventListener('mousedown', onOutsideClick, true);
    document.addEventListener('keydown', onEscapeKey, true);
  }, 0);
}

export function closeQuickSettings() {
  if (!panelEl) return;
  document.removeEventListener('mousedown', onOutsideClick, true);
  document.removeEventListener('keydown', onEscapeKey, true);

  panelEl.classList.remove('open');
  const el = panelEl;
  panelEl = null;
  setTimeout(() => el.remove(), 180);
}

function onOutsideClick(e) {
  if (!panelEl) return;
  if (panelEl.contains(e.target)) return;
  if (e.target.closest('.status-widget')) return;
  closeQuickSettings();
}

function onEscapeKey(e) {
  if (e.key === 'Escape') closeQuickSettings();
}

/* ============================================================
   Panel HTML
   ============================================================ */
function buildPanelHTML() {
  return `
    <div class="qs-section">
      <div class="qs-label">Volume</div>
      <div class="qs-volume-row">
        <div class="qs-volume-icon ${state.muted ? 'muted' : ''}" id="qsVolIcon">${getVolIcon()}</div>
        <input type="range" class="qs-slider" id="qsVolSlider" min="0" max="100" value="${state.volume}">
        <div class="qs-value" id="qsVolValue">${state.volume}%</div>
      </div>
      <button class="qs-test-btn" id="qsTestBtn" style="margin-top:8px;">Test Sound</button>
    </div>

    <div class="qs-section">
      <div class="qs-label">Brightness</div>
      <div class="qs-brightness-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2 V4 M12 20 V22 M4 12 H2 M22 12 H20 M6 6 L4 4 M20 20 L18 18 M6 18 L4 20 M20 4 L18 6"/>
        </svg>
        <input type="range" class="qs-slider" id="qsBrightSlider" min="20" max="100" value="${state.brightness}">
        <div class="qs-value" id="qsBrightValue">${state.brightness}%</div>
      </div>
    </div>

    <div class="qs-section">
      <div class="qs-label">Network</div>
      <div class="qs-wifi-toggle" id="qsWifiToggle">
        <div class="qs-wifi-toggle-label">
          <span id="qsWifiIcon">${getWifiIcon()}</span>
          <span>Airplane Mode</span>
        </div>
        <div class="qs-switch ${state.airplaneMode ? 'on' : ''}"></div>
      </div>
      <div class="qs-info-grid" id="qsNetworkInfo"></div>
    </div>

    <div class="qs-section">
      <div class="qs-label">Battery</div>
      <div class="qs-battery" id="qsBatteryInfo"></div>
    </div>

    <div class="qs-section">
      <div class="qs-label">Power</div>
      <div class="qs-power-grid">
        <button class="qs-power-btn" data-power="lock">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M8 11 V7 C8 4.8 9.8 3 12 3 C14.2 3 16 4.8 16 7 V11"/>
          </svg>
          <span>Lock</span>
        </button>
        <button class="qs-power-btn" data-power="suspend">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 13 C21 17.4 17.4 21 13 21 C8.6 21 5 17.4 5 13 C5 8.6 8.6 5 13 5"/>
            <path d="M13 3 V13"/>
          </svg>
          <span>Suspend</span>
        </button>
        <button class="qs-power-btn" data-power="restart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12 C21 16.4 17.4 20 13 20 C8.6 20 5 16.4 5 12 C5 7.6 8.6 4 13 4"/>
            <path d="M13 4 L17 8 L13 12"/>
          </svg>
          <span>Restart</span>
        </button>
        <button class="qs-power-btn" data-power="logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21 H5 C4 21 3 20 3 19 V5 C3 4 4 3 5 3 H9"/>
            <path d="M16 17 L21 12 L16 7"/>
            <path d="M21 12 H9"/>
          </svg>
          <span>Sign Out</span>
        </button>
        <button class="qs-power-btn danger" data-power="shutdown" style="grid-column: span 4;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 3 V12"/>
            <path d="M6.3 6.3 C3.5 9 3.5 13 6.3 15.7 C9 18.5 13 18.5 15.7 15.7 C18.5 13 18.5 9 15.7 6.3"/>
          </svg>
          <span>Shut Down</span>
        </button>
      </div>
    </div>
  `;
}

/* ============================================================
   Panel refreshers (called on network/battery changes)
   ============================================================ */
function refreshNetworkPanel() {
  if (!panelEl) return;

  const net = getNetworkInfo();
  const $wifiIcon = panelEl.querySelector('#qsWifiIcon');
  const $info     = panelEl.querySelector('#qsNetworkInfo');
  const $toggle   = panelEl.querySelector('#qsWifiToggle .qs-switch');

  if ($wifiIcon) $wifiIcon.innerHTML = getWifiIcon();
  if ($toggle)   $toggle.classList.toggle('on', state.airplaneMode);

  if ($info) {
    const statusText = net.online ? 'Connected' : (state.airplaneMode ? 'Offline (Airplane)' : 'Offline');
    const statusColor = net.online ? '#4ade80' : '#f87171';

    const typeText = net.type
      ? capitalize(net.type)
      : (net.effectiveType ? net.effectiveType.toUpperCase() : '—');

    const speedText = net.downlink != null
      ? net.downlink.toFixed(1) + ' Mbps'
      : '—';

    const rttText = net.rtt != null
      ? net.rtt + ' ms'
      : '—';

    $info.innerHTML = `
      <div class="qs-info-item">
        <div class="qs-info-label">Status</div>
        <div class="qs-info-value" style="color:${statusColor}">${statusText}</div>
      </div>
      <div class="qs-info-item">
        <div class="qs-info-label">Type</div>
        <div class="qs-info-value">${escapeHtml(typeText)}</div>
      </div>
      <div class="qs-info-item">
        <div class="qs-info-label">Speed</div>
        <div class="qs-info-value">${escapeHtml(speedText)}</div>
      </div>
      <div class="qs-info-item">
        <div class="qs-info-label">Latency</div>
        <div class="qs-info-value">${escapeHtml(rttText)}</div>
      </div>
    `;
  }

  updateStatusWidgets();
}

function refreshBatteryPanel() {
  if (!panelEl) return;

  const $battery = panelEl.querySelector('#qsBatteryInfo');
  if (!$battery) return;

  if (!batteryState) {
    $battery.innerHTML = `
      ${BATTERY_ICONS.unknown}
      <div class="qs-battery-info">
        <div class="qs-battery-pct">Unknown</div>
        <div class="qs-battery-sub">Battery API not available in this browser</div>
      </div>
    `;
    return;
  }

  let subText;
  if (batteryState.charging) {
    if (batteryState.chargingTime && isFinite(batteryState.chargingTime)) {
      subText = 'Charging · Full in ' + formatTime(batteryState.chargingTime);
    } else {
      subText = 'Charging';
    }
  } else {
    if (batteryState.dischargingTime && isFinite(batteryState.dischargingTime)) {
      subText = formatTime(batteryState.dischargingTime) + ' remaining';
    } else {
      subText = 'On battery';
    }
  }

  $battery.innerHTML = `
    ${getBatteryIcon()}
    <div class="qs-battery-info">
      <div class="qs-battery-pct">${batteryState.level}%</div>
      <div class="qs-battery-sub">${escapeHtml(subText)}</div>
    </div>
  `;

  updateStatusWidgets();
}

/* ============================================================
   Panel events
   ============================================================ */
function bindPanelEvents() {
  if (!panelEl) return;

  const $volSlider    = panelEl.querySelector('#qsVolSlider');
  const $volValue     = panelEl.querySelector('#qsVolValue');
  const $volIcon      = panelEl.querySelector('#qsVolIcon');
  const $testBtn      = panelEl.querySelector('#qsTestBtn');
  const $brightSlider = panelEl.querySelector('#qsBrightSlider');
  const $brightValue  = panelEl.querySelector('#qsBrightValue');
  const $wifiToggle   = panelEl.querySelector('#qsWifiToggle');

  /* --- Volume --- */
  $volSlider.addEventListener('input', (e) => {
    state.volume = Number(e.target.value);
    state.muted  = state.volume === 0;
    $volValue.textContent = state.volume + '%';
    $volIcon.innerHTML = getVolIcon();
    $volIcon.classList.toggle('muted', state.muted);
    applyGain();
    updateStatusWidgets();
    saveState();
  });

  $volSlider.addEventListener('change', () => {
    if (!state.muted && state.volume > 0) playTestTone();
  });

  $volIcon.addEventListener('click', () => {
    state.muted = !state.muted;
    if (!state.muted && state.volume === 0) state.volume = 50;
    $volSlider.value = state.muted ? 0 : state.volume;
    $volValue.textContent = (state.muted ? 0 : state.volume) + '%';
    $volIcon.innerHTML = getVolIcon();
    $volIcon.classList.toggle('muted', state.muted);
    applyGain();
    updateStatusWidgets();
    saveState();
  });

  $testBtn.addEventListener('click', () => {
    if (state.muted) state.muted = false;
    if (state.volume === 0) state.volume = 50;
    $volSlider.value = state.volume;
    $volValue.textContent = state.volume + '%';
    $volIcon.innerHTML = getVolIcon();
    $volIcon.classList.remove('muted');
    applyGain();
    updateStatusWidgets();
    playTestTone();
  });

  /* --- Brightness --- */
  $brightSlider.addEventListener('input', (e) => {
    state.brightness = Number(e.target.value);
    $brightValue.textContent = state.brightness + '%';
    applyBrightness();
    saveState();
  });

  /* --- Airplane Mode --- */
  $wifiToggle.addEventListener('click', () => {
    state.airplaneMode = !state.airplaneMode;
    saveState();
    applyGain();
    refreshNetworkPanel();
  });

  /* --- Power buttons --- */
  panelEl.querySelectorAll('[data-power]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.power;
      closeQuickSettings();
      const { power } = await import('./power.js');
      power[action]();
    });
  });

  /* --- Initial render --- */
  refreshNetworkPanel();
  refreshBatteryPanel();
}

/* ============================================================
   Helpers
   ============================================================ */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
