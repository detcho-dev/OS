import { renderDock } from './dock.js';
import { renderTopbarIndicators, startClock, updateTopbar } from './topbar.js';
import { applyWorkspaceWallpaper, updateWorkspaceUI } from './workspaces.js';
import { loadSettings, applyAccent, onChange, getSetting } from './settings-store.js';
import { loadInstalledApps } from './store-registry.js';
import { togglePalette } from './palette.js';
import { getUsers, hasCurrentUser, isStorageAvailable } from './auth-store.js';

async function bootstrap() {
  /* ===== Auth Gate ===== */
  if (isStorageAvailable()) {
    const users = getUsers();
    const hasSession = hasCurrentUser();

    if (users.length === 0) {
      const { showSetupScreen } = await import('./auth.js');
      await showSetupScreen();
    } else if (!hasSession) {
      const { showUserPicker } = await import('./auth.js');
      await showUserPicker();
    } else {
      loadSettings();
      if (getSetting('requirePasswordOnStartup')) {
        const { showLockScreenAuth } = await import('./auth.js');
        await showLockScreenAuth();
      }
    }
  }

  /* ===== Now load user-specific data ===== */
  loadSettings();
  applyAccent();
  loadInstalledApps();

  /* ===== Init UI ===== */
  onChange('wallpaper', applyWorkspaceWallpaper);
  renderDock();
  renderTopbarIndicators();
  startClock();
  applyWorkspaceWallpaper();
  updateWorkspaceUI();
  updateTopbar();

  /* ===== Keyboard shortcuts ===== */
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
