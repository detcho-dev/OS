import { APPS, registerApp, unregisterApp, isBuiltinApp } from "./apps.js";
import { CATALOG } from "./store-catalog.js";

const KEY = "webos.installed";

export function loadInstalledApps() {
  let ids = [];
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) ids = JSON.parse(stored);
  } catch (e) {}

  for (const id of ids) {
    if (APPS[id]) continue;
    const app = CATALOG.find((a) => a.id === id);
    if (app) registerApp(app);
  }
}

function persist() {
  const ids = Object.keys(APPS).filter((id) => !isBuiltinApp(id));
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch (e) {}
}

export function isInstalled(id) {
  return id in APPS;
}

export function installApp(id) {
  const app = CATALOG.find((a) => a.id === id);
  if (!app) return false;
  if (!APPS[id]) registerApp(app);
  persist();
  return true;
}

export function uninstallApp(id) {
  if (isBuiltinApp(id)) return false;
  const ok = unregisterApp(id);
  persist();
  return ok;
}
