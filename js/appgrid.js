import { APPS } from "./apps.js";
import { createWindow } from "./window-manager.js";

const $appGrid = document.getElementById("appGrid");
const $appGridItems = document.getElementById("appGridItems");
const $appSearch = document.getElementById("appSearch");

export function renderAppGrid(filter = "") {
  const q = filter.trim().toLowerCase();
  $appGridItems.innerHTML = "";

  const matches = Object.entries(APPS).filter(
    ([id, app]) =>
      !q ||
      app.name.toLowerCase().includes(q) ||
      app.desc.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    $appGridItems.innerHTML = `<div class="app-grid-empty">No apps match "${filter}"</div>`;
    return;
  }

  for (const [id, app] of matches) {
    const tile = document.createElement("div");
    tile.className = "app-tile";
    tile.innerHTML = `
      <div class="glyph" style="background:${app.tint}">${app.icon}</div>
      <div class="label">${app.name}</div>`;
    tile.addEventListener("click", () => {
      toggleAppGrid(false);
      createWindow(id);
    });
    $appGridItems.appendChild(tile);
  }
}

export function toggleAppGrid(show) {
  const shouldOpen =
    show !== undefined ? show : !$appGrid.classList.contains("open");
  $appGrid.classList.toggle("open", shouldOpen);
  if (shouldOpen) {
    renderAppGrid($appSearch.value);
    setTimeout(() => $appSearch.focus(), 50);
  } else {
    $appSearch.value = "";
  }
}

// wiring
$appSearch.addEventListener("input", () => renderAppGrid($appSearch.value));
$appGrid.addEventListener("click", (e) => {
  if (e.target === $appGrid) toggleAppGrid(false);
});
document
  .getElementById("activitiesBtn")
  .addEventListener("click", () => toggleAppGrid());
