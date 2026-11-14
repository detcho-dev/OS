import { getCurrentUser } from './auth-store.js';

/* ============================================================
   Storage key per user
   ============================================================ */
const FS_PREFIX = 'webos.fs.';

function fsKey() {
  const user = getCurrentUser();
  return FS_PREFIX + (user ? user.id : 'guest');
}

/* ============================================================
   Default seed
   ============================================================ */
const DEFAULT_FS = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        user: {
          type: 'dir',
          children: {
            'readme.txt': {
              type: 'file',
              content:
                'Welcome to WebOS!\n' +
                'Type "help" to see available commands.\n' +
                'Try: ls, cat readme.txt, edit readme.txt',
            },
            'notes.txt': {
              type: 'file',
              content:
                'My first note:\n- build terminal\n- build file explorer\n- ship it',
            },
            projects: { type: 'dir', children: {} },
          },
        },
      },
    },
    etc: {
      type: 'dir',
      children: {
        'os-release': {
          type: 'file',
          content: 'NAME=WebOS\nVERSION=0.4.0\nSHELL=webshell\nUSER=user',
        },
      },
    },
    tmp: { type: 'dir', children: {} },
  },
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_FS));
}

/* ============================================================
   Live FS object (stable reference — mutated in place)
   ============================================================ */
export const GLOBAL_FS = cloneDefault();

/* ============================================================
   Load FS for current user
   ============================================================ */
export function loadUserFS() {
  let data = null;
  try {
    const stored = localStorage.getItem(fsKey());
    if (stored) data = JSON.parse(stored);
  } catch (e) {}
  if (!data) data = cloneDefault();

  // Replace contents in place (preserves references in other modules)
  Object.keys(GLOBAL_FS).forEach(k => delete GLOBAL_FS[k]);
  Object.assign(GLOBAL_FS, data);
}

/* ============================================================
   Save FS (debounced + immediate)
   ============================================================ */
let saveTimer = null;

export function saveFS(immediate = false) {
  const persist = () => {
    try {
      localStorage.setItem(fsKey(), JSON.stringify(GLOBAL_FS));
    } catch (e) {}
  };
  if (immediate) return persist();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 250);
}

/* ============================================================
   Auto-save: every 2s + on unload + on tab hidden
   ============================================================ */
setInterval(() => saveFS(true), 2000);

window.addEventListener('beforeunload', () => saveFS(true));

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveFS(true);
});

/* ============================================================
   Path helpers (unchanged)
   ============================================================ */
export function getNode(parts, root = GLOBAL_FS) {
  let node = root;
  for (const p of parts) {
    if (!node.children || !node.children[p]) return null;
    node = node.children[p];
  }
  return node;
}

export function resolvePath(p, currentPath) {
  if (!p) return [...currentPath];
  const parts = p.startsWith('/') ? [] : [...currentPath];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { parts.pop(); continue; }
    parts.push(seg);
  }
  return parts;
}

export function pathDisplay(parts) {
  return '/' + parts.join('/');
}

export function shortPath(parts) {
  if (parts[0] === 'home' && parts[1] === 'user') {
    return '~' + (parts.length > 2 ? '/' + parts.slice(2).join('/') : '');
  }
  return '/' + parts.join('/');
}
