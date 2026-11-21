import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, test } from "node:test";
import { getPool, query } from "@/lib/db";
import { createProduct } from "@/lib/services/catalog";
import { loadCtx } from "@/lib/services/context";
import { customerBalance, listDebtors, receiveCustomerPayment } from "@/lib/services/payments";
import { createSale, voidSale } from "@/lib/services/sales";
import { adjustStock } from "@/lib/services/stock";

const uid = () => randomUUID().replace(/-/g, "").slice(0, 12);

async function world() {
  const [b] = await query<{ id: string }>("insert into businesses (name, currency, country, timezone) values ('Debt Biz','NGN','NG','Africa/Lagos') returning id");
  const owner = `t_${uid()}`;
  await query('insert into "user" (id, name, email, "emailVerified") values ($1,$1,$2,true)', [owner, `${owner}@t.example`]);
  await query("insert into memberships (business_id, user_id, role) values ($1,$2,'owner')", [b.id, owner]);
  const ctx = await loadCtx(b.id, owner);
  const product = (await createProduct(ctx, { name: "Chips", baseUnit: "pack", baseSellPrice: "1000" })).id;
  await adjustStock(ctx, { productId: product, kind: "opening", quantity: 1000, unitCost: 600 });
  const mk = async (name: string) => (await query<{ id: string }>("insert into customers (business_id, name) values ($1,$2) returning id", [b.id, name]))[0].id;
  return { ctx, product, ada: await mk("Ada"), ben: await mk("Ben"), cy: await mk("Cy") };
}

after(async () => {
  await getPool().end();
});

describe("customer debts", () => {
  test("part payments and pay-later sales become debts automatically, biggest first", async () => {
    const { ctx, product, ada, ben, cy } = await world();
    await createSale(ctx, { customerId: ada, soldAt: "2026-05-01", items: [{ productId: product, quantity: 80 }], payments: [{ amount: 50000, method: "cash" }] }); // owes 30,000
    await createSale(ctx, { customerId: ben, soldAt: "2026-05-02", items: [{ productId: product, quantity: 10 }] }); // owes 10,000
    await createSale(ctx, { customerId: cy, soldAt: "2026-05-03", items: [{ productId: product, quantity: 5 }], payments: [{ amount: 5000, method: "cash" }] }); // fully paid
    const debtors = await listDebtors(ctx);
    assert.deepEqual(debtors.map((d) => [d.name, d.owed.toFixed(2)]), [["Ada", "30000.00"], ["Ben", "10000.00"]]);
    assert.equal(debtors[0].sales[0].paid.toFixed(2), "50000.00");
  });

  test("paying clears the oldest sale first and a cleared customer leaves the list", async () => {
    const { ctx, product, ada } = await world();
    await createSale(ctx, { customerId: ada, soldAt: "2026-05-01", items: [{ productId: product, quantity: 10 }] }); // 10,000
    await createSale(ctx, { customerId: ada, soldAt: "2026-05-02", items: [{ productId: product, quantity: 5 }] }); // 5,000
    await receiveCustomerPayment(ctx, { customerId: ada, amount: 12000, method: "cash" });
    let d = await listDebtors(ctx);
    assert.equal(d.length, 1);
    assert.equal(d[0].openSales, 1); // the 10,000 sale is cleared, 3,000 of the second is still owed
    assert.equal(d[0].owed.toFixed(2), "3000.00");
    await receiveCustomerPayment(ctx, { customerId: ada, amount: 3000, method: "bank_transfer" });
    d = await listDebtors(ctx);
    assert.equal(d.length, 0);
    assert.equal((await customerBalance(ctx, ada)).outstanding.toFixed(2), "0.00");
  });

  test("voided sales are not debts, and the list matches each customer's balance", async () => {
    const { ctx, product, ada, ben } = await world();
    const s = await createSale(ctx, { customerId: ada, items: [{ productId: product, quantity: 20 }] });
    await createSale(ctx, { customerId: ben, items: [{ productId: product, quantity: 7 }], payments: [{ amount: 2000, method: "cash" }] });
    await voidSale(ctx, s.saleId, "Customer cancelled");
    const d = await listDebtors(ctx);
    assert.deepEqual(d.map((x) => x.name), ["Ben"]);
    assert.equal(d[0].owed.toFixed(2), (await customerBalance(ctx, ben)).outstanding.toFixed(2));
    assert.equal((await customerBalance(ctx, ada)).outstanding.toFixed(2), "0.00");
  });

  test("a duplicate payment request is applied once", async () => {
    const { ctx, product, ada } = await world();
    await createSale(ctx, { customerId: ada, items: [{ productId: product, quantity: 10 }] });
    const key = `pay-${uid()}`;
    await Promise.all([1, 2, 3].map(() => receiveCustomerPayment(ctx, { customerId: ada, amount: 4000, method: "cash", idempotencyKey: key })));
    assert.equal((await customerBalance(ctx, ada)).outstanding.toFixed(2), "6000.00");
  });
});
