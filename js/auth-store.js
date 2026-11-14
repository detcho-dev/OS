const USER_KEY = "webos.user";
const SESSION_KEY = "webos.session";

/* ---------- Hashing ---------- */
function simpleHash(str) {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).padStart(16, "0");
}

async function hashPassword(password, salt) {
  const input = salt + ":" + password;
  try {
    if (window.crypto?.subtle) {
      const buf = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch (e) {}
  return simpleHash(input) + simpleHash("x" + input);
}

function generateSalt() {
  const arr = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- User ---------- */
export function getUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export async function createUser(username, password) {
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  const user = { username, salt, hash, createdAt: Date.now() };
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {}
  return user;
}

export async function verifyPassword(password) {
  const user = getUser();
  if (!user) return false;
  const hash = await hashPassword(password, user.salt);
  return hash === user.hash;
}

export function deleteUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (e) {}
  endSession();
}

/* ---------- Session ---------- */
export function createSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch (e) {}
}

export function hasValidSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function endSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

/* ---------- Storage availability ---------- */
export function isStorageAvailable() {
  try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
    sessionStorage.setItem("__t", "1");
    sessionStorage.removeItem("__t");
    return true;
  } catch (e) {
    return false;
  }
}
