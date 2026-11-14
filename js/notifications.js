/* ============================================================
   Icons
   ============================================================ */
const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M8 12 L11 15 L16 9"/>
    </svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M9 9 L15 15 M15 9 L9 15"/>
    </svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3 L22 20 H2 Z"/><path d="M12 9 V14"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>
    </svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 11 V16"/><circle cx="12" cy="8" r="0.6" fill="currentColor"/>
    </svg>`,
  danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M9 9 L15 15 M15 9 L9 15"/>
    </svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M6 6 L18 18 M18 6 L6 18"/>
    </svg>`,
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
     Toast
     ============================================================ */
let toastContainer = null;
let toastCounter = 0;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * @param {Object} opts
 * @param {'success'|'error'|'warning'|'info'} opts.type
 * @param {string} [opts.title]
 * @param {string} opts.message
 * @param {number} [opts.duration]  ms; 0 = persistent
 */
export function showToast(opts = {}) {
  const { type = "info", title, message = "", duration } = opts;

  const defaults = { success: 3000, error: 5000, warning: 4000, info: 3000 };
  const finalDuration = duration ?? defaults[type] ?? 3000;

  const container = getToastContainer();
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.dataset.toastId = "toast-" + ++toastCounter;

  el.innerHTML = `
      <div class="toast-icon">${ICONS[type] || ICONS.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ""}
        ${
          message
            ? `<div class="toast-message">${escapeHtml(message)}</div>`
            : ""
        }
      </div>
      <button class="toast-close" title="Close">${ICONS.close}</button>
      ${
        finalDuration > 0
          ? `<div class="toast-progress" style="animation-duration:${finalDuration}ms"></div>`
          : ""
      }
    `;

  el.querySelector(".toast-close").addEventListener("click", () =>
    removeToast(el)
  );
  container.appendChild(el);

  let timer = null;
  if (finalDuration > 0) {
    timer = setTimeout(() => removeToast(el), finalDuration);
  }

  el.addEventListener("mouseenter", () => {
    if (timer) clearTimeout(timer);
    const bar = el.querySelector(".toast-progress");
    if (bar) bar.style.animationPlayState = "paused";
  });
  el.addEventListener("mouseleave", () => {
    if (finalDuration > 0) {
      timer = setTimeout(() => removeToast(el), 1500);
      const bar = el.querySelector(".toast-progress");
      if (bar) bar.style.animationPlayState = "running";
    }
  });

  return el.dataset.toastId;
}

function removeToast(el) {
  if (el.classList.contains("removing")) return;
  el.classList.add("removing");
  setTimeout(() => el.remove(), 220);
}

/* convenience API */
export const toast = {
  success: (message, opts = {}) =>
    showToast({ type: "success", message, ...opts }),
  error: (message, opts = {}) => showToast({ type: "error", message, ...opts }),
  warning: (message, opts = {}) =>
    showToast({ type: "warning", message, ...opts }),
  info: (message, opts = {}) => showToast({ type: "info", message, ...opts }),
};

/* ============================================================
     Dialog (alert / confirm / prompt)
     ============================================================ */
let dialogOverlay = null;
let currentDialog = null;

function getDialogOverlay() {
  if (!dialogOverlay) {
    dialogOverlay = document.createElement("div");
    dialogOverlay.id = "dialogOverlay";
    document.body.appendChild(dialogOverlay);
    dialogOverlay.addEventListener("mousedown", (e) => {
      if (e.target === dialogOverlay && currentDialog) {
        currentDialog.close(null, false);
      }
    });
  }
  return dialogOverlay;
}

/**
 * @param {Object} config
 * @param {'info'|'warning'|'danger'|'success'} [config.type]
 * @param {string} config.title
 * @param {string} [config.message]
 * @param {boolean} [config.input]
 * @param {string} [config.defaultValue]
 * @param {string} [config.placeholder]
 * @param {Array<{label:string, variant?:string, value?:any}>} config.buttons
 * @returns {Promise<any>}
 */
