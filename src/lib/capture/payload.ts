import type { ConfirmPayload } from "@/lib/services/capture";

const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** Reads the reviewed form into a typed payload. Anything unexpected is trimmed, defaulted or rejected. */
export function parsePayload(raw: unknown): ConfirmPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const lines = (Array.isArray(p.lines) ? p.lines : []).slice(0, 200).map((l) => {
    const o = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
    return { productId: s(o.productId, 40), unitName: s(o.unitName, 40), quantity: s(o.quantity, 20), price: s(o.price, 20) };
  });
  const method = s(p.method, 20) || "cash";
  if (p.type === "sale") {
    const mode = p.payMode === "partial" || p.payMode === "later" ? p.payMode : "full";
    return { type: "sale", date: s(p.date, 10), customerId: s(p.partyId, 40) || null, lines, payMode: mode, paid: s(p.paid, 20), method, discount: s(p.discount, 20) };
  }
  if (p.type === "purchase") {
    return { type: "purchase", date: s(p.date, 10), supplierId: s(p.partyId, 40), lines, extraCosts: s(p.extraCosts, 20), paid: s(p.paid, 20), method };
  }
  if (p.type === "expense") {
    const e = (p.expense && typeof p.expense === "object" ? p.expense : {}) as Record<string, unknown>;
    return { type: "expense", date: s(p.date, 10), description: s(e.description), amount: s(e.amount, 20), category: s(e.category, 80), method };
  }
  if (p.type === "summary") {
    const m = (p.summary && typeof p.summary === "object" ? p.summary : {}) as Record<string, unknown>;
    const period = m.period === "week" ? "week" : "day";
    return {
      type: "summary", period, start: s(p.date, 10), end: s(m.end, 10) || s(p.date, 10), unitsSold: s(m.unitsSold, 20),
      cash: s(m.cash, 20), transfer: s(m.transfer, 20), card: s(m.card, 20), other: s(m.other, 20),
      expenses: (Array.isArray(m.expenses) ? m.expenses : []).slice(0, 50).map((e) => {
        const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
        return { description: s(o.description), amount: s(o.amount, 20) };
      }),
    };
  }
  return null;
}
