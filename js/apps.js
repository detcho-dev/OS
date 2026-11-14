import { SVG } from "./icons.js";

const BUILTIN_APPS = {
  terminal: {
    name: "Terminal",
    icon: SVG.terminal,
    desc: "Command line",
    tint: "linear-gradient(135deg, #3a3a4a, #1f1f2e)",
  },
  files: {
    name: "Files",
    icon: SVG.files,
    desc: "Browse files",
    tint: "linear-gradient(135deg, #f97316, #c2410c)",
  },
  notes: {
    name: "Notes",
    icon: SVG.notes,
    desc: "Write notes",
    tint: "linear-gradient(135deg, #fbbf24, #d97706)",
  },
  settings: {
    name: "Settings",
    icon: SVG.settings,
    desc: "System settings",
    tint: "linear-gradient(135deg, #64748b, #334155)",
  },
  editor: {
    name: "Text Editor",
    icon: SVG.editor,
    desc: "Edit text files",
    tint: "linear-gradient(135deg, #3b82f6, #1e40af)",
  },
  store: {
    name: "App Store",
    icon: SVG.store,
    desc: "Discover apps",
    tint: "linear-gradient(135deg, #06b6d4, #0891b2)",
  },
};

export const APPS = { ...BUILTIN_APPS };

export function registerApp(appData) {
  APPS[appData.id] = appData;
}

export function unregisterApp(id) {
  if (BUILTIN_APPS[id]) return false;
  delete APPS[id];
  return true;
}

export function isBuiltinApp(id) {
  return !!BUILTIN_APPS[id];
}

export const PINNED = ["terminal", "files", "notes", "store", "settings"];
