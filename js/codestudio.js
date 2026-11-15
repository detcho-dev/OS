import { getNode, saveFS } from './vfs.js';
import { createWindow } from './window-manager.js';
import { toast, showPrompt, showConfirm } from './notifications.js';

const DEFAULT_HTML = '';
const DEFAULT_CSS  = '';
const DEFAULT_JS   = '';

function ensureWebsitesDir() {
  const home = getNode(['home', 'user']);
  if (!home) return null;
  if (!home.children.websites) {
    home.children.websites = { type: 'dir', children: {} };
    saveFS(true);
  }
  return home.children.websites;
}

function buildPreviewDoc(p) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${p.css}</style>
</head>
<body>
${p.html}
<script>${p.js}<\/script>
</body>
</html>`;
}

/* ============================================================
   دالة تلوين الأكواد (Syntax Highlighting)
   ============================================================ */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   دالة تلوين الأكواد باستخدام Prism.js
   ============================================================ */
function highlightCode(code, lang) {
  if (typeof Prism === 'undefined') {
    // Fallback في حالة إن الإنترنت قطع ومكتبة Prism محملتش
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '\n';
  }

  let grammar = Prism.languages.markup;
  if (lang === 'css') grammar = Prism.languages.css;
  if (lang === 'js')  grammar = Prism.languages.javascript;

  // Prism بيهرب الأكواد ويحط الألوان أوتوماتيك
  return Prism.highlight(code, grammar, lang) + '\n';
}

export function createCodeStudio(container, win, options = {}) {
  let project = {
    name: null,
    html: DEFAULT_HTML,
    css:  DEFAULT_CSS,
    js:   DEFAULT_JS,
    currentTab: 'html',
  };
  let isDirty = true;
  let previewTimer = null;

  ensureWebsitesDir();

  // Load existing project if path provided
  if (options.filePath) {
    const parts = options.filePath.split('/').filter(Boolean);
    const node = getNode(parts);
    if (node && node.type === 'file') {
      try {
        const data = JSON.parse(node.content);
        project.name = data.name || parts[parts.length - 1].replace(/\.cs\.json$/, '');
        project.html = data.html ?? DEFAULT_HTML;
        project.css  = data.css  ?? DEFAULT_CSS;
        project.js   = data.js   ?? DEFAULT_JS;
        isDirty = false;
      } catch (e) {
        toast.error('Failed to load project');
      }
    }
  }

  container.innerHTML = `
    <div class="cs-app">
      <div class="cs-toolbar">
        <button class="cs-btn" data-action="new">New</button>
        <button class="cs-btn" data-action="open">Open</button>
        <button class="cs-btn" data-action="save">Save</button>
        <button class="cs-btn" data-action="save-as">Save As</button>
        <div class="cs-spacer"></div>
      </div>
      <div class="cs-tabs">
        <button class="cs-tab active" data-tab="html">HTML</button>
        <button class="cs-tab" data-tab="css">CSS</button>
        <button class="cs-tab" data-tab="js">JS</button>
      </div>
      <div class="cs-body">
        <div class="cs-editor-pane">
          <div class="cs-editor-wrap">
            <div class="cs-line-numbers" id="csLineNumbers"></div>
            <div class="cs-editor-inner">
              <pre class="cs-highlight-layer" id="csHighlight" aria-hidden="true"></pre>
              <textarea class="cs-editor" id="csEditor" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
            </div>
          </div>
        </div>
        <div class="cs-preview-pane">
          <div class="cs-preview-header">
            <span>Preview</span>
            <div style="display: flex; gap: 6px;">
              <button class="cs-btn small primary" data-action="open-browser">Open in Browser</button>
              <button class="cs-btn small" data-action="refresh-preview">Refresh</button>
            </div>
          </div>
          <iframe class="cs-preview-iframe" id="csPreview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"></iframe>
        </div>
      </div>
      <div class="cs-status">
        <span class="cs-status-file" id="csStatusFile">Untitled</span>
        <span class="cs-status-dirty" id="csStatusDirty"></span>
        <span class="cs-status-info" id="csStatusInfo"></span>
      </div>
    </div>
  `;

  const $editor       = container.querySelector('#csEditor');
  const $highlight    = container.querySelector('#csHighlight');
  const $lineNumbers  = container.querySelector('#csLineNumbers');
  const $preview      = container.querySelector('#csPreview');
  const $statusFile   = container.querySelector('#csStatusFile');
  const $statusDirty  = container.querySelector('#csStatusDirty');
  const $statusInfo   = container.querySelector('#csStatusInfo');

  /* ---------- Editor sync ---------- */
  function updateEditor() {
    $editor.value = project[project.currentTab] || '';
    updateHighlight();
    updateLineNumbers();
    updateStatus();
    syncScroll();
  }

  function updateHighlight() {
    $highlight.innerHTML = highlightCode($editor.value, project.currentTab);
  }

  function updateLineNumbers() {
    const lines = ($editor.value || '').split('\n').length;
    const arr = [];
    for (let i = 1; i <= lines; i++) arr.push(i);
    $lineNumbers.innerHTML = arr.join('<br>');
  }

  function syncScroll() {
    $lineNumbers.scrollTop = $editor.scrollTop;
    $highlight.scrollTop = $editor.scrollTop;
    $highlight.scrollLeft = $editor.scrollLeft;
  }

  function updateStatus() {
    $statusFile.textContent = project.name || 'Untitled';
    $statusDirty.textContent = isDirty ? '● Unsaved' : '';
    const lines = ($editor.value || '').split('\n').length;
    const chars = ($editor.value || '').length;
    $statusInfo.textContent = `${project.currentTab.toUpperCase()} · ${lines} lines · ${chars} chars`;
  }

  function updatePreview() {
    $preview.srcdoc = buildPreviewDoc(project);
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 400);
  }

  /* ---------- Editor events ---------- */
  $editor.addEventListener('input', () => {
    project[project.currentTab] = $editor.value;
    isDirty = true;
    updateHighlight();
    updateLineNumbers();
    updateStatus();
    schedulePreview();
  });

  $editor.addEventListener('scroll', syncScroll);

  $editor.addEventListener('keydown', (e) => {
    // Tab = 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = $editor.selectionStart;
      const end   = $editor.selectionEnd;
      $editor.value =
        $editor.value.substring(0, start) + '  ' + $editor.value.substring(end);
      $editor.selectionStart = $editor.selectionEnd = start + 2;
      project[project.currentTab] = $editor.value;
      isDirty = true;
      updateHighlight();
      updateLineNumbers();
      updateStatus();
      schedulePreview();
      return;
    }
    // Ctrl+S = save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveProject();
      return;
    }
  });

  /* ---------- Tabs ---------- */
  container.querySelectorAll('.cs-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      project[project.currentTab] = $editor.value;
      project.currentTab = btn.dataset.tab;
      container.querySelectorAll('.cs-tab').forEach(b =>
        b.classList.toggle('active', b === btn));
      updateEditor();
    });
  });

  /* ---------- Toolbar ---------- */
  container.querySelectorAll('.cs-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'new')             newProject();
      else if (action === 'open')       openProject();
      else if (action === 'save')       saveProject();
      else if (action === 'save-as')    saveProjectAs();
      else if (action === 'refresh-preview') updatePreview();
      else if (action === 'open-browser')    openInBrowser();
    });
  });

  /* ---------- Actions ---------- */
  async function newProject() {
    if (isDirty && project.name) {
      const ok = await showConfirm(
        'Unsaved Changes',
        'Discard changes and start a new project?',
        { okText: 'Discard' }
      );
      if (!ok) return;
    }
    project = {
      name: null,
      html: DEFAULT_HTML,
      css:  DEFAULT_CSS,
      js:   DEFAULT_JS,
      currentTab: project.currentTab,
    };
    isDirty = false;
    updateEditor();
    updatePreview();
    toast.info('New project');
  }

  async function askName() {
    const name = await showPrompt('Save Project', 'Project name:', project.name || 'my-website');
    if (!name) return null;
    const trimmed = name.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
    if (!trimmed) { toast.error('Invalid name'); return null; }
    return trimmed;
  }

  async function saveProject() {
    if (!project.name) {
      const name = await askName();
      if (!name) return false;
      return doSave(name);
    }
    return doSave(project.name);
  }

  async function saveProjectAs() {
    const name = await askName();
    if (!name) return false;
    return doSave(name);
  }

  function doSave(name) {
    const dir = ensureWebsitesDir();
    if (!dir) { toast.error('Cannot access websites folder'); return false; }

    const data = {
      name,
      html: project.html,
      css:  project.css,
      js:   project.js,
      updatedAt: Date.now(),
    };

    dir.children[`${name}.cs.json`] = {
      type: 'file',
      content: JSON.stringify(data, null, 2),
    };

    dir.children[`${name}.html`] = {
      type: 'file',
      content: buildPreviewDoc(project),
    };

    saveFS(true);
    project.name = name;
    isDirty = false;
    updateStatus();
    toast.success(`Saved as "${name}"`);
    return true;
  }

  async function openProject() {
    const dir = ensureWebsitesDir();
    if (!dir) return;

    const files = Object.keys(dir.children).filter(n => n.endsWith('.cs.json'));
    if (files.length === 0) {
      toast.info('No saved projects yet');
      return;
    }

    const namesList = files.map(f => '  • ' + f.replace(/\.cs\.json$/, '')).join('\n');
    const name = await showPrompt(
      'Open Project',
      'Available projects:\n' + namesList + '\n\nEnter project name:',
      ''
    );
    if (!name) return;

    const fileName = name.trim() + '.cs.json';
    const node = dir.children[fileName];
    if (!node) { toast.error('Project not found'); return; }

    if (isDirty) {
      const ok = await showConfirm(
        'Unsaved Changes',
        'Discard current changes?',
        { okText: 'Discard' }
      );
      if (!ok) return;
    }

    try {
      const data = JSON.parse(node.content);
      project.name  = data.name || name.trim();
      project.html  = data.html ?? DEFAULT_HTML;
      project.css   = data.css  ?? DEFAULT_CSS;
      project.js    = data.js   ?? DEFAULT_JS;
      isDirty = false;
      updateEditor();
      updatePreview();
      toast.success(`Opened "${project.name}"`);
    } catch (e) {
      toast.error('Failed to load project');
    }
  }

  async function openInBrowser() {
    if (!project.name) {
      const name = await askName();
      if (!name) return;
      const ok = doSave(name);
      if (!ok) return;
    } else {
      doSave(project.name);
    }
    const filePath = `/home/user/websites/${project.name}.html`;
    createWindow('browser', { initialPath: filePath });
  }

  /* ---------- Close guard ---------- */
  win.beforeClose = async () => {
    if (!isDirty) return true;
    return await showConfirm(
      'Unsaved Changes',
      'You have unsaved changes. Close anyway?',
      { danger: true, okText: 'Close anyway' }
    );
  };

  /* ---------- Init ---------- */
  updateEditor();
  updatePreview();
}
