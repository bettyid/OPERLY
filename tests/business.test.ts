import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, test } from "node:test";
import { getPool, query } from "@/lib/db";
import { archiveProduct, createProduct, updateProduct } from "@/lib/services/catalog";
import { loadCtx } from "@/lib/services/context";
import { createExpense, voidExpense } from "@/lib/services/expenses";
import { allocate, D } from "@/lib/services/money";
import { customerBalance, paySupplier, receiveCustomerPayment, supplierBalance } from "@/lib/services/payments";
import type { Ctx } from "@/lib/services/permissions";
import { createPurchase, inventoryValuation, purchaseCostHistory, voidPurchase } from "@/lib/services/purchases";
import { createSale, voidSale } from "@/lib/services/sales";
import { adjustStock } from "@/lib/services/stock";

const uid = () => randomUUID().replace(/-/g, "").slice(0, 12);

async function mkUser(label: string) {
  const id = `t_${uid()}`;
  await query('insert into "user" (id, name, email, "emailVerified") values ($1,$2,$3,true)', [id, label, `${id}@test.example`]);
  return id;
}

/** A business with an owner, built through the same tables the app uses. */
async function mkBusiness(name = "Test Biz", currency = "NGN") {
  const [b] = await query<{ id: string }>("insert into businesses (name, currency, country, timezone) values ($1,$2,'NG','Africa/Lagos') returning id", [name, currency]);
  const owner = await mkUser("Owner");
  await query("insert into memberships (business_id, user_id, role) values ($1,$2,'owner')", [b.id, owner]);
  return { businessId: b.id, ctx: await loadCtx(b.id, owner) };
}

async function mkStaff(businessId: string) {
  const u = await mkUser("Staff");
  await query("insert into memberships (business_id, user_id, role) values ($1,$2,'member')", [businessId, u]);
  return loadCtx(businessId, u);
}

async function mkSupplier(ctx: Ctx, name = "ABC Foods") {
  const [s] = await query<{ id: string }>("insert into suppliers (business_id, name) values ($1,$2) returning id", [ctx.businessId, name]);
  return s.id;
}
async function mkCustomer(ctx: Ctx, name = "Ada") {
  const [c] = await query<{ id: string }>("insert into customers (business_id, name) values ($1,$2) returning id", [ctx.businessId, name]);
  return c.id;
}

/** Plantain chips: stocked in packs, sold by the pack, half carton (12) or carton (24). */
async function mkChips(ctx: Ctx) {
  return (
    await createProduct(ctx, {
      name: "Plantain chips", baseUnit: "pack", baseSellPrice: "1100",
      units: [{ name: "carton", factor: 24, sellPrice: "25000" }, { name: "half carton", factor: 12, sellPrice: "13000" }],
    })
  ).id;
}

/** The spec's purchase example: 30 @ 18,000, 50 @ 19,000, 40 @ 19,500 per carton. */
async function stockChips(ctx: Ctx, productId: string) {
  const supplierId = await mkSupplier(ctx);
  for (const [qty, cost, day] of [[30, 18000, "2026-01-05"], [50, 19000, "2026-02-05"], [40, 19500, "2026-03-05"]] as const) {
    await createPurchase(ctx, { supplierId, purchasedAt: day, items: [{ productId, unitName: "carton", quantity: qty, unitCost: cost }] });
  }
  return supplierId;
}

const rejects = (p: Promise<unknown>, code: string) =>
  assert.rejects(p, (e: { code?: string }) => e.code === code, `expected error code "${code}"`);

after(async () => {
  await getPool().end();
});

describe("money", () => {
  test("decimal arithmetic is exact (no floating-point drift)", async () => {
    const { ctx } = await mkBusiness();
    const id = (await createProduct(ctx, { name: "Candle", baseUnit: "piece", baseSellPrice: "0.10" })).id;
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 10, unitCost: "0.05" });
    const sale = await createSale(ctx, { items: [{ productId: id, quantity: 3 }] });
    assert.equal(sale.total, "0.30"); // 3 * 0.1 in floats is 0.30000000000000004
  });

  test("allocation always adds back to the exact total", () => {
    const parts = allocate("100", [1, 1, 1]);
    assert.equal(parts.reduce((a, b) => a.plus(b), D(0)).toFixed(2), "100.00");
    assert.deepEqual(parts.map(String), ["33.34", "33.33", "33.33"]);
    const odd = allocate("0.01", [1, 1, 1]);
    assert.equal(odd.reduce((a, b) => a.plus(b), D(0)).toFixed(2), "0.01");
  });

  test("values with more than 2 decimals are rejected, not silently rounded", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await rejects(createSale(ctx, { items: [{ productId: id, quantity: 1, unitPrice: "12.345" }] }), "invalid");
  });
});

