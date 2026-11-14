const USERS_KEY   = 'webos.users';
const CURRENT_KEY = 'webos.currentUserId';

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
  if (window.crypto?.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateId() {
  return 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

/* ---------- Users array ---------- */
export function getUsers() {
  try {
    const s = localStorage.getItem(USERS_KEY);
    return s ? JSON.parse(s) : [];
  } catch (e) { return []; }
}

function saveUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) {}
}

export function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

/* ---------- Current session ---------- */
export function getCurrentUser() {
  try {
    const id = sessionStorage.getItem(CURRENT_KEY);
    return id ? getUserById(id) : null;
  } catch (e) { return null; }
}

export function setCurrentUser(userId) {
  try { sessionStorage.setItem(CURRENT_KEY, userId); } catch (e) {}
}

export function clearCurrentUser() {
  try { sessionStorage.removeItem(CURRENT_KEY); } catch (e) {}
}

export function hasCurrentUser() {
  try { return !!sessionStorage.getItem(CURRENT_KEY); } catch (e) { return false; }
}

/* ---------- Legacy aliases ---------- */
export const getUser = getCurrentUser;
export function endSession() { clearCurrentUser(); }
export function hasValidSession() { return hasCurrentUser(); }

/* ---------- Create / verify ---------- */
export async function createUser(username, password) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { ok: false, error: 'Username must be 3-20 chars: letters, numbers, underscore' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters' };
  }
  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: 'Username already exists' };
  }
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  const user = {
    id: generateId(),
    username,
    salt,
    hash,
    avatarColor: 'orange',
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

export async function verifyPasswordForUser(userId, password) {
  const user = getUserById(userId);
  if (!user) return false;
  const hash = await hashPassword(password, user.salt);
  return hash === user.hash;
}

export async function verifyPassword(password) {
  const current = getCurrentUser();
  if (!current) return false;
  return verifyPasswordForUser(current.id, password);
}

/* ---------- Updates ---------- */
export function updateUsername(newUsername) {
  const current = getCurrentUser();
  if (!current) return { ok: false, error: 'No user' };
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)) {
    return { ok: false, error: 'Username must be 3-20 chars: letters, numbers, underscore' };
  }
  const users = getUsers();
  if (users.some(u => u.id !== current.id && u.username.toLowerCase() === newUsername.toLowerCase())) {
    return { ok: false, error: 'Username already exists' };
  }
  const u = users.find(u => u.id === current.id);
  u.username = newUsername;
  saveUsers(users);
  return { ok: true };
}

export async function updatePassword(oldPassword, newPassword) {
  const current = getCurrentUser();
  if (!current) return { ok: false, error: 'No user' };
  if (newPassword.length < 4) {
    return { ok: false, error: 'New password must be at least 4 characters' };
  }
  const oldHash = await hashPassword(oldPassword, current.salt);
  if (oldHash !== current.hash) {
    return { ok: false, error: 'Current password is incorrect' };
  }
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  const users = getUsers();
  const u = users.find(u => u.id === current.id);
  u.salt = newSalt;
  u.hash = newHash;
  saveUsers(users);
  return { ok: true };
}

export function updateAvatarColor(color) {
  const current = getCurrentUser();
  if (!current) return false;
  if (!AVATAR_GRADS[color]) return false;
  const users = getUsers();
  const u = users.find(u => u.id === current.id);
  u.avatarColor = color;
  saveUsers(users);
  return true;
}

/* ---------- Delete ---------- */
export function deleteUser(userId) {
  const users = getUsers();
  saveUsers(users.filter(u => u.id !== userId));

  // wipe per-user data
  Object.keys(localStorage).forEach(k => {
    if (k.endsWith('.' + userId)) localStorage.removeItem(k);
  });

  // clear session if this was current
  try {
    if (sessionStorage.getItem(CURRENT_KEY) === userId) {
      sessionStorage.removeItem(CURRENT_KEY);
    }
  } catch (e) {}
  return true;
}

export function deleteAccount() {
  const current = getCurrentUser();
  if (current) deleteUser(current.id);
}

export function deleteAllData() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('webos.')) localStorage.removeItem(k);
  });
  try { sessionStorage.clear(); } catch (e) {}
}

/* ---------- Storage check ---------- */
export function isStorageAvailable() {
  try {
    localStorage.setItem('__t', '1');
    localStorage.removeItem('__t');
    sessionStorage.setItem('__t', '1');
    sessionStorage.removeItem('__t');
    return true;
  } catch (e) { return false; }
}
