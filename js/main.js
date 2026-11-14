import { renderDock } from "./dock.js";
import { renderTopbarIndicators, startClock, updateTopbar } from "./topbar.js";
import { applyWorkspaceWallpaper, updateWorkspaceUI } from "./workspaces.js";
import { loadSettings, applyAccent, onChange } from "./settings-store.js";
import { loadInstalledApps } from "./store-registry.js";
import { togglePalette } from "./palette.js";
import { getUser, hasValidSession, isStorageAvailable } from "./auth-store.js";

async function bootstrap() {
  loadSettings();
  applyAccent();
  loadInstalledApps();

  /* ----- Auth Gate ----- */
  if (isStorageAvailable()) {
    const user = getUser();
    const hasSession = hasValidSession();

    if (!user) {
      const { showSetupScreen } = await import("./auth.js");
      await showSetupScreen();
    } else if (!hasSession) {
      const { showLoginScreen } = await import("./auth.js");
      await showLoginScreen();
    }
  }

  /* ----- Init Desktop ----- */
  onChange("wallpaper", applyWorkspaceWallpaper);
  renderDock();
  renderTopbarIndicators();
  startClock();
  applyWorkspaceWallpaper();
  updateWorkspaceUI();
  updateTopbar();

  /* ----- Keyboard Shortcuts ----- */
  document.addEventListener("keydown", (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.code === "Space" || e.key === "k" || e.key === "K")
    ) {
      e.preventDefault();
      togglePalette();
      return;
    }
    if (e.key === "Escape") {
      import("./appgrid.js").then((m) => m.toggleAppGrid(false));
    }
  });
}

bootstrap();
