import { APPS } from "./apps.js";
import { CATALOG } from "./store-catalog.js";
import { isInstalled, installApp, uninstallApp } from "./store-registry.js";
import { toast, showConfirm } from "./notifications.js";
import {
  createWindow,
  getWindowsByApp,
  closeWindow,
} from "./window-manager.js";

const CATEGORIES = [
  "All",
  "Featured",
  "System",
  "Utilities",
  "Productivity",
  "Graphics",
  "Multimedia",
  "Games",
];

let state = {
  view: "browse",
  category: "All",
  search: "",
  selectedAppId: null,
};

export function createStore(container, win) {
  container.innerHTML = `
    <div class="store-app">
      <div class="store-header" id="storeHeader"></div>
      <div class="store-tabs" id="storeTabs"></div>
      <div class="store-content" id="storeContent"></div>
    </div>
  `;

  const $header = container.querySelector("#storeHeader");
  const $tabs = container.querySelector("#storeTabs");
  const $content = container.querySelector("#storeContent");

  function render() {
    if (state.view === "detail") renderDetail();
    else renderBrowse();
  }

  /* ============ Browse ============ */
  function renderBrowse() {
    $header.innerHTML = `
      <button class="store-back-btn hidden">←</button>
      <input class="store-search" placeholder="Search apps…" value="${escapeHtml(
        state.search
      )}" autocomplete="off" />
    `;

    const $search = $header.querySelector(".store-search");
    $search.addEventListener("input", () => {
      state.search = $search.value;
      renderContent();
    });

    $tabs.innerHTML = "";
    for (const cat of CATEGORIES) {
      const btn = document.createElement("button");
      btn.className = "store-tab" + (state.category === cat ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        state.category = cat;
        render();
      });
      $tabs.appendChild(btn);
    }

    renderContent();
  }

  function renderContent() {
    $content.innerHTML = "";

    let apps = CATALOG.filter((a) => {
      if (state.search) {
        const q = state.search.toLowerCase();
        const match =
          a.name.toLowerCase().includes(q) ||
          (a.desc || "").toLowerCase().includes(q) ||
          (a.longDesc || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (state.category === "All") return true;
      if (state.category === "Featured") return a.featured;
      return a.category === state.category;
    });

    if (apps.length === 0) {
      $content.innerHTML = `<div class="store-empty">No apps match</div>`;
      return;
    }

    const showFeatured = state.category === "All" && !state.search;
    if (showFeatured) {
      const featured = apps.filter((a) => a.featured);
      if (featured.length > 0) {
        const h = document.createElement("div");
        h.className = "store-section-title";
        h.textContent = "Featured";
        $content.appendChild(h);

        const grid = document.createElement("div");
        grid.className = "store-featured-grid";
        for (const app of featured) {
          grid.appendChild(buildFeaturedCard(app));
        }
        $content.appendChild(grid);
      }
      apps = apps.filter((a) => !a.featured);
      if (apps.length === 0) return;

      const h2 = document.createElement("div");
      h2.className = "store-section-title";
      h2.textContent = "All Apps";
      $content.appendChild(h2);
    }

    const grid = document.createElement("div");
    grid.className = "store-grid";
    for (const app of apps) {
      grid.appendChild(buildAppCard(app));
    }
    $content.appendChild(grid);
  }

  function buildFeaturedCard(app) {
    const card = document.createElement("div");
    card.className = "featured-card";
    card.style.background = app.tint;
    card.innerHTML = `
      <div class="featured-card-icon">${app.icon}</div>
      <div class="featured-card-info">
        <div class="featured-card-tag">Featured</div>
        <div class="featured-card-name">${escapeHtml(app.name)}</div>
        <div class="featured-card-desc">${escapeHtml(app.desc)}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      state.view = "detail";
      state.selectedAppId = app.id;
      render();
    });
    return card;
  }

  function buildAppCard(app) {
    const card = document.createElement("div");
    card.className = "app-card";

    const installed = isInstalled(app.id);

    card.innerHTML = `
      <div class="app-card-header">
        <div class="app-card-icon" style="background:${app.tint}">${
      app.icon
    }</div>
        <div class="app-card-meta">
          <div class="app-card-name">${escapeHtml(app.name)}</div>
          <div class="app-card-dev">${escapeHtml(app.developer)}</div>
        </div>
      </div>
      <div class="app-card-desc">${escapeHtml(app.desc)}</div>
      <div class="app-card-btn-wrap"></div>
    `;

    const btnWrap = card.querySelector(".app-card-btn-wrap");
    btnWrap.appendChild(buildCardButton(app));

    card.addEventListener("click", (e) => {
      if (e.target.closest(".app-card-btn")) return;
      state.view = "detail";
      state.selectedAppId = app.id;
      render();
    });

    return card;
  }

  function buildCardButton(app) {
    if (app.comingSoon) {
      const btn = document.createElement("button");
      btn.className = "app-card-btn soon";
      btn.textContent = "Coming soon";
      btn.disabled = true;
      return btn;
    }

    const installed = isInstalled(app.id);
    const btn = document.createElement("button");
    btn.className = "app-card-btn " + (installed ? "open" : "install");
    btn.textContent = installed ? "Open" : "Install";

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (installed) {
        createWindow(app.id);
      } else {
        btn.className = "app-card-btn installing";
        btn.textContent = "Installing…";
        btn.disabled = true;
        await sleep(500);
        installApp(app.id);
        toast.success(`${app.name} installed`);
        render();
      }
    });

    return btn;
  }

  /* ============ Detail ============ */
  function renderDetail() {
    const app = CATALOG.find((a) => a.id === state.selectedAppId);
    if (!app) {
      state.view = "browse";
      render();
      return;
    }

    $header.innerHTML = `
      <button class="store-back-btn" id="storeBack">←</button>
      <input class="store-search" placeholder="Search apps…" value="${escapeHtml(
        state.search
      )}" autocomplete="off" />
    `;
    $header.querySelector("#storeBack").addEventListener("click", () => {
      state.view = "browse";
      render();
    });
    $header.querySelector(".store-search").addEventListener("input", (e) => {
      state.search = e.target.value;
      state.view = "browse";
      render();
    });

    $tabs.innerHTML = "";

    const installed = isInstalled(app.id);
    const isBuiltin = app.builtin;

    $content.innerHTML = `
      <div class="store-detail">
        <div class="detail-header">
          <div class="detail-icon" style="background:${app.tint}">${
      app.icon
    }</div>
          <div class="detail-info">
            <div class="detail-name">${escapeHtml(app.name)}</div>
            <div class="detail-dev">by ${escapeHtml(app.developer)}</div>
            <div class="detail-desc">${escapeHtml(
              app.longDesc || app.desc
            )}</div>

            <div class="detail-meta">
              <div class="detail-meta-item">
                <div class="detail-meta-label">Version</div>
                <div class="detail-meta-value">${escapeHtml(app.version)}</div>
              </div>
              <div class="detail-meta-item">
                <div class="detail-meta-label">Size</div>
                <div class="detail-meta-value">${escapeHtml(app.size)}</div>
              </div>
              <div class="detail-meta-item">
                <div class="detail-meta-label">Category</div>
                <div class="detail-meta-value">${escapeHtml(app.category)}</div>
              </div>
            </div>

            <div class="detail-actions" id="detailActions"></div>
          </div>
        </div>

        <div class="detail-screenshots">
          <div class="detail-shot" style="background:${
            app.tint
          }; opacity: 0.6">${app.icon}</div>
          <div class="detail-shot" style="background:linear-gradient(135deg,#333,#222)"></div>
          <div class="detail-shot" style="background:linear-gradient(135deg,#2a2a2e,#1a1a1d)"></div>
        </div>
      </div>
    `;

    const $actions = $content.querySelector("#detailActions");

    if (app.comingSoon) {
      const btn = document.createElement("button");
      btn.className = "detail-btn secondary";
      btn.textContent = "Coming soon";
      btn.disabled = true;
      $actions.appendChild(btn);
      return;
    }

    if (installed) {
      const openBtn = document.createElement("button");
      openBtn.className = "detail-btn primary";
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => createWindow(app.id));
      $actions.appendChild(openBtn);

      if (!isBuiltin) {
        const delBtn = document.createElement("button");
        delBtn.className = "detail-btn danger";
        delBtn.textContent = "Uninstall";
        delBtn.addEventListener("click", () => handleUninstall(app));
        $actions.appendChild(delBtn);
      }
    } else {
      const installBtn = document.createElement("button");
      installBtn.className = "detail-btn primary";
      installBtn.textContent = "Install";
      installBtn.addEventListener("click", async () => {
        installBtn.className = "detail-btn installing";
        installBtn.textContent = "Installing…";
        installBtn.disabled = true;
        await sleep(500);
        installApp(app.id);
        toast.success(`${app.name} installed`);
        render();
      });
      $actions.appendChild(installBtn);
    }
  }

  async function handleUninstall(app) {
    const ok = await showConfirm(
      "Uninstall App",
      `Uninstall "${app.name}"? Your data will remain in the file system.`,
      { danger: true, okText: "Uninstall" }
    );
    if (!ok) return;

    // close any windows of this app
    const wins = getWindowsByApp(app.id);
    for (const w of wins) await closeWindow(w.instanceId);

    uninstallApp(app.id);
    toast.success(`${app.name} uninstalled`);
    state.view = "browse";
    render();
  }

  render();
}

/* ---------- helpers ---------- */
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
