export function jumpToHash(hash: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(hash.replace(/^#/, ""));
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
