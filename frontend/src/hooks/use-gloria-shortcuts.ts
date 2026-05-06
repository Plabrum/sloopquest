/**
 * Global keyboard shortcuts for the Gloria dock.
 *
 * Mounted exactly once at the authenticated layout root.
 *
 * - Cmd/Ctrl + Shift + G → toggle dock (open if minimized, close if docked)
 * - Cmd/Ctrl + J → open dock AND focus composer in one stroke
 *   (overrides the browser default, which is "show downloads" on
 *   Win/Linux Chrome)
 *
 * Esc to blur the composer and Up-arrow-on-empty to recall the last
 * user message live inside the composer component, not here.
 */
import { useEffect } from "react";

import {
  focusComposer,
  openDock,
  toggleDock,
} from "@/hooks/use-gloria-dock-state";

export function useGloriaShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        toggleDock();
        return;
      }

      if (!e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        openDock();
        focusComposer();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