function openDialog(config) {
  return new Promise((resolve) => {
    // اقفل أي dialog مفتوح
    if (currentDialog) currentDialog.close(null, false);

    const overlay = getDialogOverlay();
    const {
      type = "info",
      title,
      message,
      input,
      defaultValue = "",
      placeholder = "",
      buttons = [{ label: "OK", variant: "primary", value: true }],
    } = config;

    overlay.innerHTML = `
        <div class="dialog-panel">
          ${
            type
              ? `<div class="dialog-icon ${type}">${
                  ICONS[type] || ICONS.info
                }</div>`
              : ""
          }
          ${title ? `<div class="dialog-title">${escapeHtml(title)}</div>` : ""}
          ${
            message
              ? `<div class="dialog-message">${escapeHtml(message)}</div>`
              : ""
          }
          ${
            input
              ? `<input class="dialog-input" placeholder="${escapeHtml(
                  placeholder
                )}" value="${escapeHtml(defaultValue)}" />`
              : ""
          }
          <div class="dialog-buttons"></div>
        </div>
      `;

    const $buttons = overlay.querySelector(".dialog-buttons");
    const $input = overlay.querySelector(".dialog-input");

    function finalize(value, confirmed) {
      document.removeEventListener("keydown", keydownHandler, true);
      overlay.classList.remove("open");
      setTimeout(() => {
        if (currentDialog && currentDialog.close === finalize) {
          overlay.innerHTML = "";
          currentDialog = null;
        }
      }, 160);
      resolve(confirmed ? value : null);
    }

    function close(value, confirmed) {
      finalize(value, confirmed);
    }

    buttons.forEach((btnConfig) => {
      const btn = document.createElement("button");
      btn.className = "dialog-btn " + (btnConfig.variant || "secondary");
      btn.textContent = btnConfig.label;
      btn.addEventListener("click", () => {
        const value =
          btnConfig.value !== undefined
            ? btnConfig.value
            : $input
            ? $input.value
            : null;
        close(value, true);
      });
      $buttons.appendChild(btn);
    });

    function keydownHandler(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(null, false);
      } else if (e.key === "Enter" && !e.shiftKey) {
        if ($input && document.activeElement !== $input) return;
        e.preventDefault();
        const first = buttons[0];
        if (first) {
          const value =
            first.value !== undefined
              ? first.value
              : $input
              ? $input.value
              : null;
          close(value, true);
        }
      }
    }
    document.addEventListener("keydown", keydownHandler, true);

    currentDialog = { close };

    requestAnimationFrame(() => overlay.classList.add("open"));

    if ($input) {
      setTimeout(() => {
        $input.focus();
        $input.select();
      }, 60);
    } else {
      // focus أول زر
      setTimeout(() => {
        const firstBtn = $buttons.querySelector(".dialog-btn");
        if (firstBtn) firstBtn.focus();
      }, 60);
    }
  });
}

/* ---------- Public API ---------- */
export function showAlert(title, message, options = {}) {
  return openDialog({
    type: options.type || "info",
    title,
    message,
    buttons: [
      { label: options.okText || "OK", variant: "primary", value: true },
    ],
  });
}

export function showConfirm(title, message, options = {}) {
  return openDialog({
    type: options.type || (options.danger ? "danger" : "warning"),
    title,
    message,
    buttons: [
      {
        label: options.cancelText || "Cancel",
        variant: "secondary",
        value: false,
      },
      {
        label: options.okText || "OK",
        variant: options.danger ? "danger" : "primary",
        value: true,
      },
    ],
  }).then((r) => r === true);
}

export function showPrompt(title, message, defaultValue = "", options = {}) {
  return openDialog({
    type: options.type || "info",
    title,
    message,
    input: true,
    defaultValue,
    placeholder: options.placeholder || "",
    buttons: [
      {
        label: options.cancelText || "Cancel",
        variant: "secondary",
        value: null,
      },
      { label: options.okText || "OK", variant: "primary" }, // value = input value
    ],
  });
}
