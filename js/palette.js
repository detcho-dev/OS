import { APPS } from "./apps.js";
import { createWindow } from "./window-manager.js";
import { GLOBAL_FS } from "./vfs.js";
import {
  getSetting,
  setSetting,
  ACCENTS,
  WALLPAPERS,
} from "./settings-store.js";
import { closeContextMenu } from "./context-menu.js";

/* ============================================================
   Icons
   ============================================================ */
const ICONS = {
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="#c8c8cc" stroke-width="1.6" stroke-linejoin="round">
    <path d="M5 3 H14 L19 8 V21 H5 Z" fill="#e8e8ea" stroke="none"/>
    <path d="M14 3 L19 8 H14 Z" fill="#b8b8bc" stroke="none"/>
  </svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none">
    <path d="M3 6 C3 5 3.5 4.5 4 4.5 H9 L11 6.5 H20 C20.5 6.5 21 7 21 7.5 V18 C21 19 20.5 19.5 20 19.5 H4 C3.5 19.5 3 19 3 18 Z" fill="#e9a23b"/>
    <path d="M3 8 H21 V18 C21 19 20.5 19.5 20 19.5 H4 C3.5 19.5 3 19 3 18 Z" fill="#f7b955"/>
  </svg>`,
  action: `<svg viewBox="0 0 24 24" fill="none" stroke="#c8c8cc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2 V4 M12 20 V22 M4 12 H2 M22 12 H20 M6 6 L4 4 M20 20 L18 18 M6 18 L4 20 M20 4 L18 6"/>
  </svg>`,
  swatch: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5">
    <circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/>
  </svg>`,
  wallpaper: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="1.5"/>
    <circle cx="8.5" cy="10" r="1.5"/>
    <path d="M3 17 L9 12 L14 16 L18 13 L21 16"/>
  </svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="#c8c8cc" stroke-width="1.8" stroke-linecap="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7 V12 L15 14"/>
  </svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="#c8c8cc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19 12 C19 11.4 19 10.8 18.9 10.2 L21 8.5 L19 5 L16.5 6 C15.5 5.2 14.3 4.6 13 4.3 L12.5 1.5 H11.5 L11 4.3 C9.7 4.6 8.5 5.2 7.5 6 L5 5 L3 8.5 L5.1 10.2 C5 10.8 5 11.4 5 12 C5 12.6 5 13.2 5.1 13.8 L3 15.5 L5 19 L7.5 18 C8.5 18.8 9.7 19.4 11 19.7 L11.5 22.5 H12.5 L13 19.7 C14.3 19.4 15.5 18.8 16.5 18 L19 19 L21 15.5 L18.9 13.8 C19 13.2 19 12.6 19 12 Z"/>
  </svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="11" cy="11" r="7"/>
    <path d="M20 20 L16 16"/>
  </svg>`,
};

/* ============================================================
   State
   ============================================================ */
let isOpen = false;
let overlayEl = null;
let inputEl = null;
let resultsEl = null;
let allItems = [];
let filtered = [];
let selectedIndex = 0;

/* ============================================================
   Item collection
   ============================================================ */
function buildItems() {
  const items = [];

  // 1) Applications
  for (const [id, app] of Object.entries(APPS)) {
    items.push({
      id: "app:" + id,
      type: "app",
      label: app.name,
      desc: app.desc || "",
      icon: app.icon,
      tint: app.tint,
      iconSmall: true,
      action: () => createWindow(id),
      searchText: (
        app.name +
        " " +
        (app.desc || "") +
        " app application"
      ).toLowerCase(),
    });
  }

  // 2) Files & folders
  walkFS(GLOBAL_FS, [], (pathParts, node) => {
    if (pathParts.length === 0) return;
    const name = pathParts[pathParts.length - 1];
    const fullPath = "/" + pathParts.join("/");
    const isDir = node.type === "dir";

    items.push({
      id: "file:" + fullPath,
      type: isDir ? "folder" : "file",
      label: name,
      desc: fullPath,
      icon: isDir ? ICONS.folder : ICONS.file,
      iconSmall: true,
      action: () => {
        if (isDir) {
          const w = createWindow("files");
          if (w && typeof w.navigateTo === "function") w.navigateTo(pathParts);
        } else {
          createWindow("editor", { filePath: fullPath, title: name });
        }
      },
      searchText: (name + " " + fullPath).toLowerCase(),
    });
  });

  // 3) Actions
  items.push(...buildActions());

  return items;
}

function walkFS(node, pathParts, visit) {
  visit(pathParts, node);
  if (node.type === "dir") {
    for (const [name, child] of Object.entries(node.children || {})) {
      walkFS(child, [...pathParts, name], visit);
    }
  }
}

function buildActions() {
  const actions = [];

  // Accent colors
  for (const [k, a] of Object.entries(ACCENTS)) {
    actions.push({
      id: "action:accent:" + k,
      type: "action",
      label: "Set accent: " + capitalize(k),
      desc: "Change the system accent color",
      icon: ICONS.swatch.replace("currentColor", a.main),
      tint: "rgba(255,255,255,0.06)",
      iconSmall: true,
      action: () => setSetting("accent", k),
      searchText: ("accent color theme " + k + " change set").toLowerCase(),
    });
  }

  // Wallpapers
  for (const [k, w] of Object.entries(WALLPAPERS)) {
    actions.push({
      id: "action:wallpaper:" + k,
      type: "action",
      label: "Set wallpaper: " + w.name,
      desc: "Change the desktop background",
      icon: ICONS.wallpaper,
      tint: "rgba(255,255,255,0.06)",
      iconSmall: true,
      action: () => setSetting("wallpaper", k),
      searchText: (
        "wallpaper background theme " +
        k +
        " " +
        w.name
      ).toLowerCase(),
    });
  }

  // Clock toggle
  actions.push({
    id: "action:clock",
    type: "action",
    label: "Toggle 24-hour clock",
    desc: "Switch between 12h and 24h time format",
    icon: ICONS.clock,
    tint: "rgba(255,255,255,0.06)",
    iconSmall: true,
    action: () => setSetting("clock24h", !getSetting("clock24h")),
    searchText: "clock 24 hour time format toggle switch am pm".toLowerCase(),
  });

  // Open settings
  actions.push({
    id: "action:settings",
    type: "action",
    label: "Open Settings",
    desc: "Appearance, Clock, About",
    icon: APPS.settings.icon,
    tint: APPS.settings.tint,
    iconSmall: true,
    action: () => createWindow("settings"),
    searchText: "settings preferences options".toLowerCase(),
  });

  // Open files
  actions.push({
    id: "action:files",
    type: "action",
    label: "Open Files",
    desc: "Browse the file system",
    icon: APPS.files.icon,
    tint: APPS.files.tint,
    iconSmall: true,
    action: () => createWindow("files"),
    searchText: "files browse explorer".toLowerCase(),
  });

  // Open terminal
  actions.push({
    id: "action:terminal",
    type: "action",
    label: "Open Terminal",
    desc: "Command line",
    icon: APPS.terminal.icon,
    tint: APPS.terminal.tint,
    iconSmall: true,
    action: () => createWindow("terminal"),
    searchText: "terminal shell command line cli".toLowerCase(),
  });

  return actions;
}

/* ============================================================
   Filtering & ranking
   ============================================================ */
function filterItems(query) {
  const q = query.trim().toLowerCase();

  if (!q) {
    const apps = allItems.filter((i) => i.type === "app");
    const actions = allItems.filter((i) => i.type === "action");
    const files = allItems
      .filter((i) => i.type === "file" || i.type === "folder")
      .slice(0, 8);
    return [...apps, ...actions, ...files];
  }

  const scored = [];
  for (const item of allItems) {
    const labelLower = item.label.toLowerCase();
    let score = 0;

    if (labelLower === q) score = 100;
    else if (labelLower.startsWith(q)) score = 80;
    else if (item.searchText.includes(q)) score = 40;
    else if (fuzzyMatch(labelLower, q)) score = 20;
    else continue;

    // tie-breaker: apps > actions > files > folders
    const typeWeight =
      { app: 4, action: 3, file: 2, folder: 1 }[item.type] || 0;
    score += typeWeight;

    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 60).map((s) => s.item);
}

function fuzzyMatch(str, query) {
  let si = 0,
    qi = 0;
  while (si < str.length && qi < query.length) {
    if (str[si] === query[qi]) qi++;
    si++;
  }
  return qi === query.length;
}

/* ============================================================
   Rendering
   ============================================================ */
function renderResults(query = "") {
  resultsEl.innerHTML = "";

  if (filtered.length === 0) {
    resultsEl.innerHTML = `<div class="palette-empty">No results for "${escapeHtml(
      query
    )}"</div>`;
    return;
  }

  let lastType = null;
  let globalIndex = 0;

  for (const item of filtered) {
    if (item.type !== lastType) {
      const header = document.createElement("div");
      header.className = "palette-section-header";
      header.textContent = sectionLabel(item.type);
      resultsEl.appendChild(header);
      lastType = item.type;
    }

    const row = document.createElement("div");
    row.className =
      "palette-item" + (globalIndex === selectedIndex ? " selected" : "");
    row.dataset.index = globalIndex;

    const iconStyle = item.tint ? `style="background:${item.tint}"` : "";
    const iconClass = "palette-item-icon" + (item.iconSmall ? " small" : "");

    row.innerHTML = `
      <div class="${iconClass}" ${iconStyle}>${item.icon}</div>
      <div class="palette-item-info">
        <div class="palette-item-label">${highlightMatch(
          item.label,
          query
        )}</div>
        ${
          item.desc
            ? `<div class="palette-item-desc">${highlightMatch(
                item.desc,
                query
              )}</div>`
            : ""
        }
      </div>
    `;

    const idx = globalIndex;
    row.addEventListener("mouseenter", () => {
      selectedIndex = idx;
      updateSelection();
    });
    row.addEventListener("click", () => activate(idx));

    resultsEl.appendChild(row);
    globalIndex++;
  }

  updateSelection();
}

