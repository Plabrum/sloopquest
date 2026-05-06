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

export function getColorByHash(id: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
