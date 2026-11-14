import { showConfirm } from './notifications.js';
import { hideBrightnessOverlay, restoreBrightnessOverlay } from './statusbar.js';
import { clearCurrentUser } from './auth-store.js';

let suspendScreenEl  = null;
let shutdownScreenEl = null;

export const power = { lock, suspend, restart, shutdown, logout };

async function lock() {
  const { showLockScreenAuth } = await import('./auth.js');
  hideBrightnessOverlay();
  await showLockScreenAuth();
  restoreBrightnessOverlay();
}

async function logout() {
  const ok = await showConfirm(
    'Sign Out',
    'Sign out of your account?\nYou will be able to sign in as a different user.',
    { okText: 'Sign Out' }
  );
  if (!ok) return;
  clearCurrentUser();
  location.reload();
}

function suspend() {
  if (suspendScreenEl) return;
  hideBrightnessOverlay();
  suspendScreenEl = document.createElement('div');
  suspendScreenEl.id = 'suspendScreen';
  suspendScreenEl.innerHTML = `<div>System suspended · Press any key to wake</div>`;
  document.body.appendChild(suspendScreenEl);
  requestAnimationFrame(() => suspendScreenEl.classList.add('open'));

  const wake = () => {
    document.removeEventListener('keydown', onKey, true);
    suspendScreenEl.classList.remove('open');
    const el = suspendScreenEl;
    suspendScreenEl = null;
    setTimeout(() => { el.remove(); restoreBrightnessOverlay(); }, 520);
  };
  const onKey = () => wake();

  setTimeout(() => {
    document.addEventListener('keydown', onKey, true);
    suspendScreenEl.addEventListener('click', wake);
  }, 600);
}

async function restart() {
  const ok = await showConfirm(
    'Restart',
    'Are you sure you want to restart WebOS?\nAny unsaved changes will be lost.',
    { okText: 'Restart' }
  );
  if (!ok) return;

  const fade = document.createElement('div');
  fade.className = 'restart-fade';
  document.body.appendChild(fade);
  requestAnimationFrame(() => { fade.style.opacity = '1'; });
  setTimeout(() => location.reload(), 700);
}

async function shutdown() {
  const ok = await showConfirm(
    'Shut Down',
    'Are you sure you want to shut down WebOS?\nAny unsaved changes will be lost.',
    { okText: 'Shut Down', danger: true }
  );
  if (!ok) return;
  if (shutdownScreenEl) return;

  hideBrightnessOverlay();

  shutdownScreenEl = document.createElement('div');
  shutdownScreenEl.id = 'shutdownScreen';
  shutdownScreenEl.innerHTML = `
    <svg class="shutdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M12 3 V12"/>
      <path d="M6.3 6.3 C3.5 9 3.5 13 6.3 15.7 C9 18.5 13 18.5 15.7 15.7 C18.5 13 18.5 9 15.7 6.3"/>
    </svg>
    <div class="shutdown-text">SYSTEM IS OFF</div>
    <button class="shutdown-power-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 3 V12"/>
        <path d="M6.3 6.3 C3.5 9 3.5 13 6.3 15.7 C9 18.5 13 18.5 15.7 15.7 C18.5 13 18.5 9 15.7 6.3"/>
      </svg>
      Power On
    </button>
  `;
  document.body.appendChild(shutdownScreenEl);
  requestAnimationFrame(() => shutdownScreenEl.classList.add('open'));

  shutdownScreenEl.querySelector('.shutdown-power-btn').addEventListener('click', () => {
    location.reload();
  });
}