describe("purchases, price history and costing", () => {
  test("every purchase keeps its own price and history shows the increases", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);

    const rows = await query<{ unit_cost: string; quantity: string }>(
      `select pi.unit_cost, pi.quantity from purchase_items pi join purchases p on p.business_id=pi.business_id and p.id=pi.purchase_id
        where pi.business_id=$1 and pi.product_id=$2 order by p.purchased_at`, [ctx.businessId, id]);
    assert.deepEqual(rows.map((r) => [r.unit_cost, r.quantity]), [["18000.00", "30.000"], ["19000.00", "50.000"], ["19500.00", "40.000"]]);

    const hist = await purchaseCostHistory(ctx, id);
    assert.equal(hist.length, 3);
    assert.equal(hist[0].changePct, null);
    assert.equal(String(hist[1].changePct), "5.56");
    assert.equal(String(hist[2].changePct), "2.63");
  });

  test("stock and valuation come from the ledger (weighted average)", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    const v = await inventoryValuation(ctx);
    const chips = v.items.find((i) => i.productId === id)!;
    assert.equal(chips.quantity.toString(), "2880"); // 120 cartons x 24 packs
    assert.equal(chips.value.toFixed(2), "2270000.00");
  });

  test("selling uses the weighted-average cost and units convert correctly", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    const sale = await createSale(ctx, { items: [{ productId: id, unitName: "carton", quantity: 1 }, { productId: id, unitName: "half carton", quantity: 1 }] });
    assert.equal(sale.total, "38000.00");
    const [c] = await query<{ cogs: string; packs: string }>(
      "select sum(cogs) as cogs, sum(base_quantity) as packs from sale_items where business_id=$1 and sale_id=$2", [ctx.businessId, sale.saleId]);
    assert.equal(c.packs, "36.000"); // 24 + 12
    assert.equal(D(c.cogs).toFixed(2), "28375.00"); // 36 packs x (2,270,000 / 2,880)
    const v = await inventoryValuation(ctx);
    assert.equal(v.totalValue.toFixed(2), "2241625.00");
  });

  test("extra costs are spread across lines and included in stock value", async () => {
    const { ctx } = await mkBusiness();
    const a = (await createProduct(ctx, { name: "A", baseUnit: "unit", baseSellPrice: "10" })).id;
    const b = (await createProduct(ctx, { name: "B", baseUnit: "unit", baseSellPrice: "10" })).id;
    const sup = await mkSupplier(ctx);
    const p = await createPurchase(ctx, { supplierId: sup, items: [{ productId: a, quantity: 10, unitCost: "100" }, { productId: b, quantity: 10, unitCost: "100" }], extraCosts: "100.01" });
    assert.equal(p.total, "2100.01");
    const v = await inventoryValuation(ctx);
    assert.equal(v.totalValue.toFixed(2), "2100.01");
  });

  test("supplier balances and payments", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    const sup = await mkSupplier(ctx);
    await createPurchase(ctx, { supplierId: sup, items: [{ productId: id, unitName: "carton", quantity: 10, unitCost: 18000 }], payments: [{ amount: 50000, method: "bank_transfer" }] });
    assert.equal((await supplierBalance(ctx, sup)).outstanding.toFixed(2), "130000.00");
    await paySupplier(ctx, { supplierId: sup, amount: 130000, method: "cash" });
    assert.equal((await supplierBalance(ctx, sup)).outstanding.toFixed(2), "0.00");
    await rejects(paySupplier(ctx, { supplierId: sup, amount: 1, method: "cash" }), "overpayment");
  });
});

