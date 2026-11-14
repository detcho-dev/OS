import { getSetting, setSetting, ACCENTS, WALLPAPERS } from './settings-store.js';
import { getNode } from './vfs.js';
import {
  getUser, updateUsername, updatePassword,
  updateAvatarColor, deleteAccount, AVATAR_GRADS,
} from './auth-store.js';
import { toast, showConfirm } from './notifications.js';

const bootTime = Date.now();

const SIDEBAR = [
  { id: 'account',    label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'clock',      label: 'Clock' },
  { id: 'about',      label: 'About' },
];

export function createSettings(container, win) {
  let activeSection = 'account';

  container.innerHTML = `
    <div class="settings-app">
      <aside class="settings-sidebar">
        <div class="settings-sidebar-title">Settings</div>
        ${SIDEBAR.map(item => `
          <button class="settings-nav-item ${item.id === activeSection ? 'active' : ''}"
                  data-section="${item.id}">${item.label}</button>
        `).join('')}
      </aside>
      <div class="settings-content" id="settingsContent"></div>
    </div>
  `;

  const $content = container.querySelector('#settingsContent');

  container.querySelectorAll('.settings-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.section;
      container.querySelectorAll('.settings-nav-item').forEach(b =>
        b.classList.toggle('active', b === btn));
      render();
    });
  });

  function render() {
    if (activeSection === 'account')    renderAccount();
    if (activeSection === 'appearance') renderAppearance();
    if (activeSection === 'clock')      renderClock();
    if (activeSection === 'about')      renderAbout();
  }

  /* ============================================================
     Account
     ============================================================ */
  function renderAccount() {
    const user = getUser();
    if (!user) {
      $content.innerHTML = `
        <h2 class="settings-section-title">Account</h2>
        <div class="settings-group"><div class="settings-row-desc">Not signed in</div></div>
      `;

      const $requirePw = $content.querySelector('#requirePwToggle');
if ($requirePw) {
  $requirePw.addEventListener('change', (e) => {
    setSetting('requirePasswordOnStartup', e.target.checked);
    toast.success(e.target.checked
      ? 'WebOS will ask for password on startup'
      : 'Auto-login enabled');
  });
}
      return;

      
    }

    const initial   = user.username.charAt(0).toUpperCase();
    const colorKey  = user.avatarColor || 'orange';
    const avatarBg  = AVATAR_GRADS[colorKey] || AVATAR_GRADS.orange;
    const joined    = new Date(user.createdAt || Date.now())
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    $content.innerHTML = `
      <h2 class="settings-section-title">Account</h2>

      <div class="account-card">
        <div class="account-avatar" id="accountAvatar" style="background:${avatarBg}">${escapeHtml(initial)}</div>
        <div class="account-info">
          <div class="account-name" id="accountName">${escapeHtml(user.username)}</div>
          <div class="account-joined">Member since ${escapeHtml(joined)}</div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Change Username</div>
        <div class="account-row">
          <input class="account-input" id="newUsername" type="text"
            value="${escapeHtml(user.username)}" maxlength="20" autocomplete="off" />
          <button class="account-btn primary" id="saveUsername">Save</button>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Change Password</div>
        <div class="account-field">
          <label>Current Password</label>
          <input class="account-input" type="password" id="currentPass"
            placeholder="Enter current password" autocomplete="off" />
        </div>
        <div class="account-field">
          <label>New Password</label>
          <input class="account-input" type="password" id="newPass"
            placeholder="At least 4 characters" autocomplete="off" />
        </div>
        <div class="account-field">
          <label>Confirm New Password</label>
          <input class="account-input" type="password" id="confirmPass"
            placeholder="Repeat new password" autocomplete="off" />
        </div>
        <button class="account-btn primary" id="savePassword" style="margin-top:6px;">Update Password</button>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Avatar Color</div>
        <div class="avatar-colors" id="avatarColors"></div>
      </div>

      <div class="settings-group">
  <div class="settings-group-label">Security</div>
  <div class="settings-row">
    <div>
      <div class="settings-row-title">Require password on startup</div>
      <div class="settings-row-desc">Show the lock screen every time WebOS opens</div>
    </div>
    <label class="switch">
      <input type="checkbox" id="requirePwToggle" ${getSetting('requirePasswordOnStartup') ? 'checked' : ''}>
      <span class="switch-slider"></span>
    </label>
  </div>
</div>

      <div class="settings-group danger-zone">
        <div class="settings-group-label" style="color:#f87171;">Danger Zone</div>
        <div class="account-row">
          <div class="account-row-text">
            <div class="settings-row-title">Delete Account</div>
            <div class="settings-row-desc">Permanently delete your account and all data</div>
          </div>
          <button class="account-btn danger" id="deleteAccountBtn">Delete Account</button>
        </div>
      </div>
    `;

    const $avatar      = $content.querySelector('#accountAvatar');
    const $nameLabel   = $content.querySelector('#accountName');
    const $newUsername = $content.querySelector('#newUsername');
    const $saveUser    = $content.querySelector('#saveUsername');
    const $currentPass = $content.querySelector('#currentPass');
    const $newPass     = $content.querySelector('#newPass');
    const $confirmPass = $content.querySelector('#confirmPass');
    const $savePass    = $content.querySelector('#savePassword');
    const $colors      = $content.querySelector('#avatarColors');
    const $deleteBtn   = $content.querySelector('#deleteAccountBtn');

    /* --- Avatar colors --- */
    for (const [key, grad] of Object.entries(AVATAR_GRADS)) {
      const dot = document.createElement('button');
      dot.className = 'avatar-color-dot' + (key === colorKey ? ' active' : '');
      dot.style.background = grad;
      dot.title = key.charAt(0).toUpperCase() + key.slice(1);
      dot.addEventListener('click', () => {
        if (!updateAvatarColor(key)) return;
        $avatar.style.background = grad;
        $colors.querySelectorAll('.avatar-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        toast.success('Avatar color updated');
      });
      $colors.appendChild(dot);
    }

    /* --- Username --- */
    $saveUser.addEventListener('click', () => {
      const newName = $newUsername.value.trim();
      const current = getUser()?.username;
      if (newName === current) {
        toast.info('No changes');
        return;
      }
      const result = updateUsername(newName);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      $nameLabel.textContent = newName;
      $avatar.textContent = newName.charAt(0).toUpperCase();
      toast.success('Username updated');
    });

    $newUsername.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $saveUser.click();
    });

    /* --- Password --- */
    $savePass.addEventListener('click', async () => {
      const oldPw  = $currentPass.value;
      const newPw  = $newPass.value;
      const confPw = $confirmPass.value;

      if (!oldPw)     { toast.error('Enter your current password'); $currentPass.focus(); return; }
      if (!newPw)     { toast.error('Enter a new password'); $newPass.focus(); return; }
      if (newPw !== confPw) { toast.error('Passwords do not match'); $confirmPass.focus(); return; }

      $savePass.disabled = true;
      $savePass.textContent = 'Updating…';

      const result = await updatePassword(oldPw, newPw);

      $savePass.disabled = false;
      $savePass.textContent = 'Update Password';

      if (!result.ok) {
        toast.error(result.error);
        $currentPass.focus();
        $currentPass.select();
        return;
      }

      $currentPass.value = '';
      $newPass.value = '';
      $confirmPass.value = '';
      toast.success('Password updated');
    });

    /* --- Delete --- */
    $deleteBtn.addEventListener('click', async () => {
      const ok = await showConfirm(
        'Delete Account',
        'This will permanently delete your account and ALL data:\n' +
        '• Files and notes\n' +
        '• Installed apps\n' +
        '• Settings\n' +
        '• Your account\n\n' +
        'This cannot be undone.',
        { danger: true, okText: 'Delete Everything', cancelText: 'Cancel' }
      );
      if (!ok) return;

      deleteAccount();
      location.reload();
    });
  }

  /* ============================================================
     Appearance
     ============================================================ */
  function renderAppearance() {
    const currentWallpaper = getSetting('wallpaper');
    const currentAccent    = getSetting('accent');

    $content.innerHTML = `
      <h2 class="settings-section-title">Appearance</h2>

      <div class="settings-group">
        <div class="settings-group-label">Wallpaper</div>
        <div class="wallpaper-grid" id="wallpaperGrid"></div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Accent Color</div>
        <div class="accent-row" id="accentRow"></div>
      </div>
    `;

    const $wallpaperGrid = $content.querySelector('#wallpaperGrid');
    for (const [key, w] of Object.entries(WALLPAPERS)) {
      const card = document.createElement('div');
      card.className = 'wallpaper-card' + (key === currentWallpaper ? ' active' : '');
      card.innerHTML = `
        <div class="wallpaper-preview" style="background:${w.preview}"></div>
        <div class="wallpaper-name">${w.name}</div>
      `;
      card.addEventListener('click', () => {
        setSetting('wallpaper', key);
        $wallpaperGrid.querySelectorAll('.wallpaper-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
      $wallpaperGrid.appendChild(card);
    }

    const $accentRow = $content.querySelector('#accentRow');
    for (const [key, a] of Object.entries(ACCENTS)) {
      const dot = document.createElement('button');
      dot.className = 'accent-dot' + (key === currentAccent ? ' active' : '');
      dot.style.background = a.main;
      dot.style.color = a.main;
      dot.title = key.charAt(0).toUpperCase() + key.slice(1);
      dot.addEventListener('click', () => {
        setSetting('accent', key);
        $accentRow.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
      $accentRow.appendChild(dot);
    }
  }

  /* ============================================================
     Clock
     ============================================================ */
  function renderClock() {
    const is24h = getSetting('clock24h');
    $content.innerHTML = `
      <h2 class="settings-section-title">Clock</h2>
      <div class="settings-group">
        <div class="settings-row">
          <div>
            <div class="settings-row-title">24-hour format</div>
            <div class="settings-row-desc">Use 24-hour time instead of AM / PM</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="clock24h" ${is24h ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
    `;
    $content.querySelector('#clock24h').addEventListener('change', (e) => {
      setSetting('clock24h', e.target.checked);
    });
  }

  /* ============================================================
     About
     ============================================================ */
  function renderAbout() {
    const stats     = countFiles(getNode([]));
    const uptimeSec = Math.floor((Date.now() - bootTime) / 1000);
    const user      = getUser();

    $content.innerHTML = `
      <h2 class="settings-section-title">About</h2>

      <div class="about-header">
        <div class="about-logo">
          <svg viewBox="0 0 48 48" fill="none" stroke="#e95420" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="24" cy="24" r="18"/>
            <path d="M16 20 L22 24 L16 28"/>
            <path d="M26 28 L34 28"/>
          </svg>
        </div>
        <div>
          <div class="about-title">WebOS</div>
          <div class="about-version">Version 0.3.0</div>
        </div>
      </div>

      <div class="settings-group">
        <div class="about-row"><span>Files</span><span>${stats.files}</span></div>
        <div class="about-row"><span>Folders</span><span>${stats.dirs}</span></div>
        <div class="about-row"><span>Total size</span><span>${formatBytes(stats.size)}</span></div>
        <div class="about-row"><span>Uptime</span><span>${formatUptime(uptimeSec)}</span></div>
        <div class="about-row"><span>Screen</span><span>${window.innerWidth} × ${window.innerHeight}</span></div>
        <div class="about-row"><span>User</span><span>${user ? escapeHtml(user.username) : 'guest'}@webos</span></div>
      </div>
    `;
  }

  /* ============================================================
     Helpers
     ============================================================ */
  function countFiles(node, stats = { files: 0, dirs: 0, size: 0 }) {
    if (!node) return stats;
    if (node.type === 'file') {
      stats.files++;
      stats.size += (node.content || '').length;
    } else {
      stats.dirs++;
      for (const child of Object.values(node.children || {})) countFiles(child, stats);
    }
    return stats;
  }

  function formatBytes(bytes) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function formatUptime(sec) {
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m ${sec % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  render();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
