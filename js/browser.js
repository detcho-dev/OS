import { getNode } from './vfs.js';

const HISTORY_MAX = 50;

export function createBrowser(container, win, options = {}) {
  let history = [];
  let historyIndex = -1;
  let currentType = 'home';  // 'home' | 'vfs' | 'url'
  let currentPath = null;
  let currentUrl  = null;

  container.innerHTML = `
    <div class="browser-app">
      <div class="browser-toolbar">
        <button class="browser-nav-btn" data-action="back"    title="Back">←</button>
        <button class="browser-nav-btn" data-action="forward" title="Forward">→</button>
        <button class="browser-nav-btn" data-action="refresh" title="Refresh">⟳</button>
        <button class="browser-nav-btn" data-action="home"    title="Home">⌂</button>
        <input class="browser-url" id="browserUrl" type="text"
               placeholder="Enter path or URL…" spellcheck="false" autocomplete="off" />
        <button class="browser-nav-btn primary" data-action="go" title="Go">→</button>
      </div>
      <div class="browser-warning hidden" id="browserWarning"></div>
      <div class="browser-content">
        <div class="browser-home" id="browserHome"></div>
        <iframe class="browser-iframe hidden" id="browserIframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"></iframe>
      </div>
      <div class="browser-status" id="browserStatus"></div>
    </div>
  `;

  const $url     = container.querySelector('#browserUrl');
  const $iframe  = container.querySelector('#browserIframe');
  const $home    = container.querySelector('#browserHome');
  const $warning = container.querySelector('#browserWarning');
  const $status  = container.querySelector('#browserStatus');

  /* ---------- Nav buttons state ---------- */
  function updateNavButtons() {
    container.querySelector('[data-action="back"]').disabled = historyIndex <= 0;
    container.querySelector('[data-action="forward"]').disabled = historyIndex >= history.length - 1;
  }

  /* ---------- Home page ---------- */
  function showHome() {
    $iframe.classList.add('hidden');
    $home.classList.remove('hidden');
    $warning.classList.add('hidden');
    $iframe.removeAttribute('src');
    $iframe.removeAttribute('srcdoc');
    $url.value = '';
    $status.textContent = 'Home · webos://home';
    currentType = 'home';
    currentPath = null;
    currentUrl  = null;
    renderHome();
  }

  function renderHome() {
    const websitesDir = getNode(['home', 'user', 'websites']);
    const htmlFiles = websitesDir
      ? Object.keys(websitesDir.children).filter(n => n.endsWith('.html')).sort()
      : [];

    $home.innerHTML = `
      <h1 style="margin-bottom: 6px;">Browser</h1>
      <p style="margin-bottom: 24px;">View HTML files from your virtual file system.</p>

      <h2>Your Websites (${htmlFiles.length})</h2>
      ${htmlFiles.length === 0
        ? '<p style="font-style: italic; color: #666;">No websites yet. Create one in <strong>Code Studio</strong>!</p>'
        : `<div class="browser-bookmarks">${htmlFiles.map(f => `
            <div class="browser-bookmark" data-file="${escapeAttr(f)}">
              <div class="browser-bookmark-icon">🌐</div>
              <div class="browser-bookmark-name">${escapeHtml(f)}</div>
            </div>
          `).join('')}</div>`
      }

      <h2 style="margin-top: 24px;">External URLs</h2>
      <p style="font-size: 12px;">Enter a URL in the address bar above. Note: many sites block embedding for security.</p>
    `;

    $home.querySelectorAll('.browser-bookmark').forEach(b => {
      b.addEventListener('click', () => {
        navigateToVFS('/home/user/websites/' + b.dataset.file);
      });
    });
  }

  /* ---------- Navigate to VFS file ---------- */
  function navigateToVFS(filePath, pushHistory = true) {
    const parts = filePath.split('/').filter(Boolean);
    const node = getNode(parts);

    if (!node || node.type !== 'file') {
      showWarning(`File not found: ${filePath}`);
      $status.textContent = `Error · ${filePath}`;
      return;
    }

    // ensure sandbox + srcdoc
    $iframe.setAttribute('sandbox',
      'allow-scripts allow-same-origin allow-forms allow-modals allow-popups');
    $iframe.removeAttribute('src');
    $iframe.srcdoc = node.content;

    $home.classList.add('hidden');
    $iframe.classList.remove('hidden');
    $warning.classList.add('hidden');
    $url.value = filePath;
    $status.textContent = `file://${filePath}`;
    currentType = 'vfs';
    currentPath = filePath;
    currentUrl  = null;

    if (pushHistory) pushToHistory({ type: 'vfs', path: filePath });
  }

  /* ---------- Navigate to external URL ---------- */
  function navigateToURL(url, pushHistory = true) {
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    try { new URL(finalUrl); }
    catch (e) { showWarning('Invalid URL'); return; }

    // for external URLs, remove sandbox to maximize compatibility
    $iframe.removeAttribute('sandbox');
    $iframe.removeAttribute('srcdoc');
    $iframe.src = finalUrl;

    $home.classList.add('hidden');
    $iframe.classList.remove('hidden');
    $url.value = finalUrl;
    $status.textContent = `Loading: ${finalUrl}`;
    currentType = 'url';
    currentPath = null;
    currentUrl  = finalUrl;

    showWarning('Note: Many websites block being displayed in an embedded browser due to security policies.');

    if (pushHistory) pushToHistory({ type: 'url', url: finalUrl });
  }

  $iframe.addEventListener('load', () => {
    if (currentType === 'url' && currentUrl) {
      $status.textContent = `Loaded: ${currentUrl}`;
    }
  });

  /* ---------- Warning ---------- */
  function showWarning(msg) {
    $warning.textContent = msg;
    $warning.classList.remove('hidden');
  }

  /* ---------- History ---------- */
  function pushToHistory(entry) {
    history = history.slice(0, historyIndex + 1);
    history.push(entry);
    if (history.length > HISTORY_MAX) history.shift();
    historyIndex = history.length - 1;
    updateNavButtons();
  }

  function navigateTo(entry, fromHistory) {
    if (entry.type === 'home')      showHome();
    else if (entry.type === 'vfs')  navigateToVFS(entry.path, !fromHistory);
    else if (entry.type === 'url')  navigateToURL(entry.url, !fromHistory);
  }

  function goBack() {
    if (historyIndex <= 0) return;
    historyIndex--;
    navigateTo(history[historyIndex], true);
    updateNavButtons();
  }

  function goForward() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    navigateTo(history[historyIndex], true);
    updateNavButtons();
  }

  /* ---------- URL bar input ---------- */
  function navigateFromUrl() {
    const input = $url.value.trim();
    if (!input) { pushToHistory({ type: 'home' }); showHome(); return; }

    if (input.startsWith('/') || input.startsWith('~')) {
      let p = input;
      if (p.startsWith('~')) p = '/home/user' + p.slice(1);
      navigateToVFS(p);
    } else if (/^https?:\/\//i.test(input) || input.includes('.')) {
      navigateToURL(input);
    } else {
      navigateToVFS('/home/user/websites/' + input);
    }
  }

  $url.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); navigateFromUrl(); }
  });

  /* ---------- Toolbar ---------- */
  container.querySelectorAll('.browser-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'back') goBack();
      else if (action === 'forward') goForward();
      else if (action === 'refresh') {
        if (currentType === 'vfs' && currentPath) navigateToVFS(currentPath, false);
        else if (currentType === 'url' && currentUrl) navigateToURL(currentUrl, false);
        else showHome();
      }
      else if (action === 'home') {
        pushToHistory({ type: 'home' });
        showHome();
      }
      else if (action === 'go') navigateFromUrl();
    });
  });

  /* ---------- Initial navigation ---------- */
  if (options.initialPath) {
    setTimeout(() => navigateToVFS(options.initialPath), 50);
  } else {
    pushToHistory({ type: 'home' });
    showHome();
  }

  /* ---------- External navigation API ---------- */
  win.navigateTo    = (path) => navigateToVFS(path);
  win.navigateToUrl = (url)  => navigateToURL(url);

  updateNavButtons();
}

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