describe("sales, stock rules and payments", () => {
  test("cannot sell more than is in stock, unless the business allows negative stock", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 10, unitCost: 800 });
    await rejects(createSale(ctx, { items: [{ productId: id, quantity: 11 }] }), "insufficient_stock");
    const sale = await createSale({ ...ctx, allowNegativeStock: true }, { items: [{ productId: id, quantity: 11 }] });
    assert.equal(sale.total, "12100.00");
  });

  test("archived products and unknown units are refused", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 100, unitCost: 800 });
    await rejects(createSale(ctx, { items: [{ productId: id, unitName: "pallet", quantity: 1 }] }), "invalid");
    await archiveProduct(ctx, id);
    await rejects(createSale(ctx, { items: [{ productId: id, quantity: 1 }] }), "invalid");
  });

  test("discounts need permission and cannot exceed the sale", async () => {
    const { businessId, ctx } = await mkBusiness();
    const staff = await mkStaff(businessId);
    const id = await mkChips(ctx);
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 100, unitCost: 800 });
    await rejects(createSale(staff, { items: [{ productId: id, quantity: 2 }], discount: 100 }), "forbidden");
    const ok = await createSale(ctx, { items: [{ productId: id, quantity: 2 }], discount: 100 });
    assert.equal(ok.total, "2100.00");
    await rejects(createSale(ctx, { items: [{ productId: id, quantity: 1 }], discount: 5000 }), "invalid");
  });

  test("partial payments, balances and oldest-first allocation", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    const ada = await mkCustomer(ctx);
    const s1 = await createSale(ctx, { customerId: ada, soldAt: "2026-04-01", items: [{ productId: id, unitName: "carton", quantity: 1 }, { productId: id, unitName: "half carton", quantity: 1 }], payments: [{ amount: 10000, method: "cash" }] });
    assert.equal(s1.paymentStatus, "partial");
    const s2 = await createSale(ctx, { customerId: ada, soldAt: "2026-04-02", items: [{ productId: id, quantity: 5 }] });
    assert.equal(s2.paymentStatus, "unpaid");
    assert.equal((await customerBalance(ctx, ada)).outstanding.toFixed(2), "33500.00"); // 38,000 + 5,500 - 10,000
    await receiveCustomerPayment(ctx, { customerId: ada, amount: 30000, method: "bank_transfer" });
    const rows = await query<{ sale_number: string; amount_paid: string; total: string }>("select sale_number, amount_paid, total from sales where business_id=$1 order by sale_number", [ctx.businessId]);
    assert.equal(rows[0].amount_paid, rows[0].total); // oldest sale cleared first
    assert.equal((await customerBalance(ctx, ada)).outstanding.toFixed(2), "3500.00");
    await rejects(receiveCustomerPayment(ctx, { customerId: ada, amount: 4000, method: "cash" }), "overpayment");
  });

  test("walk-in (anonymous) sales are allowed", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 5, unitCost: 800 });
    const s = await createSale(ctx, { items: [{ productId: id, quantity: 1 }], payments: [{ amount: 1100, method: "cash" }] });
    assert.equal(s.paymentStatus, "paid");
  });
});

describe("reliability: idempotency and concurrency", () => {
  test("the same idempotency key creates exactly one sale, even in parallel", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 100, unitCost: 800 });
    const key = `pos-${uid()}`;
    const results = await Promise.all(
      Array.from({ length: 6 }, () => createSale(ctx, { idempotencyKey: key, items: [{ productId: id, quantity: 2 }], payments: [{ amount: 500, method: "cash" }] })),
    );
    assert.equal(new Set(results.map((r) => r.saleId)).size, 1);
    assert.equal(results.filter((r) => !r.duplicate).length, 1);
    const [n] = await query<{ sales: string; pays: string; moves: string }>(
      `select (select count(*) from sales where business_id=$1) as sales,
              (select count(*) from payments where business_id=$1) as pays,
              (select count(*) from inventory_movements where business_id=$1 and kind='sale') as moves`, [ctx.businessId]);
    assert.deepEqual([n.sales, n.pays, n.moves], ["1", "1", "1"]);
    const [stock] = await query<{ qty: string }>("select sum(quantity) as qty from stock_levels where business_id=$1", [ctx.businessId]);
    assert.equal(stock.qty, "98.000"); // sold once, not six times
  });

  test("two simultaneous sales cannot oversell the last units", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 10, unitCost: 800 });
    const results = await Promise.allSettled([
      createSale(ctx, { idempotencyKey: `a-${uid()}`, items: [{ productId: id, quantity: 10 }] }),
      createSale(ctx, { idempotencyKey: `b-${uid()}`, items: [{ productId: id, quantity: 10 }] }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.equal((failed.reason as { code: string }).code, "insufficient_stock");
    const [stock] = await query<{ qty: string }>("select sum(quantity) as qty from stock_levels where business_id=$1", [ctx.businessId]);
    assert.equal(stock.qty, "0.000");
  });

  test("duplicate purchases and expenses are caught by their keys too", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    const sup = await mkSupplier(ctx);
    const pk = `p-${uid()}`;
    const ps = await Promise.all([1, 2, 3].map(() => createPurchase(ctx, { idempotencyKey: pk, supplierId: sup, items: [{ productId: id, quantity: 5, unitCost: 800 }] })));
    assert.equal(new Set(ps.map((p) => p.purchaseId)).size, 1);
    const ek = `e-${uid()}`;
    const es = await Promise.all([1, 2, 3].map(() => createExpense(ctx, { idempotencyKey: ek, description: "Transport", amount: 15000, method: "cash" })));
    assert.equal(new Set(es.map((e) => e.expenseId)).size, 1);
  });
});

