import { SVG } from "./icons.js";

export const CATALOG = [
  /* ---------- Builtin (installed by default) ---------- */
  {
    id: "terminal",
    builtin: true,
    category: "System",
    name: "Terminal",
    icon: SVG.terminal,
    tint: "linear-gradient(135deg, #3a3a4a, #1f1f2e)",
    desc: "Full command line with VFS integration",
    longDesc:
      "A complete terminal with 15+ commands: ls, cd, cat, mkdir, edit, open, tree, and more. Shares the same virtual file system with Files, Editor and Notes.",
    developer: "WebOS",
    version: "1.0.0",
    size: "2.1 MB",
  },

  {
    id: "files",
    builtin: true,
    category: "System",
    name: "Files",
    icon: SVG.files,
    tint: "linear-gradient(135deg, #f97316, #c2410c)",
    desc: "Browse, rename, and manage files",
    longDesc:
      "A dual-pane file browser with context menus, keyboard shortcuts, and full VFS integration. Right-click for rename, delete, new file, and more.",
    developer: "WebOS",
    version: "1.2.0",
    size: "1.8 MB",
  },

  {
    id: "notes",
    builtin: true,
    category: "Productivity",
    name: "Notes",
    icon: SVG.notes,
    tint: "linear-gradient(135deg, #fbbf24, #d97706)",
    desc: "Auto-saving sticky notes",
    longDesc:
      "Write notes that auto-save every 500ms to the shared file system. Access them from Terminal with cat or from Editor with edit.",
    developer: "WebOS",
    version: "1.0.0",
    size: "1.2 MB",
  },

  {
    id: "settings",
    builtin: true,
    category: "System",
    name: "Settings",
    icon: SVG.settings,
    tint: "linear-gradient(135deg, #64748b, #334155)",
    desc: "Wallpapers, accent color, clock",
    longDesc:
      "Customize your desktop: 7 wallpapers, 6 accent colors, clock format, and system info.",
    developer: "WebOS",
    version: "0.9.0",
    size: "900 KB",
  },

  {
    id: "editor",
    builtin: true,
    category: "Productivity",
    name: "Text Editor",
    icon: SVG.editor,
    tint: "linear-gradient(135deg, #3b82f6, #1e40af)",
    desc: "Edit any text file",
    longDesc:
      "A monospace text editor with Ctrl+S to save, tab indentation, and confirmation on close with unsaved changes.",
    developer: "WebOS",
    version: "1.0.0",
    size: "1.1 MB",
  },

  {
    id: "store",
    builtin: true,
    category: "System",
    name: "App Store",
    icon: SVG.store,
    tint: "linear-gradient(135deg, #06b6d4, #0891b2)",
    desc: "Discover and install apps",
    longDesc:
      "Browse the catalog of apps, install them with one click, and uninstall apps you no longer need. Installed apps appear in the App Grid automatically.",
    developer: "WebOS",
    version: "0.5.0",
    size: "1.5 MB",
  },

  /* ---------- Installable ---------- */
  {
    id: "calculator",
    builtin: false,
    category: "Utilities",
    featured: true,
    name: "Calculator",
    icon: SVG.calculator,
    tint: "linear-gradient(135deg, #475569, #1e293b)",
    desc: "Fast and keyboard-friendly calculator",
    longDesc:
      "A full-featured calculator with history, keyboard support (0-9, +, -, *, /, Enter), and clean design. Works with mouse or keyboard.",
    developer: "WebOS",
    version: "1.0.0",
    size: "400 KB",
  },

  {
    id: "clock",
    builtin: false,
    category: "Utilities",
    name: "World Clock",
    icon: SVG.clock,
    tint: "linear-gradient(135deg, #a855f7, #7c3aed)",
    desc: "Track time across the world",
    longDesc:
      "An analog clock plus digital times for cities around the world. Add or remove cities, respects your 12/24-hour setting from Settings.",
    developer: "WebOS",
    version: "1.0.0",
    size: "500 KB",
  },

  {
    id: "snake",
    builtin: false,
    category: "Games",
    featured: true,
    name: "Snake",
    icon: SVG.snake,
    tint: "linear-gradient(135deg, #22c55e, #16a34a)",
    desc: "The classic snake game",
    longDesc:
      "Eat food, grow longer, avoid walls and yourself. Score is saved between games. Arrow keys or WASD to move, space to pause.",
    developer: "WebOS",
    version: "1.0.0",
    size: "600 KB",
  },

  /* ---------- Coming soon ---------- */
  {
    id: "weather",
    builtin: false,
    category: "Utilities",
    comingSoon: true,
    name: "Weather",
    icon: SVG.weather,
    tint: "linear-gradient(135deg, #0ea5e9, #0284c7)",
    desc: "Live weather forecast",
    longDesc: "Get current weather and 7-day forecast for your location.",
    developer: "WebOS",
    version: "0.0.0",
    size: "—",
  },

  {
    id: "paint",
    builtin: false,
    category: "Graphics",
    comingSoon: true,
    name: "Paint",
    icon: SVG.paint,
    tint: "linear-gradient(135deg, #f43f5e, #be123c)",
    desc: "Simple drawing app",
    longDesc:
      "Draw with different brush sizes and colors, save to the file system.",
    developer: "WebOS",
    version: "0.0.0",
    size: "—",
  },

  {
    id: "music",
    builtin: false,
    category: "Multimedia",
    comingSoon: true,
    name: "Music",
    icon: SVG.music,
    tint: "linear-gradient(135deg, #f97316, #ea580c)",
    desc: "Play music files",
    longDesc: "Browse and play music files from the virtual file system.",
    developer: "WebOS",
    version: "0.0.0",
    size: "—",
  },
  { id: 'codestudio', builtin: false, category: 'Development', featured: true,
  name: 'Code Studio', icon: SVG.codestudio,
  tint: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  desc: 'HTML, CSS & JS editor with live preview',
  longDesc: 'A full code editor with HTML, CSS, and JS tabs, live preview, and instant testing. Save projects to your virtual file system and open them in the Browser.',
  developer: 'WebOS', version: '1.0.0', size: '800 KB' },

{ id: 'browser', builtin: false, category: 'Internet', featured: true,
  name: 'Browser', icon: SVG.browser,
  tint: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  desc: 'View websites you build',
  longDesc: 'A browser that opens HTML files from your virtual file system and (when possible) external websites. Bookmarks, history, back/forward navigation.',
  developer: 'WebOS', version: '1.0.0', size: '600 KB' },
];
