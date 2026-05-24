import { useCallback, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { formatKeys, getShortcuts, useShortcut } from "@/lib/shortcuts";
import type { ShortcutScope } from "@/lib/shortcuts";

const SCOPE_LABEL: Record<ShortcutScope, string> = {
  global: "Global",
  dock: "LLM Assistant",
  form: "Forms",
};

const SCOPE_ORDER: ShortcutScope[] = ["global", "dock", "form"];

export function ShortcutsCheatSheet() {
  const [open, setOpen] = useState(false);

  useShortcut({
    id: "shortcuts.cheat-sheet",
    keys: "shift+slash",
    scope: "global",
    label: "Show keyboard shortcuts",
    handler: useCallback(() => setOpen((prev) => !prev), []),
  });

  const grouped = getShortcuts().reduce<Record<ShortcutScope, ReturnType<typeof getShortcuts>>>(
    (acc, s) => {
      (acc[s.scope] ??= []).push(s);
      return acc;
    },
    {} as Record<ShortcutScope, ReturnType<typeof getShortcuts>>,
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandList>
        {SCOPE_ORDER.every((s) => !grouped[s]?.length) && (
          <CommandEmpty>No shortcuts registered.</CommandEmpty>
        )}
        {SCOPE_ORDER.map((scope) => {
          const items = grouped[scope];
          if (!items?.length) return null;
          return (
            <CommandGroup key={scope} heading={SCOPE_LABEL[scope]}>
              {items.map((s) => (
                <CommandItem key={s.id} value={s.id}>
                  <span className="flex-1">{s.label}</span>
                  <CommandShortcut>{formatKeys(s.keys)}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
