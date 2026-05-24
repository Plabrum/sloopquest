import type { ShortcutDef } from "./types";

const registry = new Map<string, ShortcutDef>();
const keyIndex = new Map<string, string>();

function normalizeKeys(keys: string): string {
  return keys
    .toLowerCase()
    .replace(/\s+/g, "")
    .split("+")
    .sort()
    .join("+");
}

function keyFor(def: Pick<ShortcutDef, "keys" | "scope">): string {
  return `${def.scope}:${normalizeKeys(def.keys)}`;
}

export function registerShortcut(def: ShortcutDef): void {
  const existing = registry.get(def.id);
  if (existing) {
    throw new Error(
      `Shortcut id "${def.id}" is already registered (keys="${existing.keys}", scope="${existing.scope}").`,
    );
  }
  const k = keyFor(def);
  const collidingId = keyIndex.get(k);
  if (collidingId) {
    throw new Error(
      `Shortcut keys "${def.keys}" already registered in scope "${def.scope}" by id "${collidingId}".`,
    );
  }
  registry.set(def.id, def);
  keyIndex.set(k, def.id);
}

export function unregisterShortcut(id: string): void {
  const def = registry.get(id);
  if (!def) return;
  registry.delete(id);
  keyIndex.delete(keyFor(def));
}

export function getShortcuts(): ShortcutDef[] {
  return Array.from(registry.values());
}

export function getShortcut(id: string): ShortcutDef | undefined {
  return registry.get(id);
}
