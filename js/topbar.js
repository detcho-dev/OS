import { APPS } from "./apps.js";
import { getFocusedInstance } from "./window-manager.js";
import { renderStatusWidgets } from "./statusbar.js";

const $topbarApp = document.getElementById("topbarApp");
const $topbarClock = document.getElementById("topbarClock");
const $topbarIndic = document.getElementById("topbarIndicators");

export function updateTopbar() {
  const win = getFocusedInstance();
  if (win) {
    const appName = APPS[win.appId]?.name || win.appId;
    $topbarApp.textContent = win.title || appName;
  } else {
    $topbarApp.textContent = "WebOS";
  }
}

export function renderTopbarIndicators() {
  renderStatusWidgets($topbarIndic);
}

export function startClock() {
  function tick() {
    const now = new Date();
    const opts = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    $topbarClock.textContent = now.toLocaleString("en-US", opts);
  }
  tick();
  setInterval(tick, 1000);
}
