import {
  getUsers, getUserById, getCurrentUser,
  createUser, verifyPassword, verifyPasswordForUser,
  setCurrentUser, deleteUser, AVATAR_GRADS,
} from './auth-store.js';

/* ---------- Icons ---------- */
const ICON_LOGO = `<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="24" cy="24" r="18"/>
  <path d="M16 20 L22 24 L16 28"/>
  <path d="M26 28 L34 28"/>
</svg>`;

const ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12 C5 6 19 6 23 12 C19 18 5 18 1 12 Z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;

const ICON_EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12 C5 6 19 6 23 12 C19 18 5 18 1 12 Z"/>
  <circle cx="12" cy="12" r="3"/>
  <path d="M3 3 L21 21"/>
</svg>`;

/* ---------- Helpers ---------- */
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function avatarGrad(color) {
  return AVATAR_GRADS[color] || AVATAR_GRADS.orange;
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 350);
}

function showError($form, message) {
  let $err = $form.querySelector('.auth-error');
  if (!$err) {
    $err = document.createElement('div');
    $err.className = 'auth-error';
    $form.insertBefore($err, $form.firstChild);
  }
  $err.textContent = message;
  setTimeout(() => { if ($err.parentNode) $err.remove(); }, 4000);
}

function bindEyeToggles(root) {
  root.querySelectorAll('.auth-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = root.querySelector('#' + btn.dataset.target);
      if (!target) return;
      const isPassword = target.type === 'password';
      target.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword ? ICON_EYE_OFF : ICON_EYE;
    });
  });
}

function mountOverlay(html) {
  const el = document.createElement('div');
  el.id = 'authScreen';
  el.innerHTML = html;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  return el;
}

function unmountOverlay(el) {
  el.classList.remove('open');
  setTimeout(() => el.remove(), 340);
}

/* ============================================================
   Setup — first user
   ============================================================ */
export function showSetupScreen() {
  return new Promise((resolve) => {
    const el = mountOverlay(`
      <div class="auth-card">
        <div class="auth-logo">${ICON_LOGO}</div>
        <h1 class="auth-title">Welcome to WebOS</h1>
        <p class="auth-subtitle">Create your account to get started</p>

        <form class="auth-form" id="setupForm" autocomplete="off">
          <div class="auth-field">
            <label class="auth-label">Username</label>
            <input class="auth-input no-eye" type="text" id="setupUsername"
              placeholder="Choose a username" maxlength="20" autofocus />
            <div class="auth-hint">3-20 characters · letters, numbers, underscore</div>
          </div>
          <div class="auth-field">
            <label class="auth-label">Password</label>
            <div class="auth-input-wrap">
              <input class="auth-input" type="password" id="setupPassword" placeholder="Choose a password" />
              <button type="button" class="auth-eye" data-target="setupPassword">${ICON_EYE}</button>
            </div>
            <div class="auth-hint">At least 4 characters</div>
          </div>
          <div class="auth-field">
            <label class="auth-label">Confirm Password</label>
            <input class="auth-input no-eye" type="password" id="setupConfirm" placeholder="Repeat your password" />
          </div>
          <button type="submit" class="auth-btn" id="setupBtn">Create Account</button>
        </form>

        <div class="auth-footer">
          Your account and data stay in this browser only.<br>
          Password is hashed and never stored as plain text.
        </div>
      </div>
    `);

    const $form     = el.querySelector('#setupForm');
    const $username = el.querySelector('#setupUsername');
    const $password = el.querySelector('#setupPassword');
    const $confirm  = el.querySelector('#setupConfirm');
    const $btn      = el.querySelector('#setupBtn');

    bindEyeToggles(el);

    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $username.value.trim();
      const password = $password.value;
      const confirm  = $confirm.value;

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        shake($username);
        showError($form, 'Username must be 3-20 chars: letters, numbers, underscore');
        return;
      }
      if (password.length < 4) {
        shake($password);
        showError($form, 'Password must be at least 4 characters');
        return;
      }
      if (password !== confirm) {
        shake($confirm);
        showError($form, 'Passwords do not match');
        return;
      }

      $btn.disabled = true;
      $btn.textContent = 'Creating…';

      const result = await createUser(username, password);
      if (!result.ok) {
        $btn.disabled = false;
        $btn.textContent = 'Create Account';
        showError($form, result.error);
        return;
      }

      setCurrentUser(result.user.id);
      unmountOverlay(el);
      setTimeout(() => resolve(), 340);
    });

    setTimeout(() => $username.focus(), 120);
  });
}

/* ============================================================
   User Picker — boot screen for returning users
   ============================================================ */
export async function showUserPicker() {
  while (true) {
    const users = getUsers();
    if (users.length === 0) {
      await showSetupScreen();
      return;
    }

    const result = await runPickerScreen(users);

    if (result.status === 'login') return;
    if (result.status === 'empty') continue;
    if (result.status === 'add') {
      await showAddUserScreen();
      // loop back to picker
      continue;
    }
  }
}

function runPickerScreen(users) {
  return new Promise((resolve) => {
    const tilesHTML = users.map(u => `
      <div class="user-tile" data-user-id="${u.id}">
        <div class="user-tile-avatar" style="background:${avatarGrad(u.avatarColor)}">
          ${esc(u.username.charAt(0).toUpperCase())}
        </div>
        <div class="user-tile-name">${esc(u.username)}</div>
      </div>
    `).join('');

    const el = mountOverlay(`
      <div class="auth-card">
        <h1 class="auth-title">Welcome to WebOS</h1>
        <p class="auth-subtitle">Choose an account</p>

        <div class="user-grid">
          ${tilesHTML}
          <div class="user-tile add" data-add-user="true">
            <div class="user-tile-avatar">+</div>
            <div class="user-tile-name">Add User</div>
          </div>
        </div>
      </div>
    `);

    el.querySelector('.user-tile.add').addEventListener('click', () => {
      unmountOverlay(el);
      setTimeout(() => resolve({ status: 'add' }), 340);
    });

    el.querySelectorAll('.user-tile[data-user-id]').forEach(tile => {
      tile.addEventListener('click', async () => {
        const userId = tile.dataset.userId;
        const outcome = await runLoginPanel(el, userId);
        if (outcome === 'login') {
          unmountOverlay(el);
          setTimeout(() => resolve({ status: 'login' }), 340);
        } else if (outcome === 'deleted') {
          unmountOverlay(el);
          setTimeout(() => resolve({ status: 'empty' }), 340);
        }
        // 'back' → panel restored the picker HTML internally
      });
    });
  });
}

/* ============================================================
   Login panel (inside picker)
   ============================================================ */
function runLoginPanel(parentEl, userId) {
  return new Promise((resolve) => {
    const user = getUserById(userId);
    if (!user) { resolve('back'); return; }

    const $card = parentEl.querySelector('.auth-card');
    const pickerHTML = $card.innerHTML;

    $card.innerHTML = `
      <button class="auth-back" id="authBack">← Back</button>
      <div class="auth-avatar" style="background:${avatarGrad(user.avatarColor)}">
        ${esc(user.username.charAt(0).toUpperCase())}
      </div>
      <h1 class="auth-title">Welcome back</h1>
      <p class="auth-subtitle">${esc(user.username)}</p>

      <form class="auth-form" id="loginForm" autocomplete="off">
        <div class="auth-field">
          <div class="auth-input-wrap">
            <input class="auth-input" type="password" id="loginPassword"
              placeholder="Enter your password" autofocus />
            <button type="button" class="auth-eye" data-target="loginPassword">${ICON_EYE}</button>
          </div>
        </div>
        <button type="submit" class="auth-btn" id="loginBtn">Log In</button>
      </form>

      <div class="auth-footer">
        <button type="button" class="auth-link" id="forgotLink">Forgot password? Reset this account</button>
      </div>
    `;

    const $form     = $card.querySelector('#loginForm');
    const $password = $card.querySelector('#loginPassword');
    const $btn      = $card.querySelector('#loginBtn');
    const $back     = $card.querySelector('#authBack');
    const $forgot   = $card.querySelector('#forgotLink');

    bindEyeToggles($card);

    function restorePicker() {
      $card.innerHTML = pickerHTML;
      resolve('back');
    }

    $back.addEventListener('click', restorePicker);

    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = $password.value;
      if (!password) { shake($password); return; }

      $btn.disabled = true;
      $btn.textContent = 'Logging in…';

      const ok = await verifyPasswordForUser(userId, password);

      if (!ok) {
        $btn.disabled = false;
        $btn.textContent = 'Log In';
        $password.value = '';
        shake($password);
        showError($form, 'Incorrect password');
        $password.focus();
        return;
      }

      setCurrentUser(userId);
      resolve('login');
    });

    $forgot.addEventListener('click', async () => {
      const { showConfirm } = await import('./notifications.js');
      const ok = await showConfirm(
        'Reset Account',
        `This will permanently delete "${user.username}" and all their data:\n` +
        '• Files and notes\n• Installed apps\n• Settings\n\n' +
        'This cannot be undone.',
        { danger: true, okText: 'Reset Account', cancelText: 'Cancel' }
      );
      if (!ok) return;
      deleteUser(userId);
      resolve('deleted');
    });

    setTimeout(() => $password.focus(), 80);
  });
}

/* ============================================================
   Add User — from picker or settings
   ============================================================ */
export function showAddUserScreen() {
  return new Promise((resolve) => {
    const el = mountOverlay(`
      <div class="auth-card">
        <button class="auth-back" id="addBack">← Back</button>
        <div class="auth-logo">${ICON_LOGO}</div>
        <h1 class="auth-title">Add User</h1>
        <p class="auth-subtitle">Create a new account on this device</p>

        <form class="auth-form" id="addForm" autocomplete="off">
          <div class="auth-field">
            <label class="auth-label">Username</label>
            <input class="auth-input no-eye" type="text" id="addUsername"
              placeholder="Choose a username" maxlength="20" autofocus />
            <div class="auth-hint">3-20 characters · letters, numbers, underscore</div>
          </div>
          <div class="auth-field">
            <label class="auth-label">Password</label>
            <div class="auth-input-wrap">
              <input class="auth-input" type="password" id="addPassword" placeholder="Choose a password" />
              <button type="button" class="auth-eye" data-target="addPassword">${ICON_EYE}</button>
            </div>
            <div class="auth-hint">At least 4 characters</div>
          </div>
          <div class="auth-field">
            <label class="auth-label">Confirm Password</label>
            <input class="auth-input no-eye" type="password" id="addConfirm" placeholder="Repeat your password" />
          </div>
          <button type="submit" class="auth-btn" id="addBtn">Create Account</button>
        </form>

        <div class="auth-footer">
          The new user will appear on the boot screen.<br>
          Their files and settings are completely separate.
        </div>
      </div>
    `);

    const $form     = el.querySelector('#addForm');
    const $username = el.querySelector('#addUsername');
    const $password = el.querySelector('#addPassword');
    const $confirm  = el.querySelector('#addConfirm');
    const $btn      = el.querySelector('#addBtn');
    const $back     = el.querySelector('#addBack');

    bindEyeToggles(el);

    $back.addEventListener('click', () => {
      unmountOverlay(el);
      setTimeout(() => resolve(null), 340);
    });

    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $username.value.trim();
      const password = $password.value;
      const confirm  = $confirm.value;

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        shake($username);
        showError($form, 'Username must be 3-20 chars: letters, numbers, underscore');
        return;
      }
      if (password.length < 4) {
        shake($password);
        showError($form, 'Password must be at least 4 characters');
        return;
      }
      if (password !== confirm) {
        shake($confirm);
        showError($form, 'Passwords do not match');
        return;
      }

      $btn.disabled = true;
      $btn.textContent = 'Creating…';

      const result = await createUser(username, password);
      if (!result.ok) {
        $btn.disabled = false;
        $btn.textContent = 'Create Account';
        showError($form, result.error);
        return;
      }

      unmountOverlay(el);
      setTimeout(() => resolve(result), 340);
    });

    setTimeout(() => $username.focus(), 120);
  });
}

/* ============================================================
   Lock Screen — current user, password to unlock
   ============================================================ */
export function showLockScreenAuth() {
  return new Promise((resolve) => {
    const user = getCurrentUser();
    if (!user) { resolve(); return; }

    const el = document.createElement('div');
    el.id = 'lockScreen';
    el.innerHTML = `
      <div class="lock-content">
        <div class="lock-time">--:--</div>
        <div class="lock-date">—</div>
        <div class="lock-avatar" style="background:${avatarGrad(user.avatarColor)}">
          ${esc(user.username.charAt(0).toUpperCase())}
        </div>
        <div class="lock-user">${esc(user.username)}</div>
        <form class="lock-form" id="lockForm" autocomplete="off">
          <input class="lock-input" type="password" id="lockPassword" placeholder="Password" autofocus />
          <button type="submit" class="lock-unlock-btn" id="lockBtn">Unlock</button>
        </form>
        <button type="button" class="lock-forgot" id="lockForgot">Forgot your password?</button>
      </div>
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('open'));

    const $form     = el.querySelector('#lockForm');
    const $password = el.querySelector('#lockPassword');
    const $btn      = el.querySelector('#lockBtn');
    const $forgot   = el.querySelector('#lockForgot');

    const updateTime = () => {
      if (!document.body.contains(el)) return;
      const now = new Date();
      el.querySelector('.lock-time').textContent =
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      el.querySelector('.lock-date').textContent =
        now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };
    updateTime();
    const timerId = setInterval(updateTime, 1000);

    const cleanup = () => {
      clearInterval(timerId);
      el.classList.remove('open');
      setTimeout(() => el.remove(), 340);
    };

    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = $password.value;
      if (!password) return;
      $btn.disabled = true;
      const ok = await verifyPassword(password);
      if (!ok) {
        $btn.disabled = false;
        $password.value = '';
        shake($password);
        $password.focus();
        return;
      }
      cleanup();
      setTimeout(() => resolve(), 340);
    });

    $forgot.addEventListener('click', async () => {
      const { showConfirm } = await import('./notifications.js');
      const ok = await showConfirm(
        'Reset Account',
        'This will permanently delete this account and all its data.\n\n' +
        'You will need to create a new account.',
        { danger: true, okText: 'Reset Account', cancelText: 'Cancel' }
      );
      if (!ok) return;
      const { clearCurrentUser, deleteUser } = await import('./auth-store.js');
      clearCurrentUser();
      deleteUser(user.id);
      location.reload();
    });

    setTimeout(() => $password.focus(), 120);
  });
}
