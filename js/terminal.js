import {
  GLOBAL_FS,
  getNode,
  resolvePath,
  pathDisplay,
  shortPath,
} from "./vfs.js";
import { APPS } from "./apps.js";
import { createWindow } from "./window-manager.js";

export function createTerminal(container, win, options = {}) {
  container.innerHTML = `
    <div class="terminal-body">
      <div class="terminal-output"></div>
      <div class="terminal-input-line">
        <span class="terminal-prompt"></span>
        <input class="terminal-input" autocomplete="off" spellcheck="false" />
      </div>
    </div>
  `;

  const $output = container.querySelector(".terminal-output");
  const $input = container.querySelector(".terminal-input");
  const $prompt = container.querySelector(".terminal-prompt");
  const $body = container.querySelector(".terminal-body");

  // 🔑 اقرأ initialPath من أي مصدر متاح
  const initialPath =
    (options && options.initialPath) ||
    (win && win.options && win.options.initialPath) ||
    null;

  let currentPath = initialPath ? initialPath.slice() : ["home", "user"];

  const history = [];
  let historyIndex = 0;

  // expose navigation for "Open in Terminal" on existing window
  if (win) {
    win.navigateTo = (path) => {
      currentPath = path.slice();
      updatePrompt();
      $output.scrollTop = $output.scrollHeight;
    };
  }
  /* --- helpers --- */
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  function print(html) {
    const div = document.createElement("div");
    div.className = "term-line";
    div.innerHTML = html;
    $output.appendChild(div);
    $output.scrollTop = $output.scrollHeight;
  }

  function printWithPrompt(cmd) {
    print(
      '<span style="color:#4ec9b0">user@webos:<span class="term-path" style="color:#569cd6">' +
        esc(shortPath(currentPath)) +
        "</span>$</span> " +
        esc(cmd)
    );
  }

  function updatePrompt() {
    $prompt.innerHTML =
      'user@webos:<span class="term-path">' +
      esc(shortPath(currentPath)) +
      "</span>$&nbsp;";
  }

  /* --- commands --- */
  const commands = {
    help() {
      return [
        '<span class="term-info">Available commands:</span>',
        "  help               show this message",
        "  clear              clear the screen (Ctrl+L)",
        "  echo [text]        print text",
        "  date               current date & time",
        "  whoami             current user",
        "  pwd                print working directory",
        "  ls [path]          list files",
        "  cd [path]          change directory",
        "  cat [file]         show file contents",
        "  edit [file]        open file in editor",
        "  mkdir [name]       create directory",
        "  touch [name]       create empty file",
        "  rm [file]          remove file",
        "  rmdir [dir]        remove empty directory",
        "  tree [path]        show directory tree",
        "  history            show command history",
        "  open [app]         open an app (try: open files)",
      ].join("\n");
    },

    clear() {
      $output.innerHTML = "";
      return "";
    },
    echo(args) {
      return esc(args.join(" "));
    },
    date() {
      return new Date().toString();
    },
    whoami() {
      return "user";
    },
    pwd() {
      return esc(pathDisplay(currentPath));
    },

    ls(args) {
      const parts = resolvePath(args[0], currentPath);
      const node = getNode(parts);
      if (!node)
        return (
          '<span class="term-error">ls: ' +
          esc(args[0]) +
          ": No such file or directory</span>"
        );
      if (node.type === "file")
        return (
          '<span class="term-file">' + esc(parts[parts.length - 1]) + "</span>"
        );
      const names = Object.keys(node.children || {});
      if (names.length === 0) return "";
      return names
        .sort()
        .map((name) => {
          const child = node.children[name];
          return child.type === "dir"
            ? '<span class="term-dir">' + esc(name) + "/</span>"
            : '<span class="term-file">' + esc(name) + "</span>";
        })
        .join("  ");
    },

    cd(args) {
      if (!args[0]) {
        currentPath = ["home", "user"];
        updatePrompt();
        return "";
      }
      const parts = resolvePath(args[0], currentPath);
      const node = getNode(parts);
      if (!node)
        return (
          '<span class="term-error">cd: ' +
          esc(args[0]) +
          ": No such file or directory</span>"
        );
      if (node.type !== "dir")
        return (
          '<span class="term-error">cd: ' +
          esc(args[0]) +
          ": Not a directory</span>"
        );
      currentPath = parts;
      updatePrompt();
      return "";
    },

    cat(args) {
      if (!args[0])
        return '<span class="term-error">cat: missing operand</span>';
      const parts = resolvePath(args[0], currentPath);
      const node = getNode(parts);
      if (!node)
        return (
          '<span class="term-error">cat: ' +
          esc(args[0]) +
          ": No such file</span>"
        );
      if (node.type === "dir")
        return (
          '<span class="term-error">cat: ' +
          esc(args[0]) +
          ": Is a directory</span>"
        );
      return esc(node.content);
    },

    edit(args) {
      if (!args[0])
        return '<span class="term-error">edit: missing filename</span>';
      const parts = resolvePath(args[0], currentPath);
      const node = getNode(parts);
      if (!node)
        return (
          '<span class="term-error">edit: ' +
          esc(args[0]) +
          ": No such file</span>"
        );
      if (node.type === "dir")
        return (
          '<span class="term-error">edit: ' +
          esc(args[0]) +
          ": Is a directory</span>"
        );

      const fullPath = "/" + parts.join("/");
      const fileName = parts[parts.length - 1];

      createWindow("editor", {
        filePath: fullPath,
        title: fileName,
        width: 640,
        height: 480,
      });

      return (
        '<span class="term-success">Opening ' +
        esc(fileName) +
        " in editor...</span>"
      );
    },

    mkdir(args) {
      if (!args[0])
        return '<span class="term-error">mkdir: missing operand</span>';
      return createEntry(args[0], "dir");
    },

    touch(args) {
      if (!args[0])
        return '<span class="term-error">touch: missing operand</span>';
      return createEntry(args[0], "file");
    },

    rm(args) {
      if (!args[0])
        return '<span class="term-error">rm: missing operand</span>';
      const parts = resolvePath(args[0], currentPath);
      const parent = getNode(parts.slice(0, -1));
      const name = parts[parts.length - 1];
      if (!parent || !parent.children[name])
        return (
          '<span class="term-error">rm: ' +
          esc(args[0]) +
          ": No such file</span>"
        );
      if (parent.children[name].type === "dir")
        return (
          '<span class="term-error">rm: ' +
          esc(args[0]) +
          ": Is a directory</span>"
        );
      delete parent.children[name];
      return "";
    },

    rmdir(args) {
      if (!args[0])
        return '<span class="term-error">rmdir: missing operand</span>';
      const parts = resolvePath(args[0], currentPath);
      const parent = getNode(parts.slice(0, -1));
      const name = parts[parts.length - 1];
      if (!parent || !parent.children[name])
        return (
          '<span class="term-error">rmdir: ' +
          esc(args[0]) +
          ": No such directory</span>"
        );
      if (parent.children[name].type !== "dir")
        return (
          '<span class="term-error">rmdir: ' +
          esc(args[0]) +
          ": Not a directory</span>"
        );
      if (Object.keys(parent.children[name].children).length > 0)
        return (
          '<span class="term-error">rmdir: ' +
          esc(args[0]) +
          ": Directory not empty</span>"
        );
      delete parent.children[name];
      return "";
    },

    tree(args) {
      const parts = resolvePath(args[0], currentPath);
      const node = getNode(parts);
      if (!node)
        return (
          '<span class="term-error">tree: ' +
          esc(args[0] || ".") +
          ": No such file</span>"
        );
      const lines = [esc(pathDisplay(parts))];
      (function walk(n, prefix) {
        const names = Object.keys(n.children || {}).sort();
        names.forEach((name, i) => {
          const last = i === names.length - 1;
          const child = n.children[name];
          const tag =
            child.type === "dir"
              ? '<span class="term-dir">' + esc(name) + "/</span>"
              : '<span class="term-file">' + esc(name) + "</span>";
          lines.push(prefix + (last ? "└── " : "├── ") + tag);
          if (child.type === "dir")
            walk(child, prefix + (last ? "    " : "│   "));
        });
      })(node, "");
      return lines.join("\n");
    },

    history() {
      return history
        .map((c, i) => String(i + 1).padStart(3) + "  " + esc(c))
        .join("\n");
    },

    open(args) {
      if (!args[0])
        return '<span class="term-error">open: missing app name</span>';
      const id = args[0].toLowerCase();
      if (!APPS[id])
        return (
          '<span class="term-error">open: ' +
          esc(args[0]) +
          ": app not found</span>"
        );
      createWindow(id);
      return (
        '<span class="term-success">Opening ' + APPS[id].name + "...</span>"
      );
    },
  };

  function createEntry(p, type) {
    const parts = resolvePath(p, currentPath);
    const parent = getNode(parts.slice(0, -1));
    const name = parts[parts.length - 1];
    const cmd = type === "dir" ? "mkdir" : "touch";
    if (!parent)
      return (
        '<span class="term-error">' +
        cmd +
        ": " +
        esc(p) +
        ": No such directory</span>"
      );
    if (parent.children[name])
      return (
        '<span class="term-error">' +
        cmd +
        ": " +
        esc(p) +
        ": Already exists</span>"
      );
    parent.children[name] =
      type === "dir"
        ? { type: "dir", children: {} }
        : { type: "file", content: "" };
    return "";
  }

  function runCommand(line) {
    const trimmed = line.trim();
    printWithPrompt(trimmed);
    if (!trimmed) return;

    history.push(trimmed);
    historyIndex = history.length;

    const tokens = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const cmd = tokens[0];
    const args = tokens.slice(1).map((a) => a.replace(/^"|"$/g, ""));

    const fn = commands[cmd];
    if (!fn) {
      print(
        '<span class="term-error">' + esc(cmd) + ": command not found</span>"
      );
      return;
    }
    try {
      const result = fn(args);
      if (result) print(result);
    } catch (e) {
      print('<span class="term-error">Error: ' + esc(e.message) + "</span>");
    }
    $output.scrollTop = $output.scrollHeight;
  }

  $input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = $input.value;
      $input.value = "";
      runCommand(value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        $input.value = history[historyIndex] || "";
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < history.length) {
        historyIndex++;
        $input.value = history[historyIndex] || "";
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleTab();
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      printWithPrompt($input.value + "^C");
      $input.value = "";
    }
  });

  function handleTab() {
    const value = $input.value;
    const tokens = value.split(" ");
    const last = tokens[tokens.length - 1] || "";
    let candidates = [];
    if (tokens.length === 1) {
      candidates = Object.keys(commands).filter((c) => c.startsWith(last));
    } else {
      const node = getNode(currentPath);
      if (node && node.children) {
        candidates = Object.keys(node.children).filter((c) =>
          c.startsWith(last)
        );
      }
    }
    if (candidates.length === 1) {
      tokens[tokens.length - 1] = candidates[0];
      $input.value = tokens.join(" ") + (tokens.length === 1 ? " " : "");
    } else if (candidates.length > 1) {
      printWithPrompt(value);
      print(candidates.map((c) => esc(c)).join("  "));
    }
  }

  $body.addEventListener("click", () => $input.focus());

  print('<span class="term-info">WebOS Terminal v0.1</span>');
  print(
    'Type <span class="term-success">help</span> to see available commands.'
  );
  print(
    'Try: <span class="term-success">ls</span>, <span class="term-success">edit readme.txt</span>, <span class="term-success">open files</span>'
  );
  print("");

  updatePrompt();
  setTimeout(() => $input.focus(), 30);
}
