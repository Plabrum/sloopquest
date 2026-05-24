export function getCitationSourceType(url: string): string {
  if (/^https?:\/\//.test(url)) return "External link";
  return "Reference";
}
