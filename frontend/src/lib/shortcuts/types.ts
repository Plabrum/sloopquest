export type ShortcutScope = "global" | "dock" | "form";

export type ShortcutDef = {
  id: string;
  keys: string;
  scope: ShortcutScope;
  label: string;
  when?: () => boolean;
  allowInFields?: boolean;
  handler: (e: KeyboardEvent) => void;
};
