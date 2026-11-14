import { getNode } from "./vfs.js";
import { toast, showConfirm, showPrompt } from "./notifications.js";

const NOTES_FOLDER_NAME = "Notes";

/* ---------- folder helpers ---------- */
function ensureNotesFolder() {
  const home = getNode(["home", "user"]);
  if (!home) return null;

  if (!home.children[NOTES_FOLDER_NAME]) {
    home.children[NOTES_FOLDER_NAME] = { type: "dir", children: {} };
  }
  return home.children[NOTES_FOLDER_NAME];
}

function seedNotes(folder) {
  if (!folder) return;
  if (Object.keys(folder.children).length > 0) return;

  folder.children["Welcome.txt"] = {
    type: "file",
    content:
      "Welcome to WebOS Notes!\n\n" +
      "This is your first note — it saves automatically as you type.\n\n" +
      "Try:\n" +
      "  • Click + to create a new note\n" +
      "  • Type something and watch the status bar\n" +
      "  • Open Terminal and run:  ls ~/Notes\n" +
      "  • Or:  cat ~/Notes/Welcome.txt\n" +
      "  • Or:  edit ~/Notes/Welcome.txt\n\n" +
      "Notes live in the shared file system — they integrate with Files, Terminal and Editor.",
    modifiedAt: Date.now(),
  };
}

/* ---------- main ---------- */
export function createNotes(container, win) {
  const folder = ensureNotesFolder();
  if (!folder) {
    container.innerHTML = `<div class="coming-soon"><div>Notes folder unavailable</div></div>`;
    return;
  }
  seedNotes(folder);

  let currentNote = Object.keys(folder.children).sort()[0] || null;
  let saveTimer = null;
  let isDirty = false;

  container.innerHTML = `
    <div class="notes-app">
      <aside class="notes-sidebar">
        <div class="notes-sidebar-header">
          <span>Notes</span>
          <button class="notes-new-btn" title="New Note">+</button>
        </div>
        <div class="notes-list"></div>
      </aside>
      <div class="notes-main">
        <div class="notes-toolbar">
          <input class="notes-title" placeholder="Untitled" />
          <button class="notes-delete-btn" title="Delete note">Delete</button>
        </div>
        <textarea class="notes-textarea" placeholder="Start typing…" spellcheck="false"></textarea>
        <div class="notes-status">
          <span class="notes-status-text">Saved</span>
        </div>
      </div>
    </div>
  `;

  const $list = container.querySelector(".notes-list");
  const $title = container.querySelector(".notes-title");
  const $textarea = container.querySelector(".notes-textarea");
  const $status = container.querySelector(".notes-status-text");
  const $newBtn = container.querySelector(".notes-new-btn");
  const $deleteBtn = container.querySelector(".notes-delete-btn");

  /* ---------- list rendering ---------- */
  function renderList() {
    $list.innerHTML = "";
    const names = Object.keys(folder.children)
      .filter((n) => folder.children[n].type === "file")
      .sort();

    if (names.length === 0) {
      $list.innerHTML = `<div class="notes-empty">No notes yet</div>`;
      return;
    }

    for (const name of names) {
      const note = folder.children[name];
      const baseName = name.replace(/\.txt$/, "");
      const preview =
        (note.content || "").replace(/\s+/g, " ").trim().slice(0, 60) ||
        "Empty note";

      const item = document.createElement("div");
      item.className = "notes-item" + (name === currentNote ? " active" : "");
      item.innerHTML = `
        <div class="notes-item-name">${escapeHtml(baseName)}</div>
        <div class="notes-item-preview">${escapeHtml(preview)}</div>
      `;
      item.addEventListener("click", () => selectNote(name));
      $list.appendChild(item);
    }
  }

  /* ---------- selection ---------- */
  function selectNote(name) {
    flushSave();
    const note = folder.children[name];
    if (!note) return;

    currentNote = name;
    $title.value = name.replace(/\.txt$/, "");
    $textarea.value = note.content || "";
    setStatus("Saved", "saved");
    isDirty = false;
    renderList();
    setTimeout(() => $textarea.focus(), 30);
  }

  /* ---------- saving ---------- */
  function setStatus(text, cls) {
    $status.textContent = text;
    $status.className = "notes-status-text " + (cls || "");
  }

  function scheduleSave() {
    isDirty = true;
    setStatus("Editing…", "editing");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 500);
  }

  function flushSave() {
    if (!isDirty) return;
    clearTimeout(saveTimer);
    const note = currentNote ? folder.children[currentNote] : null;
    if (note) {
      note.content = $textarea.value;
      note.modifiedAt = Date.now();
    }
    isDirty = false;
    setStatus("Saved", "saved");
    renderList();
  }

  /* ---------- textarea ---------- */
  $textarea.addEventListener("input", scheduleSave);

  $textarea.addEventListener("keydown", (e) => {
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      flushSave();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const start = $textarea.selectionStart;
      const end = $textarea.selectionEnd;
      $textarea.value =
        $textarea.value.slice(0, start) + "  " + $textarea.value.slice(end);
      $textarea.selectionStart = $textarea.selectionEnd = start + 2;
      scheduleSave();
    }
  });

  /* ---------- title rename ---------- */
  $title.addEventListener("change", () => {
    if (!currentNote) return;
    let newBase = $title.value.trim();
    if (!newBase) {
      $title.value = currentNote.replace(/\.txt$/, "");
      return;
    }
    const newName = newBase.endsWith(".txt") ? newBase : newBase + ".txt";
    if (newName === currentNote) return;

    if (folder.children[newName]) {
      toast.error("A note with that name already exists");
      $title.value = currentNote.replace(/\.txt$/, "");
      return;
    }

    flushSave();
    folder.children[newName] = folder.children[currentNote];
    delete folder.children[currentNote];
    currentNote = newName;
    $title.value = newName.replace(/\.txt$/, "");
    renderList();
  });

  /* ---------- new note ---------- */
  $newBtn.addEventListener("click", async () => {
    let name = await showPrompt("New Note", "Note name:", "New Note");
    if (!name) return;
    name = name.trim();
    if (!name) return;

    const fileName = name.endsWith(".txt") ? name : name + ".txt";
    if (folder.children[fileName]) {
      toast.error("A note with that name already exists");
      return;
    }

    folder.children[fileName] = {
      type: "file",
      content: "",
      modifiedAt: Date.now(),
    };
    selectNote(fileName);
    toast.success(`Created "${name}"`);
  });
  /* ---------- delete note ---------- */
  $deleteBtn.addEventListener("click", async () => {
    if (!currentNote) return;
    const baseName = currentNote.replace(/\.txt$/, "");

    const ok = await showConfirm("Delete Note", `Delete "${baseName}"?`, {
      danger: true,
      okText: "Delete",
    });
    if (!ok) return;

    delete folder.children[currentNote];
    const names = Object.keys(folder.children)
      .filter((n) => folder.children[n].type === "file")
      .sort();

    if (names.length > 0) {
      selectNote(names[0]);
    } else {
      currentNote = null;
      $title.value = "";
      $textarea.value = "";
      setStatus("Saved", "saved");
      renderList();
    }
    toast.success(`Deleted "${baseName}"`);
  });

  /* ---------- flush on close ---------- */
  if (win) {
    win.beforeClose = () => {
      flushSave();
      return true;
    };
  }

  /* ---------- init ---------- */
  if (currentNote) selectNote(currentNote);
  else renderList();
}

/* ---------- helper ---------- */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
