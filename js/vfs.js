// Virtual File System — مشترك بين كل التطبيقات
export const GLOBAL_FS = {
  type: "dir",
  children: {
    home: {
      type: "dir",
      children: {
        user: {
          type: "dir",
          children: {
            "readme.txt": {
              type: "file",
              content:
                "Welcome to WebOS!\n" +
                'Type "help" to see available commands.\n' +
                "Try: ls, cat readme.txt, open files",
            },
            "notes.txt": {
              type: "file",
              content:
                "My first note:\n- build terminal\n- build file explorer\n- ship it",
            },
            projects: { type: "dir", children: {} },
          },
        },
      },
    },
    etc: {
      type: "dir",
      children: {
        "os-release": {
          type: "file",
          content: "NAME=WebOS\nVERSION=0.1.0\nSHELL=webshell\nUSER=user",
        },
      },
    },
    tmp: { type: "dir", children: {} },
  },
};

/* --- helper functions --- */
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
  const parts = p.startsWith("/") ? [] : [...currentPath];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts;
}

export function pathDisplay(parts) {
  return "/" + parts.join("/");
}

export function shortPath(parts) {
  if (parts[0] === "home" && parts[1] === "user") {
    return "~" + (parts.length > 2 ? "/" + parts.slice(2).join("/") : "");
  }
  return "/" + parts.join("/");
}
