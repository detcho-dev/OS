let currentMenu = null;
let currentCleanup = null;

export function showContextMenu(x, y, items) {
  closeContextMenu();

  const menu = document.createElement("div");
  menu.className = "ctx-menu";

  for (const item of items) {
    if (item === "separator" || item?.type === "separator") {
      const sep = document.createElement("div");
      sep.className = "ctx-separator";
      menu.appendChild(sep);
    } else if (item?.type === "header") {
      const h = document.createElement("div");
      h.className = "ctx-header";
      h.textContent = item.label;
      menu.appendChild(h);
    } else {
      const row = document.createElement("div");
      row.className = "ctx-item" + (item.disabled ? " disabled" : "");
      row.innerHTML = `
        <div class="ctx-icon">${item.icon || ""}</div>
        <span class="ctx-label">${item.label}</span>
        ${
          item.shortcut
            ? `<span class="ctx-shortcut">${item.shortcut}</span>`
            : ""
        }
      `;
      if (!item.disabled && item.action) {
        row.addEventListener("click", (e) => {
          e.stopPropagation();
          closeContextMenu();
          item.action();
        });
      }
      menu.appendChild(row);
    }
  }

  // measure without transform to get accurate size
  menu.style.transform = "none";
  menu.style.left = "0px";
  menu.style.top = "0px";
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.transform = "";

  let px = x;
  let py = y;
  if (px + rect.width > window.innerWidth - 8)
    px = window.innerWidth - rect.width - 8;
  if (py + rect.height > window.innerHeight - 8)
    py = window.innerHeight - rect.height - 8;
  if (px < 8) px = 8;
  if (py < 8) py = 8;

  menu.style.left = px + "px";
  menu.style.top = py + "px";

  currentMenu = menu;
  requestAnimationFrame(() => menu.classList.add("open"));

  // close on outside mousedown or Escape
  const onClick = (e) => {
    if (!menu.contains(e.target)) closeContextMenu();
  };
  const onKey = (e) => {
    if (e.key === "Escape") closeContextMenu();
  };
  setTimeout(() => {
    document.addEventListener("mousedown", onClick, true);
    document.addEventListener("keydown", onKey, true);
  }, 0);

  currentCleanup = () => {
    document.removeEventListener("mousedown", onClick, true);
    document.removeEventListener("keydown", onKey, true);
  };
}

export function closeContextMenu() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
  }
}
