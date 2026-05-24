const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5173";

export function appUrl(path = "/"): string {
  const base = APP_URL.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
