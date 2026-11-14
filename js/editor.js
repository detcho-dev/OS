import { getNode } from "./vfs.js";
import { toast, showPrompt, showConfirm } from "./notifications.js";

export function createEditor(container, win, options = {}) {
  const filePath = options.filePath || "";
  const pathParts = filePath.split("/").filter(Boolean);

  let fileNode = pathParts.length ? getNode(pathParts) : null;

  if (filePath && !fileNode) {
    container.innerHTML = `<div class="coming-soon"><div>File not found: ${escapeHtml(
      filePath
    )}</div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="editor-app">
      <div class="editor-toolbar">
        <div class="editor-path">${escapeHtml(filePath || "Untitled")}</div>
        <button class="editor-btn primary" data-action="save">Save</button>
      </div>
      <textarea class="editor-textarea" spellcheck="false"></textarea>
      <div class="editor-status">
        <span class="editor-status-text">Ready</span>
      </div>
    </div>
  `;

  const $textarea = container.querySelector(".editor-textarea");
  const $save = container.querySelector('[data-action="save"]');
  const $status = container.querySelector(".editor-status-text");

  $textarea.value = fileNode ? fileNode.content || "" : "";

  let isDirty = false;

  function markDirty() {
    if (isDirty) return;
    isDirty = true;
    $status.innerHTML = '<span class="dirty">● Unsaved changes</span>';
  }

  function markClean(msg = "Saved") {
    isDirty = false;
    $status.textContent = msg;
  }

  async function save() {
    if (!fileNode) {
      const name = await showPrompt("Save As", "Filename:", "untitled.txt");
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      const home = getNode(["home", "user"]);
      if (!home) return;

      if (home.children[trimmed]) {
        toast.error("A file with that name already exists");
        return;
      }

      home.children[trimmed] = { type: "file", content: $textarea.value };
      fileNode = home.children[trimmed];
      markClean("Saved to ~/" + trimmed);
      toast.success("Saved to ~/" + trimmed);
      return;
    }

    fileNode.content = $textarea.value;
    markClean();
    toast.success("Saved");
  }

  $textarea.addEventListener("input", markDirty);
  $save.addEventListener("click", save);

  $textarea.addEventListener("keydown", (e) => {
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const start = $textarea.selectionStart;
      const end = $textarea.selectionEnd;
      $textarea.value =
        $textarea.value.slice(0, start) + "  " + $textarea.value.slice(end);
      $textarea.selectionStart = $textarea.selectionEnd = start + 2;
    }
  });

  win.beforeClose = async () => {
    if (!isDirty) return true;
    return await showConfirm(
      "Unsaved Changes",
      "You have unsaved changes. Close anyway?",
      { danger: true, okText: "Close anyway", cancelText: "Keep editing" }
    );
  };

  setTimeout(() => $textarea.focus(), 30);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
