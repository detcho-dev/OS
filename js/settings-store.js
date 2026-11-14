import { getCurrentUser } from './auth-store.js';

const DEFAULTS = {
  wallpaper: 'auto',
  accent:    'orange',
  clock24h:  false,
  requirePasswordOnStartup: true,
};

let settings = { ...DEFAULTS };
const listeners = {};

export const ACCENTS = {
  orange: { main: '#e95420', soft: 'rgba(233, 84, 32, 0.22)' },
  blue:   { main: '#3b82f6', soft: 'rgba(59, 130, 246, 0.22)' },
  green:  { main: '#22c55e', soft: 'rgba(34, 197, 94, 0.22)' },
  purple: { main: '#a855f7', soft: 'rgba(168, 85, 247, 0.22)' },
  red:    { main: '#ef4444', soft: 'rgba(239, 68, 68, 0.22)' },
  pink:   { main: '#ec4899', soft: 'rgba(236, 72, 153, 0.22)' },
};

export const WALLPAPERS = {
  auto:   { name: 'Auto (per workspace)', preview: 'linear-gradient(90deg, #2c001e 0%, #0a1832 33%, #0a2c1a 66%, #2c1800 100%)' },
  jammy:  { name: 'Jammy',   preview: 'linear-gradient(135deg, #2c001e, #3b0a1f)', colors: { c1: 'rgba(233,84,32,0.34)', c2: 'rgba(119,41,83,0.55)', c3: 'rgba(233,84,32,0.10)', bg1: '#2c001e', bg2: '#1a0d15', bg3: '#3b0a1f' } },
  blue:   { name: 'Ocean',   preview: 'linear-gradient(135deg, #0a1832, #0a1a3a)', colors: { c1: 'rgba(59,130,246,0.34)', c2: 'rgba(37,99,235,0.50)', c3: 'rgba(59,130,246,0.10)', bg1: '#0a1832', bg2: '#0a0d1a', bg3: '#0a1a3a' } },
  green:  { name: 'Forest',  preview: 'linear-gradient(135deg, #0a2c1a, #0a3a1a)', colors: { c1: 'rgba(34,197,94,0.32)', c2: 'rgba(21,128,61,0.55)', c3: 'rgba(34,197,94,0.10)', bg1: '#0a2c1a', bg2: '#0a1a10', bg3: '#0a3a1a' } },
  amber:  { name: 'Sunset',  preview: 'linear-gradient(135deg, #2c1800, #3a1f00)', colors: { c1: 'rgba(251,191,36,0.32)', c2: 'rgba(180,83,9,0.55)', c3: 'rgba(251,191,36,0.10)', bg1: '#2c1800', bg2: '#1a0f00', bg3: '#3a1f00' } },
  dark:   { name: 'Dark',    preview: 'linear-gradient(135deg, #0a0a0f, #1a1a20)', colors: { c1: 'rgba(80,80,100,0.20)', c2: 'rgba(40,40,60,0.40)', c3: 'rgba(100,100,120,0.08)', bg1: '#0a0a0f', bg2: '#08080c', bg3: '#12121a' } },
  red:    { name: 'Crimson', preview: 'linear-gradient(135deg, #2c0000, #3a0a0a)', colors: { c1: 'rgba(239,68,68,0.32)', c2: 'rgba(127,29,29,0.55)', c3: 'rgba(239,68,68,0.10)', bg1: '#2c0000', bg2: '#1a0505', bg3: '#3a0a0a' } },
};

function storageKey() {
  const user = getCurrentUser();
  return user ? 'webos.settings.' + user.id : 'webos.settings.guest';
}

export function loadSettings() {
  settings = { ...DEFAULTS };
  try {
    const stored = localStorage.getItem(storageKey());
    if (stored) settings = { ...DEFAULTS, ...JSON.parse(stored) };
  } catch (e) {}
  return settings;
}

export function saveSettings() {
  try { localStorage.setItem(storageKey(), JSON.stringify(settings)); } catch (e) {}
}

export function getSetting(key) { return settings[key]; }

export function setSetting(key, value) {
  settings[key] = value;
  saveSettings();
  if (key === 'accent') applyAccent();
  if (listeners[key]) listeners[key].forEach(fn => fn(value));
}

export function onChange(key, fn) {
  if (!listeners[key]) listeners[key] = [];
  listeners[key].push(fn);
}

export function applyAccent() {
  const a = ACCENTS[settings.accent] || ACCENTS.orange;
  document.documentElement.style.setProperty('--accent', a.main);
  document.documentElement.style.setProperty('--accent-soft', a.soft);
}
