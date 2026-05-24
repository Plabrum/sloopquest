import type { CSSProperties } from "react";

export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${+(abs / 1_000_000_000).toPrecision(3)}B`;
  if (abs >= 1_000_000) return `${sign}${+(abs / 1_000_000).toPrecision(3)}M`;
  if (abs >= 10_000) return `${sign}${+(abs / 1_000).toPrecision(3)}K`;
  if (abs >= 1) return `${sign}${+abs.toPrecision(4)}`;
  if (abs === 0) return "0";
  return `${sign}${+abs.toPrecision(2)}`;
}

export const CHART_AXIS_TICK = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
};

export const CHART_GRID_PROPS = {
  vertical: false as const,
  stroke: "var(--border)",
  strokeOpacity: 0.4,
  strokeDasharray: "3 3",
};

export const CHART_TOOLTIP_CURSOR = {
  stroke: "var(--border)",
  strokeOpacity: 0.6,
  strokeWidth: 1,
};

export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  boxShadow: "0 1px 3px 0 rgba(0,0,0,0.18)",
};