function sectionLabel(type) {
  return (
    {
      app: "Applications",
      action: "Actions",
      file: "Files",
      folder: "Folders",
    }[type] || type
  );
}

function updateSelection() {
  const rows = resultsEl.querySelectorAll(".palette-item");
  rows.forEach((r) => {
    r.classList.toggle("selected", Number(r.dataset.index) === selectedIndex);
  });
  const sel = resultsEl.querySelector(".palette-item.selected");
  if (sel) sel.scrollIntoView({ block: "nearest" });
}

function activate(index) {
  const item = filtered[index];
  if (!item) return;
  closePalette();
  // تأجيل بسيط حتى ينغلق الـ palette قبل ما ينفذ الحدث
  setTimeout(() => item.action(), 30);
}

/* ============================================================
   DOM creation
   ============================================================ */
function createPaletteDOM() {
  overlayEl = document.createElement("div");
  overlayEl.id = "paletteOverlay";
  overlayEl.innerHTML = `
    <div class="palette-panel">
      <div class="palette-search">
        <div class="palette-search-icon">${ICONS.search}</div>
        <input class="palette-input" placeholder="Search apps, files, actions…" autocomplete="off" spellcheck="false" />
        <span class="palette-hint-kbd">ESC</span>
      </div>
      <div class="palette-results"></div>
      <div class="palette-footer">
        <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  inputEl = overlayEl.querySelector(".palette-input");
  resultsEl = overlayEl.querySelector(".palette-results");

  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) closePalette();
  });

  inputEl.addEventListener("input", () => {
    selectedIndex = 0;
    filtered = filterItems(inputEl.value);
    renderResults(inputEl.value);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (selectedIndex < filtered.length - 1) {
        selectedIndex++;
        updateSelection();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (selectedIndex > 0) {
        selectedIndex--;
        updateSelection();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(selectedIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closePalette();
    }
  });
}

/* ============================================================
   Public API
   ============================================================ */
export function openPalette() {
  if (isOpen) return;
  isOpen = true;

  closeContextMenu(); // في حالة وجود context menu مفتوح
  allItems = buildItems();
  filtered = filterItems("");
  selectedIndex = 0;

  createPaletteDOM();
  renderResults("");

  requestAnimationFrame(() => overlayEl.classList.add("open"));
  setTimeout(() => inputEl.focus(), 30);
}

export function closePalette() {
  if (!isOpen) return;
  isOpen = false;

  if (overlayEl) {
    overlayEl.classList.remove("open");
    const el = overlayEl;
    overlayEl = null;
    inputEl = null;
    resultsEl = null;
    setTimeout(() => el.remove(), 160);
  }
}

export function togglePalette() {
  if (isOpen) closePalette();
  else openPalette();
}

/* ============================================================
   Helpers
   ============================================================ */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return escapeHtml(text);
  return (
    escapeHtml(text.slice(0, idx)) +
    '<mark class="palette-match">' +
    escapeHtml(text.slice(idx, idx + q.length)) +
    "</mark>" +
    escapeHtml(text.slice(idx + q.length))
  );
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
