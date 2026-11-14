import { getNode } from "./vfs.js";
import {
  createWindow,
  focusWindow,
  getWindowsByApp,
  getFocusedInstance,
} from "./window-manager.js";
import { showContextMenu, closeContextMenu } from "./context-menu.js";
import { toast, showConfirm, showPrompt, showAlert } from "./notifications.js";

/* ---------- File icons ---------- */
const FILE_ICONS = {
  folder: `<svg viewBox="0 0 64 64">
    <path d="M6 18 C6 15.8 7.8 14 10 14 H24 L30 20 H54 C56.2 20 58 21.8 58 24 V48 C58 50.2 56.2 52 54 52 H10 C7.8 52 6 50.2 6 48 Z" fill="#e9a23b"/>
    <path d="M6 26 H58 V48 C58 50.2 56.2 52 54 52 H10 C7.8 52 6 50.2 6 48 Z" fill="#f7b955"/>
  </svg>`,

  file: `<svg viewBox="0 0 64 64">
    <path d="M14 8 H38 L50 20 V56 C50 57.1 49.1 58 48 58 H14 C12.9 58 12 57.1 12 56 V10 C12 8.9 12.9 8 14 8 Z" fill="#e8e8ea"/>
    <path d="M38 8 L50 20 H40 C38.9 20 38 19.1 38 18 Z" fill="#b8b8bc"/>
    <line x1="20" y1="28" x2="42" y2="28" stroke="#909094" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="36" x2="42" y2="36" stroke="#909094" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="44" x2="34" y2="44" stroke="#909094" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  code: `<svg viewBox="0 0 64 64">
    <path d="M14 8 H38 L50 20 V56 C50 57.1 49.1 58 48 58 H14 C12.9 58 12 57.1 12 56 V10 C12 8.9 12.9 8 14 8 Z" fill="#e8e8ea"/>
    <path d="M38 8 L50 20 H40 C38.9 20 38 19.1 38 18 Z" fill="#b8b8bc"/>
    <path d="M22 32 L18 36 L22 40 M42 32 L46 36 L42 40" stroke="#e95420" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
};

/* ---------- Context menu icons ---------- */
const CTX = {
  open: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>`,
  terminal: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 5 L6 8 L3 11"/><path d="M8 11 H13"/></svg>`,
  rename: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 2 L14 5 L5 14 H2 V11 Z"/></svg>`,
  delete: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 4 H14"/><path d="M5 4 V2 H11 V4"/><path d="M3 4 L4 14 H12 L13 4"/></svg>`,
  info: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"/><path d="M8 7.5 V11"/><circle cx="8" cy="5" r="0.6" fill="currentColor"/></svg>`,
  newFile: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 2 H10 L13 5 V13 H3 Z"/><path d="M8 8 V11 M6.5 9.5 H9.5"/></svg>`,
  newFolder: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 4 C2 3 2.5 2.5 3 2.5 H6 L7.5 4 H13 C13.5 4 14 4.5 14 5 V12 C14 13 13.5 13.5 13 13.5 H3 C2.5 13.5 2 13 2 12 Z"/>
    <path d="M8 7 V11 M6 9 H10"/></svg>`,
  refresh: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13.5 8 C13.5 11 11 13.5 8 13.5 C5 13.5 2.5 11 2.5 8 C2.5 5 5 2.5 8 2.5 C10.3 2.5 12.2 3.9 13.1 5.8"/>
    <path d="M13.5 2 V6 H9.5"/></svg>`,
};

const SIDEBAR_ITEMS = [
  {
    label: "Home",
    path: ["home", "user"],
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 L12 4 L21 12 V20 C21 20.6 20.6 21 20 21 H15 V15 H9 V21 H4 C3.4 21 3 20.6 3 20 Z"/></svg>`,
  },
  {
    label: "Projects",
    path: ["home", "user", "projects"],
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7 C3 6 4 5 5 5 H9 L11 7 H19 C20 7 21 8 21 9 V18 C21 19 20 20 19 20 H5 C4 20 3 19 3 18 Z"/></svg>`,
  },
  {
    label: "etc",
    path: ["etc"],
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2 V4 M12 20 V22 M4 12 H2 M22 12 H20 M6 6 L4 4 M20 20 L18 18 M6 18 L4 20 M20 4 L18 6"/></svg>`,
  },
  {
    label: "tmp",
    path: ["tmp"],
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6 V20 C19 21 18 22 17 22 H7 C6 22 5 21 5 20 V6"/></svg>`,
  },
];

