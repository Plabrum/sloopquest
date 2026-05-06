export function getInitials(user: { name?: string; email?: string }): string {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "?";
  }
  return user.email?.[0]?.toUpperCase() ?? "?";
}
