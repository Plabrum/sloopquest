import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/lib/theme";

const THEME_OPTIONS = [
  { value: "almanac", label: "Almanac" },
  { value: "shad", label: "Default" },
  { value: "glass", label: "Glass" },
  { value: "angular", label: "Angular" },
] as const;

const COLOR_MODE_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function AppearancePage() {
  const { theme, setTheme, colorMode, setColorMode } = useTheme();

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="theme">Theme</Label>
        <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
          <SelectTrigger id="theme" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Switch the overall visual style of the app.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color-mode">Color mode</Label>
        <Select
          value={colorMode}
          onValueChange={(v) => setColorMode(v as typeof colorMode)}
        >
          <SelectTrigger id="color-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
