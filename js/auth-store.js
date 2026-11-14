const USER_KEY    = 'webos.user';
const SESSION_KEY = 'webos.session';

/* ---------- Avatar gradients ---------- */
export const AVATAR_GRADS = {
  orange: 'linear-gradient(135deg, #e95420, #a13a15)',
  blue:   'linear-gradient(135deg, #3b82f6, #1e40af)',
  green:  'linear-gradient(135deg, #22c55e, #15803d)',
  purple: 'linear-gradient(135deg, #a855f7, #7e22ce)',
  red:    'linear-gradient(135deg, #ef4444, #b91c1c)',
  pink:   'linear-gradient(135deg, #ec4899, #be185d)',
};

/* ---------- Hashing ---------- */
function simpleHash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).padStart(16, '0');
}

async function hashPassword(password, salt) {
  const input = salt + ':' + password;
  try {
    if (window.crypto?.subtle) {
      const buf = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  return simpleHash(input) + simpleHash('x' + input);
}

function generateSalt() {
  const arr = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- User ---------- */
export function getUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

function saveUser(user) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) {}
  return user;
}

export async function createUser(username, password) {
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  const user = {
    username,
    salt,
    hash,
    avatarColor: 'orange',
    createdAt: Date.now(),
  };
  saveUser(user);
  return user;
}

export async function verifyPassword(password) {
  const user = getUser();
  if (!user) return false;
  const hash = await hashPassword(password, user.salt);
  return hash === user.hash;
}

/* ---------- Updates ---------- */
export function updateUsername(newUsername) {
  const user = getUser();
  if (!user) return { ok: false, error: 'No user' };
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)) {
    return { ok: false, error: 'Username must be 3-20 chars: letters, numbers, underscore' };
  }
  user.username = newUsername;
  saveUser(user);
  return { ok: true };
}

export async function updatePassword(oldPassword, newPassword) {
  const user = getUser();
  if (!user) return { ok: false, error: 'No user' };
  if (newPassword.length < 4) {
    return { ok: false, error: 'New password must be at least 4 characters' };
  }
  const oldHash = await hashPassword(oldPassword, user.salt);
  if (oldHash !== user.hash) {
    return { ok: false, error: 'Current password is incorrect' };
  }
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  user.salt = newSalt;
  user.hash = newHash;
  saveUser(user);
  return { ok: true };
}

export function updateAvatarColor(color) {
  const user = getUser();
  if (!user) return false;
  if (!AVATAR_GRADS[color]) return false;
  user.avatarColor = color;
  saveUser(user);
  return true;
}

/* ---------- Delete ---------- */
export function deleteAccount() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('webos.')) localStorage.removeItem(k);
  });
  try { sessionStorage.clear(); } catch (e) {}
}

/* ---------- Session ---------- */
export function createSession() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
}

export function hasValidSession() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
}

export function endSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
}

export function isStorageAvailable() {
  try {
    localStorage.setItem('__t', '1');
    localStorage.removeItem('__t');
    sessionStorage.setItem('__t', '1');
    sessionStorage.removeItem('__t');
    return true;
  } catch (e) { return false; }
}