describe("corrections and audit history", () => {
  test("voiding a sale restores stock and value at the original cost and is audited", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    const before = await inventoryValuation(ctx);
    const sale = await createSale(ctx, { items: [{ productId: id, unitName: "carton", quantity: 3 }], payments: [{ amount: 1000, method: "cash" }] });
    await rejects(voidSale(ctx, sale.saleId, " "), "invalid");
    await voidSale(ctx, sale.saleId, "Customer cancelled");
    const after = await inventoryValuation(ctx);
    assert.equal(after.totalValue.toFixed(2), before.totalValue.toFixed(2));
    assert.equal(after.items[0].quantity.toString(), before.items[0].quantity.toString());
    await rejects(voidSale(ctx, sale.saleId, "again"), "already_voided");
    const audits = await query<{ action: string; reason: string | null }>("select action, reason from audit_log where business_id=$1 and entity='sale' order by id", [ctx.businessId]);
    assert.deepEqual(audits.map((a) => a.action), ["create", "void"]);
    assert.equal(audits[1].reason, "Customer cancelled");
    const [p] = await query<{ live: string }>("select count(*) as live from payments where business_id=$1 and voided_at is null", [ctx.businessId]);
    assert.equal(p.live, "0");
  });

  test("a purchase can't be voided after its stock was sold", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    const sup = await mkSupplier(ctx);
    const p = await createPurchase(ctx, { supplierId: sup, items: [{ productId: id, unitName: "carton", quantity: 1, unitCost: 18000 }] });
    await createSale(ctx, { items: [{ productId: id, quantity: 20 }] });
    await rejects(voidPurchase(ctx, p.purchaseId, "Entered by mistake"), "stock_consumed");
    const p2 = await createPurchase(ctx, { supplierId: sup, items: [{ productId: id, unitName: "carton", quantity: 1, unitCost: 18000 }] });
    await voidPurchase(ctx, p2.purchaseId, "Entered by mistake");
  });

  test("price changes are recorded in the price history", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await updateProduct(ctx, id, { prices: { carton: "26000" } });
    const h = await query<{ old_price: string | null; new_price: string }>("select old_price, new_price from product_price_history where business_id=$1 and unit_name='carton' order by id", [ctx.businessId]);
    assert.deepEqual(h.map((r) => [r.old_price, r.new_price]), [[null, "25000.00"], ["25000.00", "26000.00"]]);
  });

  test("history tables cannot be edited or deleted", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await adjustStock(ctx, { productId: id, kind: "opening", quantity: 5, unitCost: 800 });
    await assert.rejects(query("update inventory_movements set quantity_delta = 999 where business_id=$1", [ctx.businessId]), /append-only/);
    await assert.rejects(query("delete from inventory_movements where business_id=$1", [ctx.businessId]), /append-only/);
    await assert.rejects(query("update audit_log set action='x' where business_id=$1", [ctx.businessId]), /append-only/);
  });
});

describe("expenses and stock adjustments", () => {
  test("expenses are separate from purchases and can be voided", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    const before = await inventoryValuation(ctx);
    const e = await createExpense(ctx, { description: "Transportation", amount: 15000, method: "cash", categoryName: "Transport" });
    assert.equal((await inventoryValuation(ctx)).totalValue.toFixed(2), before.totalValue.toFixed(2));
    await voidExpense(ctx, e.expenseId, "Duplicate entry");
    const [r] = await query<{ live: string }>("select count(*) as live from expenses where business_id=$1 and voided_at is null", [ctx.businessId]);
    assert.equal(r.live, "0");
  });

  test("damaged goods leave the ledger at average cost and need a reason", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    await rejects(adjustStock(ctx, { productId: id, kind: "damage", quantity: 2 }), "invalid");
    await adjustStock(ctx, { productId: id, kind: "damage", quantity: 24, reason: "Water damage" });
    const v = await inventoryValuation(ctx);
    assert.equal(v.items[0].quantity.toString(), "2856");
    assert.equal(v.totalValue.toFixed(2), "2251083.33"); // 2,270,000 - 24 x 788.1944...
    await rejects(adjustStock(ctx, { productId: id, kind: "damage", quantity: 999999, reason: "Typo" }), "insufficient_stock");
  });
});

