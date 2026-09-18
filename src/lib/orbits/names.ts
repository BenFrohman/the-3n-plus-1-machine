export const DEFAULT_BYLINE = "Benjamin Stanley Frohman";

export function publishedName(sessionName: string | null | undefined): string {
  const n = (sessionName ?? "").trim();
  if (!n) return DEFAULT_BYLINE;
  if (/benjamin\s+frohman/i.test(n) && !/stanley/i.test(n)) return DEFAULT_BYLINE;
  return n;
}
