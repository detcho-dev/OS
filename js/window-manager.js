import { APPS } from "./apps.js";
import { createTerminal } from "./terminal.js";
import { createFiles } from "./files.js";
import { createEditor } from "./editor.js";
import { renderDock } from "./dock.js";
import { updateTopbar } from "./topbar.js";
import { createNotes } from "./notes.js";
import { createSettings } from "./settings.js";
import { createStore } from "./store.js";
import { createCalculator } from "./calculator.js";
import { createClock } from "./clock.js";
import { createSnake } from "./snake.js";

const windowsLayer = document.getElementById("windowsLayer");

export const openWindows = new Map(); // instanceId -> win
let zIndexCounter = 100;
let focusedInstanceId = null;
let instanceCounter = 0;

const SINGLETON_APPS = ["terminal", "files", "settings", "notes", "store"];
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;

export function getFocusedInstance() {
  return focusedInstanceId ? openWindows.get(focusedInstanceId) : null;
}

export function getFocusedAppId() {
  const win = getFocusedInstance();
  return win ? win.appId : null;
}

export function getWindowsByApp(appId) {
  const result = [];
  for (const win of openWindows.values()) {
    if (win.appId === appId) result.push(win);
  }
  return result;
}

export function focusWindow(instanceId) {
  const win = openWindows.get(instanceId);
  if (!win) return;
  win.el.style.zIndex = ++zIndexCounter;
  focusedInstanceId = instanceId;
  renderDock();
  updateTopbar();
}

export function createWindow(appId, options = {}) {
  const app = APPS[appId];
  if (!app) return null;

  // Singleton check
  if (SINGLETON_APPS.includes(appId)) {
    const existing = openWindows.get(appId);
    if (existing) {
      if (existing.minimized) {
        existing.minimized = false;
        existing.el.style.display = "flex";
      }
      if (options.initialPath && typeof existing.navigateTo === "function") {
        existing.navigateTo(options.initialPath);
      }
      focusWindow(appId);
      return existing;
    }
  }

  const instanceId = SINGLETON_APPS.includes(appId)
    ? appId
    : `${appId}::${++instanceCounter}`;

  const el = document.createElement("div");
  el.className = "window";
  el.dataset.instanceId = instanceId;
  el.dataset.appId = appId;

  const width = options.width || 720;
  const height = options.height || 480;
  const offset = openWindows.size * 28;
  el.style.width = width + "px";
  el.style.height = height + "px";
  el.style.left = 80 + offset + "px";
  el.style.top = 40 + offset + "px";
  el.style.zIndex = ++zIndexCounter;

  const title = options.title || app.name;
  el.innerHTML = `
    <div class="window-titlebar">
      <div class="window-title">${title}</div>
      <div class="window-controls">
        <button class="wc wc-minimize" title="Minimize"></button>
        <button class="wc wc-maximize" title="Maximize"></button>
        <button class="wc wc-close"    title="Close"></button>
      </div>
    </div>
    <div class="window-body"></div>
  `;

  const body = el.querySelector(".window-body");
  const win = {
    instanceId,
    appId,
    el,
    body,
    minimized: false,
    maximized: false,
    options,
    title,
  };
  openWindows.set(instanceId, win);

  el.querySelector(".wc-close").addEventListener("click", (e) => {
    e.stopPropagation();
    closeWindow(instanceId);
  });
  el.querySelector(".wc-minimize").addEventListener("click", (e) => {
    e.stopPropagation();
    minimizeWindow(instanceId);
  });
  el.querySelector(".wc-maximize").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMaximize(instanceId);
  });

  el.addEventListener("mousedown", () => focusWindow(instanceId), true);
  setupDrag(el, el.querySelector(".window-titlebar"));
  setupResizeHandles(el);

  mountApp(appId, body, win, options);

  windowsLayer.appendChild(el);
  focusWindow(instanceId);
  return win;
}

export async function closeWindow(instanceId) {
  const win = openWindows.get(instanceId);
  if (!win) return;

  if (win.beforeClose) {
    const result = await win.beforeClose();
    if (result === false) return;
  }

  if (win.onClose) win.onClose();

  win.el.remove();
  openWindows.delete(instanceId);

  if (focusedInstanceId === instanceId) {
    focusedInstanceId = null;
    let top = null;
    for (const w of openWindows.values()) {
      if (!top || Number(w.el.style.zIndex) > Number(top.el.style.zIndex))
        top = w;
    }
    if (top) focusWindow(top.instanceId);
    else updateTopbar();
  }
  renderDock();
}

export function minimizeWindow(instanceId) {
  const win = openWindows.get(instanceId);
  if (!win) return;
  win.minimized = true;
  win.el.style.display = "none";
  if (focusedInstanceId === instanceId) focusedInstanceId = null;
  renderDock();
  updateTopbar();
}

