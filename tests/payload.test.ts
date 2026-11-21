import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parsePayload } from "@/lib/capture/payload";

describe("reviewed form payload", () => {
  test("a reviewed sale is read into exactly the fields the service needs", () => {
    const p = parsePayload({ type: "sale", date: "2026-11-21", partyId: "abc", payMode: "partial", paid: "50000", method: "bank_transfer", discount: "", lines: [{ productId: "p1", unitName: "carton", quantity: "5", price: "25000", id: 7, extra: "x" }] });
    assert.deepEqual(p, { type: "sale", date: "2026-11-21", customerId: "abc", lines: [{ productId: "p1", unitName: "carton", quantity: "5", price: "25000" }], payMode: "partial", paid: "50000", method: "bank_transfer", discount: "" });
  });

  test("walk-in sales have no customer, and unknown pay modes fall back to paid in full", () => {
    const p = parsePayload({ type: "sale", date: "2026-11-21", partyId: "", payMode: "free", lines: [] });
    assert.equal(p?.type === "sale" && p.customerId, null);
    assert.equal(p?.type === "sale" && p.payMode, "full");
  });

  test("purchases, expenses and summaries are shaped for their services", () => {
    assert.equal(parsePayload({ type: "purchase", date: "2026-11-20", partyId: "s1", extraCosts: "100", paid: "", method: "cash", lines: [{ productId: "p", unitName: "carton", quantity: "30", price: "19500" }] })?.type, "purchase");
    const e = parsePayload({ type: "expense", date: "2026-11-20", method: "cash", expense: { description: "Transport", amount: "15000", category: "Transport" } });
    assert.deepEqual(e, { type: "expense", date: "2026-11-20", description: "Transport", amount: "15000", category: "Transport", method: "cash" });
    const m = parsePayload({ type: "summary", date: "2026-11-19", summary: { period: "week", end: "2026-11-21", unitsSold: "15", cash: "250000", transfer: "125000", expenses: [{ description: "Fuel", amount: "500" }] } });
    assert.equal(m?.type === "summary" && m.period, "week");
    assert.equal(m?.type === "summary" && m.expenses.length, 1);
  });

  test("garbage is rejected or trimmed, never passed through", () => {
    assert.equal(parsePayload(null), null);
    assert.equal(parsePayload("sale"), null);
    assert.equal(parsePayload({ type: "refund_everyone" }), null);
    const p = parsePayload({ type: "expense", date: "x".repeat(500), method: "cash", expense: { description: "y".repeat(900), amount: "1" } });
    assert.equal(p?.type === "expense" && p.date.length, 10);
    assert.equal(p?.type === "expense" && p.description.length, 200);
    const many = parsePayload({ type: "sale", date: "2026-11-21", lines: Array.from({ length: 500 }, () => ({ productId: "p" })) });
    assert.equal(many?.type === "sale" && many.lines.length, 200);
  });
});