describe("security: permissions and tenant isolation", () => {
  test("staff can sell but cannot see costs, void, adjust, or manage products", async () => {
    const { businessId, ctx } = await mkBusiness();
    const staff = await mkStaff(businessId);
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    const sale = await createSale(staff, { items: [{ productId: id, quantity: 1 }] });
    assert.ok(sale.saleId);
    await rejects(purchaseCostHistory(staff, id), "forbidden");
    await rejects(inventoryValuation(staff), "forbidden");
    await rejects(voidSale(staff, sale.saleId, "No reason"), "forbidden");
    await rejects(adjustStock(staff, { productId: id, kind: "opening", quantity: 1, unitCost: 1 }), "forbidden");
    await rejects(createProduct(staff, { name: "Nope" }), "forbidden");
  });

  test("one business can never read or change another business's records", async () => {
    const A = await mkBusiness("Business A");
    const B = await mkBusiness("Business B");
    const idA = await mkChips(A.ctx);
    await stockChips(A.ctx, idA);
    const saleA = await createSale(A.ctx, { items: [{ productId: idA, quantity: 1 }] });

    await rejects(createSale(B.ctx, { items: [{ productId: idA, quantity: 1 }] }), "not_found");
    await rejects(voidSale(B.ctx, saleA.saleId, "Attack"), "not_found");
    await rejects(updateProduct(B.ctx, idA, { name: "Hacked" }), "not_found");
    await rejects(adjustStock(B.ctx, { productId: idA, kind: "opening", quantity: 1, unitCost: 1 }), "not_found");
    assert.equal((await inventoryValuation(B.ctx)).items.length, 0);

    // The database itself refuses cross-business links, even from raw SQL.
    await assert.rejects(
      query(
        `insert into sale_items (business_id, sale_id, product_id, unit_name, unit_factor, quantity, base_quantity, unit_price, line_total)
         values ($1,$2,$3,'pack',1,1,1,1,1)`, [B.businessId, saleA.saleId, idA]),
      /foreign key/,
    );
    const stillA = await query<{ name: string }>("select name from products where id=$1", [idA]);
    assert.equal(stillA[0].name, "Plantain chips");
  });

  test("a user with no membership gets no context", async () => {
    const A = await mkBusiness();
    const stranger = await mkUser("Stranger");
    await rejects(loadCtx(A.businessId, stranger), "forbidden");
  });
});

describe("reconciliation", () => {
  test("ledger stock equals what the documents say, and payments add up", async () => {
    const { ctx } = await mkBusiness();
    const id = await mkChips(ctx);
    await stockChips(ctx, id);
    const ada = await mkCustomer(ctx);
    const s1 = await createSale(ctx, { customerId: ada, items: [{ productId: id, unitName: "carton", quantity: 4 }], payments: [{ amount: 20000, method: "cash" }] });
    await createSale(ctx, { items: [{ productId: id, unitName: "half carton", quantity: 3 }, { productId: id, quantity: 7 }] });
    await voidSale(ctx, s1.saleId, "Wrong customer");
    await adjustStock(ctx, { productId: id, kind: "damage", quantity: 5, reason: "Crushed" });
    await adjustStock(ctx, { productId: id, kind: "return_in", quantity: 2, unitCost: 790, reason: "Customer return" });

    // Independent calculation straight from the business documents.
    const [expected] = await query<{ qty: string }>(
      `select
         (select coalesce(sum(pi.base_quantity),0) from purchase_items pi join purchases p on p.id=pi.purchase_id and p.business_id=pi.business_id where pi.business_id=$1 and p.status='completed')
       - (select coalesce(sum(si.base_quantity),0) from sale_items si join sales s on s.id=si.sale_id and s.business_id=si.business_id where si.business_id=$1 and s.status='completed')
       - 5 + 2 as qty`, [ctx.businessId]);
    const [ledger] = await query<{ qty: string }>("select sum(quantity) as qty from stock_levels where business_id=$1", [ctx.businessId]);
    assert.equal(D(ledger.qty).toString(), D(expected.qty).toString());

    const bad = await query(
      `select s.id from sales s where s.business_id=$1 and s.status='completed'
         and s.amount_paid <> coalesce((select sum(amount) from payments p where p.business_id=s.business_id and p.sale_id=s.id and p.voided_at is null),0)`, [ctx.businessId]);
    assert.equal(bad.length, 0);
  });
});
