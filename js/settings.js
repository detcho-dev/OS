import {
  getSetting,
  setSetting,
  ACCENTS,
  WALLPAPERS,
} from "./settings-store.js";
import { getNode } from "./vfs.js";

const bootTime = Date.now();

export function createSettings(container, win) {
  container.innerHTML = `
    <div class="settings-app">
      <aside class="settings-sidebar">
        <div class="settings-sidebar-title">Settings</div>
        <button class="settings-nav-item active" data-section="appearance">Appearance</button>
        <button class="settings-nav-item" data-section="clock">Clock</button>
        <button class="settings-nav-item" data-section="about">About</button>
      </aside>
      <div class="settings-content" id="settingsContent"></div>
    </div>
  `;

  const $content = container.querySelector("#settingsContent");
  const $nav = container.querySelectorAll(".settings-nav-item");

  let currentSection = "appearance";

  $nav.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentSection = btn.dataset.section;
      $nav.forEach((b) => b.classList.toggle("active", b === btn));
      render();
    });
  });

  /* ============================================================
     Sections
     ============================================================ */
  function render() {
    if (currentSection === "appearance") renderAppearance();
    if (currentSection === "clock") renderClock();
    if (currentSection === "about") renderAbout();
  }

  /* ---------- Appearance ---------- */
  function renderAppearance() {
    const currentWallpaper = getSetting("wallpaper");
    const currentAccent = getSetting("accent");

    $content.innerHTML = `
      <h2 class="settings-section-title">Appearance</h2>

      <div class="settings-group">
        <div class="settings-group-label">Wallpaper</div>
        <div class="wallpaper-grid" id="wallpaperGrid"></div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Accent Color</div>
        <div class="accent-row" id="accentRow"></div>
      </div>
    `;

    const $wallpaperGrid = $content.querySelector("#wallpaperGrid");
    for (const [key, w] of Object.entries(WALLPAPERS)) {
      const card = document.createElement("div");
      card.className =
        "wallpaper-card" + (key === currentWallpaper ? " active" : "");
      card.innerHTML = `
        <div class="wallpaper-preview" style="background:${w.preview}"></div>
        <div class="wallpaper-name">${w.name}</div>
      `;
      card.addEventListener("click", () => {
        setSetting("wallpaper", key);
        $wallpaperGrid
          .querySelectorAll(".wallpaper-card")
          .forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
      });
      $wallpaperGrid.appendChild(card);
    }

    const $accentRow = $content.querySelector("#accentRow");
    for (const [key, a] of Object.entries(ACCENTS)) {
      const dot = document.createElement("button");
      dot.className = "accent-dot" + (key === currentAccent ? " active" : "");
      dot.style.background = a.main;
      dot.style.color = a.main; // for the glow ring
      dot.title = key.charAt(0).toUpperCase() + key.slice(1);
      dot.addEventListener("click", () => {
        setSetting("accent", key);
        $accentRow
          .querySelectorAll(".accent-dot")
          .forEach((d) => d.classList.remove("active"));
        dot.classList.add("active");
      });
      $accentRow.appendChild(dot);
    }
  }

  /* ---------- Clock ---------- */
  function renderClock() {
    const is24h = getSetting("clock24h");

    $content.innerHTML = `
      <h2 class="settings-section-title">Clock</h2>

      <div class="settings-group">
        <div class="settings-row">
          <div>
            <div class="settings-row-title">24-hour format</div>
            <div class="settings-row-desc">Use 24-hour time instead of AM / PM</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="clock24h" ${is24h ? "checked" : ""}>
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
    `;

    $content.querySelector("#clock24h").addEventListener("change", (e) => {
      setSetting("clock24h", e.target.checked);
    });
  }

  /* ---------- About ---------- */
  function renderAbout() {
    const stats = countFiles(getNode([]));
    const uptimeSec = Math.floor((Date.now() - bootTime) / 1000);
    const uptimeStr = formatUptime(uptimeSec);
    const resolution = `${window.innerWidth} × ${window.innerHeight}`;

    $content.innerHTML = `
      <h2 class="settings-section-title">About</h2>

      <div class="about-header">
        <div class="about-logo">
          <svg viewBox="0 0 48 48" fill="none" stroke="#e95420" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="24" cy="24" r="18"/>
            <path d="M16 20 L22 24 L16 28"/>
            <path d="M26 28 L34 28"/>
          </svg>
        </div>
        <div>
          <div class="about-title">WebOS</div>
          <div class="about-version">Version 0.3.0</div>
        </div>
      </div>

      <div class="settings-group">
        <div class="about-row"><span>Files</span><span>${
          stats.files
        }</span></div>
        <div class="about-row"><span>Folders</span><span>${
          stats.dirs
        }</span></div>
        <div class="about-row"><span>Total size</span><span>${formatBytes(
          stats.size
        )}</span></div>
        <div class="about-row"><span>Uptime</span><span>${uptimeStr}</span></div>
        <div class="about-row"><span>Screen</span><span>${resolution}</span></div>
        <div class="about-row"><span>User</span><span>user@webos</span></div>
      </div>
    `;
  }

  /* ---------- Helpers ---------- */
  function countFiles(node, stats = { files: 0, dirs: 0, size: 0 }) {
    if (!node) return stats;
    if (node.type === "file") {
      stats.files++;
      stats.size += (node.content || "").length;
    } else {
      stats.dirs++;
      for (const child of Object.values(node.children || {})) {
        countFiles(child, stats);
      }
    }
    return stats;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function formatUptime(sec) {
    if (sec < 60) return sec + "s";
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m ${sec % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  /* ---------- Init ---------- */
  render();
}
