const isMac =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

const MAC_GLYPH: Record<string, string> = {
  mod: "⌘",
  meta: "⌘",
  cmd: "⌘",
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  enter: "⏎",
  return: "⏎",
  escape: "⎋",
  esc: "⎋",
  backspace: "⌫",
  delete: "⌦",
  tab: "⇥",
  space: "␣",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
};

const WIN_LABEL: Record<string, string> = {
  mod: "Ctrl",
  meta: "Win",
  cmd: "Ctrl",
  ctrl: "Ctrl",
  control: "Ctrl",
  alt: "Alt",
  option: "Alt",
  shift: "Shift",
  enter: "Enter",
  return: "Enter",
  escape: "Esc",
  esc: "Esc",
};

const ORDER = ["ctrl", "control", "alt", "option", "shift", "mod", "meta", "cmd"];

function sortParts(parts: string[]): string[] {
  const mods = parts.filter((p) => ORDER.includes(p));
  const rest = parts.filter((p) => !ORDER.includes(p));
  mods.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return [...mods, ...rest];
}

export function formatKeys(keys: string): string {
  const parts = keys
    .toLowerCase()
    .replace(/\s+/g, "")
    .split("+");
  const ordered = sortParts(parts);
  if (isMac) {
    return ordered
      .map((p) => MAC_GLYPH[p] ?? p.toUpperCase())
      .join("");
  }
  return ordered
    .map((p) => WIN_LABEL[p] ?? p.charAt(0).toUpperCase() + p.slice(1))
    .join("+");
}
