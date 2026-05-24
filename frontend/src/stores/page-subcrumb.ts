import { useEffect } from "react";
import { create } from "zustand";

interface PageSubcrumbState {
  label: string | null;
  set: (label: string | null) => void;
}

export const usePageSubcrumb = create<PageSubcrumbState>((set) => ({
  label: null,
  set: (label) => set({ label }),
}));

export function useSetPageSubcrumb(label: string | null) {
  const set = usePageSubcrumb((s) => s.set);
  useEffect(() => {
    set(label);
    return () => set(null);
  }, [label, set]);
}
