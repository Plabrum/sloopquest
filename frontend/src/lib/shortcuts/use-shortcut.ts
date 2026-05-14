import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { registerShortcut, unregisterShortcut } from "./registry";
import type { ShortcutDef } from "./types";

// NOTE: This is the ONLY place in the app that should call `useHotkeys` from
// `react-hotkeys-hook`. Routing every shortcut through `useShortcut` is what
// keeps the registry in sync with what's actually mounted — the cheat sheet
// and collision detection both rely on it. The exception is editor-internal
// keymaps (e.g. Tiptap's bold binding inside the contenteditable surface),
// which are not app-level shortcuts.

export function useShortcut(def: ShortcutDef): void {
  useHotkeys(
    def.keys,
    (e) => def.handler(e),
    {
      enabled: def.when ? def.when() : true,
      enableOnFormTags: def.allowInFields ?? false,
      enableOnContentEditable: def.allowInFields ?? false,
      preventDefault: true,
    },
    [def.handler, def.when],
  );

  useEffect(() => {
    registerShortcut(def);
    return () => unregisterShortcut(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, def.keys, def.scope, def.label]);
}