export function toggleMaximize(instanceId) {
  const win = openWindows.get(instanceId);
  if (!win) return;
  const el = win.el;

  if (win.maximized) {
    Object.assign(el.style, win.savedStyle);
    win.maximized = false;
  } else {
    win.savedStyle = {
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      height: el.style.height,
    };
    Object.assign(el.style, {
      left: "8px",
      top: "8px",
      width: "calc(100% - 16px)",
      height: "calc(100% - 16px)",
    });
    win.maximized = true;
  }
}

/* ============================================================
   Drag
   ============================================================ */
function setupDrag(winEl, handleEl) {
  let dragging = false,
    sx = 0,
    sy = 0,
    sl = 0,
    st = 0;

  handleEl.addEventListener("mousedown", (e) => {
    if (e.target.closest(".window-controls")) return;
    if (openWindows.get(winEl.dataset.instanceId)?.maximized) return;
    dragging = true;
    sx = e.clientX;
    sy = e.clientY;
    sl = parseInt(winEl.style.left) || 0;
    st = parseInt(winEl.style.top) || 0;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "move";
    e.preventDefault();
  });

  function onMove(e) {
    if (!dragging) return;
    let nl = sl + (e.clientX - sx);
    let nt = st + (e.clientY - sy);
    nl = Math.max(
      -(winEl.offsetWidth - 100),
      Math.min(window.innerWidth - 100, nl)
    );
    nt = Math.max(
      -(winEl.offsetHeight - 60),
      Math.min(window.innerHeight - 60, nt)
    );
    winEl.style.left = nl + "px";
    winEl.style.top = nt + "px";
  }

  function onUp() {
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.body.style.cursor = "";
  }
}

/* ============================================================
   Resize
   ============================================================ */
function setupResizeHandles(winEl) {
  const directions = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  for (const dir of directions) {
    const handle = document.createElement("div");
    handle.className = `resize-handle resize-${dir}`;
    winEl.appendChild(handle);
    setupResize(winEl, handle, dir);
  }
}

function setupResize(winEl, handleEl, direction) {
  let resizing = false;
  let startX = 0,
    startY = 0;
  let startLeft = 0,
    startTop = 0,
    startWidth = 0,
    startHeight = 0;

  handleEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const win = openWindows.get(winEl.dataset.instanceId);
    if (win?.maximized) return;

    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(winEl.style.left) || 0;
    startTop = parseInt(winEl.style.top) || 0;
    startWidth = winEl.offsetWidth;
    startHeight = winEl.offsetHeight;

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = getComputedStyle(handleEl).cursor;

    focusWindow(winEl.dataset.instanceId);
  });

  function onMove(e) {
    if (!resizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = startLeft;
    let newTop = startTop;
    let newWidth = startWidth;
    let newHeight = startHeight;

    /* --- شرق: يزيد العرض --- */
    if (direction.includes("e")) {
      newWidth = Math.max(MIN_WIDTH, startWidth + dx);
    }

    /* --- جنوب: يزيد الارتفاع --- */
    if (direction.includes("s")) {
      newHeight = Math.max(MIN_HEIGHT, startHeight + dy);
    }

    /* --- غرب: يحرك اليسار + يعكس العرض --- */
    if (direction.includes("w")) {
      const maxDx = startWidth - MIN_WIDTH; // أقصى إزاحة لليمين
      let realDx = Math.min(dx, maxDx);
      // امنع الحافة اليسرى من الخروج التام (handle يفضل ظاهر)
      realDx = Math.max(realDx, -2 - startLeft);
      newLeft = startLeft + realDx;
      newWidth = startWidth - realDx;
    }

    /* --- شمال: يحرك الأعلى + يعكس الارتفاع --- */
    if (direction.includes("n")) {
      const maxDy = startHeight - MIN_HEIGHT;
      let realDy = Math.min(dy, maxDy);
      realDy = Math.max(realDy, -2 - startTop);
      newTop = startTop + realDy;
      newHeight = startHeight - realDy;
    }

    winEl.style.left = newLeft + "px";
    winEl.style.top = newTop + "px";
    winEl.style.width = newWidth + "px";
    winEl.style.height = newHeight + "px";
  }

  function onUp() {
    resizing = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.body.style.cursor = "";
  }
}

/* ============================================================
   Mount apps
   ============================================================ */
function mountApp(appId, body, win, options) {
  switch (appId) {
    case "terminal":
      createTerminal(body, win, options);
      break;
    case "files":
      createFiles(body, win);
      break;
    case "editor":
      createEditor(body, win, options);
      break;
    case "notes":
      createNotes(body, win);
      break;
    case "settings":
      createSettings(body, win);
      break;
    case "store":
      createStore(body, win);
      break;
    case "calculator":
      createCalculator(body, win);
      break;
    case "clock":
      createClock(body, win);
      break;
    case "snake":
      createSnake(body, win);
      break;
    default:
      body.innerHTML = `
          <div class="coming-soon">
            <div class="big">${APPS[appId].icon}</div>
            <div>${APPS[appId].name} — Coming soon</div>
          </div>
        `;
  }
}
