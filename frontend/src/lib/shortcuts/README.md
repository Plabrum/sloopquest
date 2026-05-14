# Keyboard shortcuts

All app-level keyboard shortcuts go through `useShortcut` from this module.
That hook is a thin wrapper over `react-hotkeys-hook` that *also* writes the
shortcut into a module-level registry. The registry powers:

- the `?` cheat sheet (renders every mounted shortcut, grouped by scope)
- collision detection (duplicate `keys` within a scope throws at register time)
- tooltip integration (a future `shortcutId` prop on `Tooltip` can look up the
  display glyphs for hint text)

Do **not** call `useHotkeys` directly outside `lib/shortcuts/`. Always go
through `useShortcut` so the registry stays in sync with what's mounted.

## Editor-internal exception

`components/ui/minimal-tiptap.tsx` binds `mod+b` for bold formatting *inside*
the contenteditable surface. That's a Tiptap keymap, not an app shortcut — it
only fires when focus is in the editor, so it cannot collide with the global
`mod+b` (sidebar toggle), which is suppressed in form fields by default. The
Tiptap binding stays as-is.
