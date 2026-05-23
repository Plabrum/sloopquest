import { useEffect } from "react";
import { jumpToHash } from "@/lib/scroll";

type Options = {
  hashPrefix: string;
  rootMargin?: string;
  onCurrent?: (id: string) => void;
  syncHash?: boolean;
};

export function useScrollSpy(ids: string[], options: Options) {
  const { hashPrefix, rootMargin = "-80px 0px -60% 0px", onCurrent, syncHash = true } = options;

  useEffect(() => {
    if (ids.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const id = visible.target.id.replace(new RegExp(`^${hashPrefix}`), "");
        if (!id) return;
        onCurrent?.(id);
        if (syncHash && window.location.hash !== `#${hashPrefix}${id}`) {
          history.replaceState(null, "", `#${hashPrefix}${id}`);
        }
      },
      { rootMargin, threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(`${hashPrefix}${id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids, hashPrefix, rootMargin, onCurrent, syncHash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) {
      const target = window.location.hash;
      requestAnimationFrame(() => jumpToHash(target));
    }
  }, []);
}
