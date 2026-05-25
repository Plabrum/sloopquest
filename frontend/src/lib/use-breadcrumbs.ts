import { useMatches } from "@tanstack/react-router";
import "@/router/types";

export type BreadcrumbEntry = { url: string; label: string };

export function useBreadcrumbs(): BreadcrumbEntry[] {
  const matches = useMatches();
  const entries: BreadcrumbEntry[] = [];
  for (const m of matches) {
    const crumb = m.staticData?.crumb;
    if (!crumb) continue;
    const label = typeof crumb === "function" ? crumb(m) : crumb;
    if (!label) continue;
    entries.push({ url: m.pathname, label });
  }
  return entries;
}
