import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, test } from "node:test";
import { getPool, query } from "@/lib/db";
import { createProduct } from "@/lib/services/catalog";
import { loadCtx } from "@/lib/services/context";
import { createSale } from "@/lib/services/sales";
import { adjustStock } from "@/lib/services/stock";
import { createSummary, voidSummary } from "@/lib/services/summaries";

const uid = () => randomUUID().replace(/-/g, "").slice(0, 12);
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

async function mkBiz(role: "owner" | "member" = "owner", businessId?: string) {
  const id = businessId ?? (await query<{ id: string }>("insert into businesses (name, currency, country, timezone) values ('Sum Biz','NGN','NG','UTC') returning id"))[0].id;
  const u = `t_${uid()}`;
  await query('insert into "user" (id, name, email, "emailVerified") values ($1,$1,$2,true)', [u, `${u}@t.example`]);
  await query("insert into memberships (business_id, user_id, role) values ($1,$2,$3)", [id, u, role]);
  return { businessId: id, ctx: await loadCtx(id, u) };
}
const rejects = (p: Promise<unknown>, code: string) => assert.rejects(p, (e: { code?: string }) => e.code === code, `expected "${code}"`);

after(async () => {
  await getPool().end();
});

describe("daily and weekly summaries", () => {
  test("the spec's example is saved as a summary, with its expense, and creates no sales or stock changes", async () => {
    const { ctx } = await mkBiz();
    const r = await createSummary(ctx, {
      periodStart: iso(1), unitsSold: 15, received: { cash: 250000, transfer: 125000 },
      expenses: [{ description: "Transportation", amount: 15000, categoryName: "Transport" }], source: "voice",
    });
    const [s] = await query<{ received_cash: string; received_transfer: string; source: string; sales_total: string | null }>(
      "select received_cash, received_transfer, source, sales_total from daily_summaries where id=$1", [r.summaryId]);
    assert.equal(s.received_cash, "250000.00");
    assert.equal(s.received_transfer, "125000.00");
    assert.equal(s.source, "voice");
    assert.equal(s.sales_total, null); // never invented
    const [e] = await query<{ amount: string; source: string; summary_id: string }>("select amount, source, summary_id from expenses where business_id=$1", [ctx.businessId]);
    assert.deepEqual([e.amount, e.source, e.summary_id], ["15000.00", "summary", r.summaryId]);
    const [n] = await query<{ sales: string; moves: string; customers: string }>(
      `select (select count(*) from sales where business_id=$1) as sales, (select count(*) from inventory_movements where business_id=$1) as moves,
              (select count(*) from customers where business_id=$1) as customers`, [ctx.businessId]);
    assert.deepEqual([n.sales, n.moves, n.customers], ["0", "0", "0"]);
  });

  test("one summary per day, safe retries, and a voided day can be re-entered", async () => {
    const { ctx } = await mkBiz();
    const day = iso(2);
    const key = `s-${uid()}`;
    const results = await Promise.all([1, 2, 3].map(() => createSummary(ctx, { periodStart: day, received: { cash: 1000 }, idempotencyKey: key })));
    assert.equal(new Set(results.map((r) => r.summaryId)).size, 1);
    await rejects(createSummary(ctx, { periodStart: day, received: { cash: 5000 } }), "duplicate_summary");
    await voidSummary(ctx, results[0].summaryId, "Entered the wrong figures");
    const again = await createSummary(ctx, { periodStart: day, received: { cash: 5000 } });
    assert.notEqual(again.summaryId, results[0].summaryId);
  });

  test("voiding a summary voids the expenses it created", async () => {
    const { ctx } = await mkBiz();
    const r = await createSummary(ctx, { periodStart: iso(3), received: { cash: 100 }, expenses: [{ description: "Rent", amount: 500 }, { description: "Fuel", amount: 200 }] });
    await voidSummary(ctx, r.summaryId, "Duplicate of the notebook entry");
    const [live] = await query<{ n: string }>("select count(*) as n from expenses where business_id=$1 and voided_at is null", [ctx.businessId]);
    assert.equal(live.n, "0");
  });

  test("validation: needs content, no future dates, weeks of at most 7 days, no extra decimals", async () => {
    const { ctx } = await mkBiz();
    await rejects(createSummary(ctx, { periodStart: iso(1) }), "invalid");
    await rejects(createSummary(ctx, { periodStart: iso(-3), received: { cash: 1 } }), "invalid");
    await rejects(createSummary(ctx, { period: "week", periodStart: iso(20), periodEnd: iso(5), received: { cash: 1 } }), "invalid");
    await rejects(createSummary(ctx, { period: "week", periodStart: iso(10), periodEnd: iso(12), received: { cash: 1 } }), "invalid");
    await rejects(createSummary(ctx, { periodStart: iso(4), received: { cash: "10.555" } }), "invalid");
    const ok = await createSummary(ctx, { period: "week", periodStart: iso(14), periodEnd: iso(8), unitsSold: 40, received: { card: 90000 } });
    assert.ok(ok.summaryId);
  });

  test("it warns when individual sales already exist for the same day", async () => {
    const { ctx } = await mkBiz();
    const p = (await createProduct(ctx, { name: "Chips", baseUnit: "pack", baseSellPrice: "1000" })).id;
    await adjustStock(ctx, { productId: p, kind: "opening", quantity: 100, unitCost: 500 });
    await createSale(ctx, { items: [{ productId: p, quantity: 3 }], payments: [{ amount: 3000, method: "cash" }] });
    const r = await createSummary(ctx, { periodStart: iso(0), received: { cash: 3000 } });
    assert.deepEqual(r.overlap, { sales: 1, total: "3000.00" });
  });

  test("only owners and admins can add summaries, and one business cannot touch another's", async () => {
    const A = await mkBiz();
    const staff = await mkBiz("member", A.businessId);
    const B = await mkBiz();
    await rejects(createSummary(staff.ctx, { periodStart: iso(1), received: { cash: 1 } }), "forbidden");
    const r = await createSummary(A.ctx, { periodStart: iso(1), received: { cash: 100 } });
    await rejects(voidSummary(B.ctx, r.summaryId, "Attack attempt"), "not_found");
    await rejects(voidSummary(staff.ctx, r.summaryId, "Not allowed"), "forbidden");
  });
});
