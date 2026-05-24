import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TrailEntry = { url: string; label: string };

const MAX_TRAIL = 6;

const TOP_LEVEL_URLS = new Set<string>([
  "/",
  "/search",
  "/inbox",
  "/surveys",
  "/settings",
  "/crm/clients",
  "/crm/vessels",
  "/crm/quotes",
  "/money/invoices",
  "/money/subscriptions",
]);

function isTopLevel(url: string): boolean {
  return TOP_LEVEL_URLS.has(url);
}

interface BreadcrumbTrailState {
  trail: TrailEntry[];
  push: (entry: TrailEntry) => void;
  clear: () => void;
}

export const useBreadcrumbTrail = create<BreadcrumbTrailState>()(
  persist(
    (set) => ({
      trail: [],
      push: (entry) =>
        set((state) => {
          if (isTopLevel(entry.url)) {
            const last = state.trail[state.trail.length - 1];
            if (
              state.trail.length === 1 &&
              last.url === entry.url &&
              last.label === entry.label
            ) {
              return state;
            }
            return { trail: [entry] };
          }

          const existingIndex = state.trail.findIndex((e) => e.url === entry.url);
          let next: TrailEntry[];
          if (existingIndex >= 0) {
            next = state.trail.slice(0, existingIndex);
            next.push(entry);
          } else {
            next = [...state.trail, entry];
          }
          if (next.length > MAX_TRAIL) {
            next = next.slice(next.length - MAX_TRAIL);
          }
          const last = state.trail[state.trail.length - 1];
          if (
            existingIndex === state.trail.length - 1 &&
            last &&
            last.label === entry.label
          ) {
            return state;
          }
          return { trail: next };
        }),
      clear: () => set({ trail: [] }),
    }),
    {
      name: "sloopquest:breadcrumb-trail",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