export function createFiles(container, win) {
  let currentPath = ["home", "user"];
  const history = [currentPath.slice()];
  let historyIndex = 0;
  let selectedName = null;

  container.innerHTML = `
    <div class="files-app">
      <aside class="files-sidebar"></aside>
      <div class="files-main">
        <div class="files-toolbar">
          <button class="files-btn" data-action="back"    title="Back">←</button>
          <button class="files-btn" data-action="forward" title="Forward">→</button>
          <button class="files-btn" data-action="up"      title="Up">↑</button>
          <div class="files-path"></div>
          <button class="files-btn" data-action="new-folder" title="New Folder">+</button>
        </div>
        <div class="files-grid"></div>
        <div class="files-status"></div>
      </div>
    </div>
  `;

  const $sidebar = container.querySelector(".files-sidebar");
  const $path = container.querySelector(".files-path");
  const $grid = container.querySelector(".files-grid");
  const $status = container.querySelector(".files-status");
  const $back = container.querySelector('[data-action="back"]');
  const $forward = container.querySelector('[data-action="forward"]');
  const $up = container.querySelector('[data-action="up"]');
  const $newFolder = container.querySelector('[data-action="new-folder"]');

  /* ---------- Sidebar ---------- */
  function renderSidebar() {
    $sidebar.innerHTML = `<div class="files-sidebar-title">Quick Access</div>`;
    for (const item of SIDEBAR_ITEMS) {
      const btn = document.createElement("button");
      btn.className =
        "files-sidebar-item" +
        (arraysEqual(item.path, currentPath) ? " active" : "");
      btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
      btn.addEventListener("click", () => navigateTo(item.path));
      $sidebar.appendChild(btn);
    }
  }

  /* ---------- Toolbar ---------- */
  function updateToolbar() {
    $back.disabled = historyIndex === 0;
    $forward.disabled = historyIndex === history.length - 1;
    $up.disabled = currentPath.length === 0;
    $path.textContent = "/" + currentPath.join(" / ");
    $path.title = "/" + currentPath.join("/");
  }

  /* ---------- Grid ---------- */
  function renderGrid() {
    const node = getNode(currentPath);
    $grid.innerHTML = "";

    if (!node || node.type !== "dir") {
      $grid.innerHTML = `<div class="files-empty">Not a directory</div>`;
      return;
    }

    const names = Object.keys(node.children || {}).sort((a, b) => {
      const aDir = node.children[a].type === "dir";
      const bDir = node.children[b].type === "dir";
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.localeCompare(b);
    });

    if (names.length === 0) {
      $grid.innerHTML = `<div class="files-empty">This folder is empty</div>`;
      $status.textContent = "0 items";
      return;
    }

    for (const name of names) {
      const child = node.children[name];
      const isDir = child.type === "dir";
      const icon = isDir ? FILE_ICONS.folder : getFileIcon(name);

      const item = document.createElement("div");
      item.className =
        "files-item" + (selectedName === name ? " selected" : "");
      item.dataset.name = name;
      item.innerHTML = `
        <div class="files-icon">${icon}</div>
        <div class="files-name">${escapeHtml(name)}</div>
      `;

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedName = name;
        renderGrid();
      });

      item.addEventListener("dblclick", () => {
        if (isDir) navigateTo([...currentPath, name]);
        else openFile([...currentPath, name]);
      });

      $grid.appendChild(item);
    }

    const dirs = names.filter((n) => node.children[n].type === "dir").length;
    const files = names.length - dirs;
    $status.textContent = `${dirs} folder${
      dirs !== 1 ? "s" : ""
    }, ${files} file${files !== 1 ? "s" : ""}`;
  }

  /* ---------- Navigation ---------- */
  function navigateTo(path) {
    const node = getNode(path);
    if (!node || node.type !== "dir") return;
    if (arraysEqual(path, currentPath)) return;

    currentPath = path.slice();
    selectedName = null;

    history.splice(historyIndex + 1);
    history.push(currentPath.slice());
    historyIndex = history.length - 1;

    renderAll();
  }

  function renderAll() {
    closeContextMenu();
    renderSidebar();
    updateToolbar();
    renderGrid();
  }

  /* ---------- File operations ---------- */
  function openFile(pathParts) {
    const node = getNode(pathParts);
    if (!node || node.type === "dir") return;

    const fullPath = "/" + pathParts.join("/");

    // focus existing editor window for the same file
    for (const w of getWindowsByApp("editor")) {
      if (w.options?.filePath === fullPath) {
        if (w.minimized) {
          w.minimized = false;
          w.el.style.display = "flex";
        }
        focusWindow(w.instanceId);
        return;
      }
    }

    createWindow("editor", {
      filePath: fullPath,
      title: pathParts[pathParts.length - 1],
    });
  }

  function openInTerminal(pathParts) {
    createWindow("terminal", { initialPath: pathParts });
  }

  async function renameItem(oldName) {
    const newName = await showPrompt(
      "Rename",
      `Rename "${oldName}" to:`,
      oldName
    );
    if (!newName || newName === oldName) return;
    if (newName.includes("/") || newName.trim() === "") {
      toast.error("Invalid name");
      return;
    }
    const node = getNode(currentPath);
    if (!node) return;
    if (node.children[newName]) {
      toast.error("A file or folder with that name already exists");
      return;
    }
    node.children[newName] = node.children[oldName];
    delete node.children[oldName];
    if (selectedName === oldName) selectedName = newName;
    renderGrid();
    toast.success(`Renamed to "${newName}"`);
  }

  async function deleteItem(name) {
    const node = getNode(currentPath);
    if (!node) return;
    const child = node.children[name];
    if (!child) return;

    const isDir = child.type === "dir";
    const hasChildren = isDir && Object.keys(child.children).length > 0;
    const msg = hasChildren
      ? `Delete "${name}" and all its contents?`
      : `Delete "${name}"?`;

    const ok = await showConfirm("Delete", msg, {
      danger: true,
      okText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    delete node.children[name];
    if (selectedName === name) selectedName = null;
    renderGrid();
    toast.success(`Deleted "${name}"`);
  }

  async function newFile() {
    const name = await showPrompt("New File", "File name:", "");
    if (!name) return;
    if (name.includes("/") || name.trim() === "") {
      toast.error("Invalid name");
      return;
    }
    const node = getNode(currentPath);
    if (!node) return;
    if (node.children[name]) {
      toast.error("A file or folder with that name already exists");
      return;
    }
    node.children[name] = { type: "file", content: "" };
    selectedName = name;
    renderGrid();
    toast.success(`Created "${name}"`);
  }

  async function newFolder() {
    const name = await showPrompt("New Folder", "Folder name:", "");
    if (!name) return;
    if (name.includes("/") || name.trim() === "") {
      toast.error("Invalid name");
      return;
    }
    const node = getNode(currentPath);
    if (!node) return;
    if (node.children[name]) {
      toast.error("A file or folder with that name already exists");
      return;
    }
    node.children[name] = { type: "dir", children: {} };
    selectedName = name;
    renderGrid();
    toast.success(`Created "${name}"`);
  }

  function showProperties(name, child, fullPath) {
    const isDir = child.type === "dir";
    const pathStr = "/" + fullPath.join("/");
    const lines = [];
    lines.push(`Name: ${name}`);
    lines.push(`Type: ${isDir ? "Folder" : "Text file"}`);
    lines.push(`Path: ${pathStr}`);
    if (isDir) {
      lines.push(`Contents: ${Object.keys(child.children).length} item(s)`);
    } else {
      lines.push(`Size: ${(child.content || "").length} bytes`);
    }
    showAlert(name, lines.join("\n"), { type: "info" });
  }

  /* ---------- Context menus ---------- */
  function showItemContextMenu(e, name, child) {
    e.preventDefault();
    e.stopPropagation();

    if (selectedName !== name) {
      selectedName = name;
      renderGrid();
    }

    const isDir = child.type === "dir";
    const fullPath = [...currentPath, name];

    showContextMenu(e.clientX, e.clientY, [
      {
        label: "Open",
        icon: CTX.open,
        shortcut: "Enter",
        action: () => {
          if (isDir) navigateTo(fullPath);
          else openFile(fullPath);
        },
      },
      {
        label: "Open in Terminal",
        icon: CTX.terminal,
        action: () => openInTerminal(fullPath),
      },
      "separator",
      {
        label: "Rename…",
        icon: CTX.rename,
        shortcut: "F2",
        action: () => renameItem(name),
      },
      {
        label: "Delete",
        icon: CTX.delete,
        shortcut: "Del",
        action: () => deleteItem(name),
      },
      "separator",
      {
        label: "Properties",
        icon: CTX.info,
        action: () => showProperties(name, child, fullPath),
      },
    ]);
  }

  function showBackgroundContextMenu(e) {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      {
        label: "New File",
        icon: CTX.newFile,
        action: newFile,
      },
      {
        label: "New Folder",
        icon: CTX.newFolder,
        shortcut: "Ctrl+Shift+N",
        action: newFolder,
      },
      "separator",
      {
        label: "Refresh",
        icon: CTX.refresh,
        shortcut: "F5",
        action: () => renderAll(),
      },
    ]);
  }

  $grid.addEventListener("contextmenu", (e) => {
    const item = e.target.closest(".files-item");
    if (item) {
      const name = item.dataset.name;
      const node = getNode(currentPath);
      const child = node?.children[name];
      if (child) showItemContextMenu(e, name, child);
    } else {
      showBackgroundContextMenu(e);
    }
  });

  /* ---------- Toolbar wiring ---------- */
  $back.addEventListener("click", () => {
    if (historyIndex > 0) {
      historyIndex--;
      currentPath = history[historyIndex].slice();
      selectedName = null;
      renderAll();
    }
  });

  $forward.addEventListener("click", () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      currentPath = history[historyIndex].slice();
      selectedName = null;
      renderAll();
    }
  });

  $up.addEventListener("click", () => {
    if (currentPath.length > 0) navigateTo(currentPath.slice(0, -1));
  });

  $newFolder.addEventListener("click", newFolder);

  $grid.addEventListener("click", () => {
    if (selectedName) {
      selectedName = null;
      renderGrid();
    }
  });

  /* ---------- Keyboard shortcuts ---------- */
  function onKeyDown(e) {
    const focused = getFocusedInstance();
    if (!focused || focused.appId !== "files") return;
    if (!selectedName) {
      if (e.key === "F5") {
        e.preventDefault();
        renderAll();
      }
      return;
    }

    const node = getNode(currentPath);
    const child = node?.children[selectedName];

    if (e.key === "Delete") {
      e.preventDefault();
      deleteItem(selectedName);
    } else if (e.key === "F2") {
      e.preventDefault();
      renameItem(selectedName);
    } else if (e.key === "Enter" && child) {
      e.preventDefault();
      const fullPath = [...currentPath, selectedName];
      if (child.type === "dir") navigateTo(fullPath);
      else openFile(fullPath);
    } else if (e.key === "F5") {
      e.preventDefault();
      renderAll();
    }
  }
  document.addEventListener("keydown", onKeyDown);

  if (win) {
    win.onClose = () => {
      document.removeEventListener("keydown", onKeyDown);
      closeContextMenu();
    };
  }

  renderAll();
}

/* ---------- Helpers ---------- */
function getFileIcon(name) {
  if (/\.(js|ts|jsx|tsx|py|css|html|json|sh)$/i.test(name))
    return FILE_ICONS.code;
  return FILE_ICONS.file;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
