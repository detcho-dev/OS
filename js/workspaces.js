import { getSetting, WALLPAPERS } from "./settings-store.js";

const $desktop = document.getElementById("desktop");
const $workspaces = document.getElementById("workspaces");

export const WS_TINTS = [
  {
    c1: "rgba(233,84,32,0.34)",
    c2: "rgba(119,41,83,0.55)",
    c3: "rgba(233,84,32,0.10)",
    bg1: "#2c001e",
    bg2: "#1a0d15",
    bg3: "#3b0a1f",
  },
  {
    c1: "rgba(59,130,246,0.34)",
    c2: "rgba(37,99,235,0.50)",
    c3: "rgba(59,130,246,0.10)",
    bg1: "#0a1832",
    bg2: "#0a0d1a",
    bg3: "#0a1a3a",
  },
  {
    c1: "rgba(34,197,94,0.32)",
    c2: "rgba(21,128,61,0.55)",
    c3: "rgba(34,197,94,0.10)",
    bg1: "#0a2c1a",
    bg2: "#0a1a10",
    bg3: "#0a3a1a",
  },
  {
    c1: "rgba(251,191,36,0.32)",
    c2: "rgba(180,83,9,0.55)",
    c3: "rgba(251,191,36,0.10)",
    bg1: "#2c1800",
    bg2: "#1a0f00",
    bg3: "#3a1f00",
  },
];

let currentWS = 0;
export function getCurrentWS() {
  return currentWS;
}

export function applyWorkspaceWallpaper() {
  const wallpaper = getSetting("wallpaper");
  let colors;
  if (wallpaper === "auto" || !WALLPAPERS[wallpaper]?.colors) {
    colors = WS_TINTS[currentWS];
  } else {
    colors = WALLPAPERS[wallpaper].colors;
  }

  $desktop.style.setProperty("--ws-c1", colors.c1);
  $desktop.style.setProperty("--ws-c2", colors.c2);
  $desktop.style.setProperty("--ws-c3", colors.c3);
  $desktop.style.setProperty("--ws-bg1", colors.bg1);
  $desktop.style.setProperty("--ws-bg2", colors.bg2);
  $desktop.style.setProperty("--ws-bg3", colors.bg3);
}

export function updateWorkspaceUI() {
  document.querySelectorAll(".ws-dot").forEach((dot) => {
    dot.classList.toggle("active", Number(dot.dataset.ws) === currentWS);
  });
}

export function switchWorkspace(index) {
  if (index === currentWS) return;
  currentWS = index;
  applyWorkspaceWallpaper();
  updateWorkspaceUI();
}

$workspaces.addEventListener("click", (e) => {
  const dot = e.target.closest(".ws-dot");
  if (!dot) return;
  switchWorkspace(Number(dot.dataset.ws));
});
