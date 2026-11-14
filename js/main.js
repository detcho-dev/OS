import { renderDock } from './dock.js';
import { renderTopbarIndicators, startClock, updateTopbar } from './topbar.js';
import { applyWorkspaceWallpaper, updateWorkspaceUI } from './workspaces.js';
import { loadSettings, applyAccent, onChange, getSetting } from './settings-store.js';
import { loadInstalledApps } from './store-registry.js';
import { togglePalette } from './palette.js';
import { getUser, isStorageAvailable } from './auth-store.js';

async function bootstrap() {
  loadSettings();
  applyAccent();
  loadInstalledApps();

  /* ===== Auth Gate ===== */
  if (isStorageAvailable()) {
    const user = getUser();

    if (!user) {
      // First time → setup + auto-enter
      const { showSetupScreen } = await import('./auth.js');
      await showSetupScreen();
    } else if (getSetting('requirePasswordOnStartup')) {
      // Returning → lock screen (OS-like boot)
      const { showLockScreenAuth } = await import('./auth.js');
      await showLockScreenAuth();
    }
    // else: auto-enter (user chose to skip)
  }

  /* ===== Init Desktop ===== */
  onChange('wallpaper', applyWorkspaceWallpaper);
  renderDock();
  renderTopbarIndicators();
  startClock();
  applyWorkspaceWallpaper();
  updateWorkspaceUI();
  updateTopbar();

  /* ===== Keyboard Shortcuts ===== */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      togglePalette();
      return;
    }
    if (e.key === 'Escape') {
      import('./appgrid.js').then(m => m.toggleAppGrid(false));
    }
  });
}

bootstrap();
