export type Severity = "info" | "advisory" | "critical";

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  advisory: 1,
  info: 2,
};

export const SEVERITY_DOT: Record<Severity, string> = {
  info: "bg-sky-500",
  advisory: "bg-amber-500",
  critical: "bg-red-600",
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  info: "text-sky-700",
  advisory: "text-amber-700",
  critical: "text-red-700",
};

export function asSeverity(value: string | undefined): Severity {
  if (value === "critical" || value === "advisory" || value === "info") return value;
  return "info";
}
