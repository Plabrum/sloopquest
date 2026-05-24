const AVATAR_COLORS = [
  { bg: "bg-[#E8D5F5]", text: "text-[#7C3AED]" },
  { bg: "bg-[#D5EDE2]", text: "text-[#0F766E]" },
  { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]" },
  { bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
  { bg: "bg-[#FCE7F3]", text: "text-[#DB2777]" },
  { bg: "bg-[#F5E6D8]", text: "text-[#9A5B2F]" },
];

export function getInitials(
  value: string | { name?: string; email?: string },
  fallback = "?",
): string {
  const raw =
    typeof value === "string" ? value : (value.name ?? value.email ?? "");
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getColorByHash(id: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
