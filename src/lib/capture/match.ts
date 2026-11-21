/** Deterministic name matching. The AI never chooses which record a spoken name refers to. */

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singular(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokens(s: string): string[] {
  return norm(s).split(" ").filter(Boolean).map(singular);
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  if (ta.join(" ") === tb.join(" ")) return 1;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let common = 0;
  for (const t of sa) if (sb.has(t)) common++;
  const dice = (2 * common) / (sa.size + sb.size);
  const contained = common === sa.size || common === sb.size;
  return contained ? Math.max(dice, 0.8) : dice;
}

export type Candidate = { id: string; name: string };

export function rank<T extends Candidate>(text: string, list: T[], limit = 3): { item: T; score: number }[] {
  return list
    .map((item) => ({ item, score: similarity(text, item.name) }))
    .filter((r) => r.score > 0.3)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}

/** A clear single winner, or null (with options for the owner to choose from). */
export function pick<T extends Candidate>(text: string | null | undefined, list: T[], threshold = 0.6) {
  if (!text || !text.trim()) return { match: null as T | null, options: [] as T[], ambiguous: false };
  const ranked = rank(text, list, 4);
  const top = ranked[0];
  if (!top || top.score < threshold) return { match: null as T | null, options: ranked.map((r) => r.item), ambiguous: false };
  const rival = ranked[1];
  if (rival && rival.score >= threshold && top.score - rival.score < 0.1) {
    return { match: null as T | null, options: ranked.filter((r) => r.score >= threshold).map((r) => r.item), ambiguous: true };
  }
  return { match: top.item, options: ranked.map((r) => r.item), ambiguous: false };
}

export function matchUnit(text: string | null | undefined, units: { name: string }[]): string | null {
  if (!text) return null;
  const t = tokens(text).join(" ");
  const hit = units.find((u) => tokens(u.name).join(" ") === t);
  return hit ? hit.name : null;
}
