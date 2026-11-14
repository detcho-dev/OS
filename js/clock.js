import { getSetting } from "./settings-store.js";

const ALL_CITIES = [
  { name: "Cairo", tz: "Africa/Cairo", flag: "🇪🇬" },
  { name: "London", tz: "Europe/London", flag: "🇬🇧" },
  { name: "New York", tz: "America/New_York", flag: "🇺🇸" },
  { name: "Tokyo", tz: "Asia/Tokyo", flag: "🇯🇵" },
  { name: "Dubai", tz: "Asia/Dubai", flag: "🇦🇪" },
  { name: "Paris", tz: "Europe/Paris", flag: "🇫🇷" },
  { name: "Sydney", tz: "Australia/Sydney", flag: "🇦🇺" },
  { name: "Berlin", tz: "Europe/Berlin", flag: "🇩🇪" },
  { name: "Moscow", tz: "Europe/Moscow", flag: "🇷🇺" },
  { name: "São Paulo", tz: "America/Sao_Paulo", flag: "🇧🇷" },
];

const DEFAULT_CITIES = [
  "Africa/Cairo",
  "Europe/London",
  "America/New_York",
  "Asia/Tokyo",
];
const STORAGE_KEY = "webos.clock.cities";

let selected = loadSelected();
let intervalId = null;

function loadSelected() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [...DEFAULT_CITIES];
}

function saveSelected() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
  } catch (e) {}
}

export function createClock(container, win) {
  container.innerHTML = `
    <div class="clock-app">
      <div class="clock-big">
        <div class="clock-face"></div>
        <div class="clock-big-time">--:--:--</div>
        <div class="clock-big-date">—</div>
      </div>
      <div class="clock-list"></div>
      <div class="clock-add">
        <select class="clock-select"></select>
        <button class="clock-add-btn">Add City</button>
      </div>
    </div>
  `;

  const $face = container.querySelector(".clock-face");
  const $time = container.querySelector(".clock-big-time");
  const $date = container.querySelector(".clock-big-date");
  const $list = container.querySelector(".clock-list");
  const $select = container.querySelector(".clock-select");
  const $addBtn = container.querySelector(".clock-add-btn");

  $face.innerHTML = buildClockSvg();

  function refreshSelect() {
    $select.innerHTML = "";
    for (const city of ALL_CITIES) {
      if (selected.includes(city.tz)) continue;
      const opt = document.createElement("option");
      opt.value = city.tz;
      opt.textContent = `${city.flag}  ${city.name}`;
      $select.appendChild(opt);
    }
    $addBtn.disabled = $select.options.length === 0;
  }

  function renderList() {
    $list.innerHTML = "";
    const is24 = getSetting("clock24h");

    for (const tz of selected) {
      const city = ALL_CITIES.find((c) => c.tz === tz);
      if (!city) continue;

      const row = document.createElement("div");
      row.className = "clock-item";
      row.innerHTML = `
        <div class="clock-flag">${city.flag}</div>
        <div class="clock-info">
          <div class="clock-city">${escapeHtml(city.name)}</div>
          <div class="clock-tz">${escapeHtml(tz)}</div>
        </div>
        <div class="clock-time">--:--</div>
        <button class="clock-remove" title="Remove">×</button>
      `;
      row.querySelector(".clock-remove").addEventListener("click", () => {
        selected = selected.filter((t) => t !== tz);
        saveSelected();
        renderList();
        refreshSelect();
      });
      $list.appendChild(row);
    }

    if (selected.length === 0) {
      $list.innerHTML = `<div style="text-align:center;color:#666;padding:24px;">No cities added</div>`;
    }

    tick();
  }

  function tick() {
    const now = new Date();
    const is24 = getSetting("clock24h");

    // big local
    const localOpts = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !is24,
    };
    $time.textContent = now.toLocaleTimeString("en-US", localOpts);
    $date.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    // analog hands
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const hourDeg = (h + m / 60) * 30;
    const minDeg = (m + s / 60) * 6;
    const secDeg = s * 6;

    const $hour = $face.querySelector(".hand-hour");
    const $min = $face.querySelector(".hand-min");
    const $sec = $face.querySelector(".hand-sec");
    if ($hour) $hour.setAttribute("transform", `rotate(${hourDeg} 70 70)`);
    if ($min) $min.setAttribute("transform", `rotate(${minDeg} 70 70)`);
    if ($sec) $sec.setAttribute("transform", `rotate(${secDeg} 70 70)`);

    // cities
    const rows = $list.querySelectorAll(".clock-item");
    rows.forEach((row, i) => {
      const tz = selected[i];
      if (!tz) return;
      const cityTime = row.querySelector(".clock-time");
      const opts = {
        hour: "2-digit",
        minute: "2-digit",
        hour12: !is24,
        timeZone: tz,
      };
      cityTime.textContent = now.toLocaleTimeString("en-US", opts);
    });
  }

  $addBtn.addEventListener("click", () => {
    const tz = $select.value;
    if (!tz || selected.includes(tz)) return;
    selected.push(tz);
    saveSelected();
    renderList();
    refreshSelect();
  });

  refreshSelect();
  renderList();
  intervalId = setInterval(tick, 1000);

  if (win) {
    win.onClose = () => {
      if (intervalId) clearInterval(intervalId);
    };
  }
}

function buildClockSvg() {
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const x1 = 70 + 58 * Math.sin(angle);
    const y1 = 70 - 58 * Math.cos(angle);
    const x2 = 70 + 62 * Math.sin(angle);
    const y2 = 70 - 62 * Math.cos(angle);
    ticks.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#666" stroke-width="2" stroke-linecap="round"/>`
    );
  }
  return `
    <svg viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="66" fill="#252528" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      ${ticks.join("")}
      <line class="hand-hour" x1="70" y1="70" x2="70" y2="42" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <line class="hand-min"  x1="70" y1="70" x2="70" y2="28" stroke="#e8e8e8" stroke-width="3" stroke-linecap="round"/>
      <line class="hand-sec"  x1="70" y1="70" x2="70" y2="22" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="70" cy="70" r="3" fill="var(--accent)"/>
    </svg>
  `;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
