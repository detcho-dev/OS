import { APPS, PINNED } from "./apps.js";
import { SVG } from "./icons.js";
import {
  createWindow,
  focusWindow,
  getWindowsByApp,
  getFocusedAppId,
} from "./window-manager.js";
import { toggleAppGrid } from "./appgrid.js";
import { toast } from "./notifications.js";

const $dockApps = document.getElementById("dockApps");
const $dockActions = document.getElementById("dockActions");

export function renderDock() {
  $dockApps.innerHTML = "";
  const focusedAppId = getFocusedAppId();

  for (const id of PINNED) {
    const app = APPS[id];
    const wins = getWindowsByApp(id);
    const running = wins.length > 0;
    const focused = focusedAppId === id;

    const btn = document.createElement("button");
    btn.className =
      "dock-item" + (running ? " running" : "") + (focused ? " focused" : "");
    btn.dataset.appId = id;
    btn.innerHTML = `
      <span class="indicator"></span>
      <div class="dock-glyph" style="background:${app.tint}">${app.icon}</div>
      <div class="tooltip">${app.name}</div>
    `;
    btn.addEventListener("click", () => onDockClick(id));
    $dockApps.appendChild(btn);
  }
  renderDockActions();
}

function renderDockActions() {
  $dockActions.innerHTML = "";

  const showBtn = document.createElement("button");
  showBtn.className = "dock-item";
  showBtn.innerHTML = `
    <div class="dock-glyph" style="background: rgba(255,255,255,0.10)">${SVG.apps}</div>
    <div class="tooltip">Show Applications</div>`;
  showBtn.addEventListener("click", () => toggleAppGrid());
  $dockActions.appendChild(showBtn);

  const trashBtn = document.createElement("button");
  trashBtn.className = "dock-item";
  trashBtn.innerHTML = `
    <div class="dock-glyph" style="background: rgba(255,255,255,0.10)">${SVG.trash}</div>
    <div class="tooltip">Trash</div>`;
  trashBtn.addEventListener("click", () => toast.info("Trash is empty"));
  $dockActions.appendChild(trashBtn);
}

function onDockClick(id) {
  const wins = getWindowsByApp(id);

  if (wins.length === 0) {
    createWindow(id);
    return;
  }

  // Focus topmost window of this app
  let top = null;
  for (const w of wins) {
    if (!top || Number(w.el.style.zIndex) > Number(top.el.style.zIndex))
      top = w;
  }
  if (top) {
    if (top.minimized) {
      top.minimized = false;
      top.el.style.display = "flex";
    }
    focusWindow(top.instanceId);
  }
}
