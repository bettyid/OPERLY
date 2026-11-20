import { getPool, query, withTx, type Tx } from "@/lib/db";
import { audit } from "./audit";
import { addMovement, defaultLocation, lockProducts, reverseMovements, stockOf } from "./inventory";
import { allocate, D, Decimal, r2, r6 } from "./money";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { insertPayments, type PaymentInput } from "./payments";
import { resolveUnits } from "./sales";
import { nextNumber, parseDate, parseMoney, parseQty } from "./validate";

export type PurchaseItemInput = { productId: string; unitName?: string; quantity: number | string; unitCost: number | string };

export type PurchaseInput = {
  supplierId: string;
  purchasedAt?: Date | string;
  items: PurchaseItemInput[];
  extraCosts?: number | string;
  payments?: PaymentInput[];
  notes?: string | null;
  source?: "manual" | "pos" | "voice" | "ocr" | "summary" | "import";
  idempotencyKey?: string;
};

export type PurchaseResult = { purchaseId: string; purchaseNumber: number; total: string; amountPaid: string; duplicate: boolean };

type Exec = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, string>[] }> };

async function findByKey(ex: Exec, ctx: Ctx, key: string): Promise<PurchaseResult | null> {
  const res = await ex.query(
    "select id, purchase_number, total, amount_paid from purchases where business_id=$1 and idempotency_key=$2",
    [ctx.businessId, key],
  );
  const p = res.rows[0];
  return p ? { purchaseId: p.id, purchaseNumber: Number(p.purchase_number), total: p.total, amountPaid: p.amount_paid, duplicate: true } : null;
}

export async function createPurchase(ctx: Ctx, input: PurchaseInput): Promise<PurchaseResult> {
  try {
    return await withTx((tx) => createPurchaseTx(tx, ctx, input));
  } catch (e) {
    if ((e as { code?: string }).code === "23505" && input.idempotencyKey) {
      const existing = await findByKey(getPool(), ctx, input.idempotencyKey);
      if (existing) return existing;
    }
    throw e;
  }
}

async function createPurchaseTx(tx: Tx, ctx: Ctx, input: PurchaseInput): Promise<PurchaseResult> {
  assertCan(ctx, "purchases.create");
  if (input.idempotencyKey) {
    const dup = await findByKey(tx, ctx, input.idempotencyKey);
    if (dup) return dup;
  }
  if (!input.items?.length) throw new DomainError("Add at least one product to the purchase.");
  if (input.items.length > 200) throw new DomainError("A purchase can have at most 200 lines.");

  const sup = await tx.query("select 1 from suppliers where business_id=$1 and id=$2", [ctx.businessId, input.supplierId]);
  if (!sup.rowCount) throw new DomainError("Supplier not found.", "not_found");

  const purchasedAt = parseDate(input.purchasedAt, "Purchase date");
  const extra = parseMoney(input.extraCosts ?? 0, "Extra costs", { allowZero: true });
  const products = await lockProducts(tx, ctx, input.items.map((i) => i.productId));
  const units = await resolveUnits(tx, ctx, input.items.map((i) => i.productId));
  const locationId = await defaultLocation(tx, ctx);

  const lines = input.items.map((i) => {
    const list = units.get(i.productId) ?? [];
    const unit = i.unitName ? list.find((u) => u.name === i.unitName!.trim().toLowerCase()) : list.find((u) => u.is_base);
    if (!unit) throw new DomainError(`That unit isn't set up for ${products.get(i.productId)!.name}.`);
    const qty = parseQty(i.quantity, "Quantity");
    const base = qty.times(unit.factor);
    if (!base.equals(base.toDecimalPlaces(3))) throw new DomainError("That quantity does not convert to a whole base amount.");
    const unitCost = parseMoney(i.unitCost, "Unit cost", { allowZero: true });
    return { productId: i.productId, unitName: unit.name, factor: D(unit.factor), qty, base, unitCost, lineTotal: r2(qty.times(unitCost)) };
  });

  const subtotal = lines.reduce((a, l) => a.plus(l.lineTotal), D(0));
  const total = subtotal.plus(extra);
  const shares = allocate(extra, lines.map((l) => l.lineTotal));

  const payments = input.payments ?? [];
  const paidTotal = payments.reduce((a, p) => a.plus(parseMoney(p.amount, "Payment amount")), D(0));
  if (paidTotal.gt(total)) throw new DomainError("Payments add up to more than the purchase total.");

  const number = await nextNumber(tx, ctx.businessId, "purchase");
  const ins = await tx.query(
    `insert into purchases (business_id, purchase_number, supplier_id, location_id, purchased_at, currency, subtotal, extra_costs, total, source, notes, idempotency_key, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [
      ctx.businessId, number, input.supplierId, locationId, purchasedAt, ctx.currency, subtotal.toString(), extra.toString(),
      total.toString(), input.source ?? "manual", input.notes ?? null, input.idempotencyKey ?? null, ctx.userId,
    ],
  );
  const purchaseId: string = ins.rows[0].id;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const landed = l.lineTotal.plus(shares[i]);
    const baseUnitCost = r6(landed.div(l.base));
    const item = await tx.query(
      `insert into purchase_items (business_id, purchase_id, product_id, unit_name, unit_factor, quantity, base_quantity, unit_cost, line_total, landed_total, base_unit_cost)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      [ctx.businessId, purchaseId, l.productId, l.unitName, l.factor.toString(), l.qty.toString(), l.base.toString(), l.unitCost.toString(), l.lineTotal.toString(), landed.toString(), baseUnitCost.toString()],
    );
    await addMovement(tx, ctx, {
      productId: l.productId, locationId, kind: "purchase", quantityDelta: l.base, unitCost: baseUnitCost,
      valueDelta: landed, refType: "purchase_item", refId: item.rows[0].id, occurredAt: purchasedAt,
    });
  }

  const paid = await insertPayments(tx, ctx, { purchaseId }, payments, input.idempotencyKey ? `${input.idempotencyKey}:pay` : undefined);
  await tx.query("update purchases set amount_paid=$3 where business_id=$1 and id=$2", [ctx.businessId, purchaseId, paid.toString()]);
  await audit(tx, ctx, "purchase", purchaseId, "create", null, { number, total: total.toString(), paid: paid.toString(), items: lines.length });
  return { purchaseId, purchaseNumber: number, total: total.toFixed(2), amountPaid: paid.toFixed(2), duplicate: false };
}

export async function voidPurchase(ctx: Ctx, purchaseId: string, reason: string) {
  assertCan(ctx, "purchases.void");
  const why = (reason ?? "").trim();
  if (why.length < 3) throw new DomainError("Give a reason for voiding this purchase.");
  return withTx(async (tx) => {
    const res = await tx.query("select * from purchases where business_id=$1 and id=$2 for update", [ctx.businessId, purchaseId]);
    const p = res.rows[0];
    if (!p) throw new DomainError("Purchase not found.", "not_found");
    if (p.status === "voided") throw new DomainError("This purchase is already voided.", "already_voided");

    const items = await tx.query("select id, product_id from purchase_items where business_id=$1 and purchase_id=$2", [ctx.businessId, purchaseId]);
    const productIds = items.rows.map((r) => r.product_id);
    await lockProducts(tx, ctx, productIds);
    await reverseMovements(tx, ctx, "purchase_item", items.rows.map((r) => r.id), `Void of purchase #${p.purchase_number}: ${why}`);
    if (!ctx.allowNegativeStock) {
      for (const pid of new Set(productIds)) {
        const { qty } = await stockOf(tx, ctx, pid);
        if (qty.lt(0)) throw new DomainError("Some of this stock has already been sold, so the purchase can't be voided. Record an adjustment instead.", "stock_consumed");
      }
    }
    await tx.query("update payments set voided_at=now() where business_id=$1 and purchase_id=$2 and voided_at is null", [ctx.businessId, purchaseId]);
    await tx.query("update purchases set status='voided', voided_at=now(), void_reason=$3 where business_id=$1 and id=$2", [ctx.businessId, purchaseId, why]);
    await audit(tx, ctx, "purchase", purchaseId, "void", { status: "completed", total: p.total }, { status: "voided" }, why);
  });
}

/** Every purchase price for a product, oldest first, with the change from the previous purchase. */
export async function purchaseCostHistory(ctx: Ctx, productId: string) {
  assertCan(ctx, "costs.view");
  const rows = await query<{
    purchased_at: Date; supplier: string; unit_name: string; unit_cost: string; base_unit_cost: string; quantity: string;
  }>(
    `select p.purchased_at, s.name as supplier, pi.unit_name, pi.unit_cost, pi.base_unit_cost, pi.quantity
       from purchase_items pi
       join purchases p on p.business_id = pi.business_id and p.id = pi.purchase_id
       join suppliers s on s.business_id = p.business_id and s.id = p.supplier_id
      where pi.business_id = $1 and pi.product_id = $2 and p.status = 'completed'
      order by p.purchased_at, pi.id`,
    [ctx.businessId, productId],
  );
  let prev: Decimal | null = null;
  return rows.map((r) => {
    const cost = D(r.base_unit_cost);
    const changePct = prev && prev.gt(0) ? cost.minus(prev).div(prev).times(100).toDecimalPlaces(2) : null;
    prev = cost;
    return { purchasedAt: r.purchased_at, supplier: r.supplier, unitName: r.unit_name, unitCost: r.unit_cost, baseUnitCost: r.base_unit_cost, quantity: r.quantity, changePct };
  });
}

export async function inventoryValuation(ctx: Ctx) {
  assertCan(ctx, "costs.view");
  const rows = await query<{ product_id: string; name: string; qty: string; value: string }>(
    `select p.id as product_id, p.name, coalesce(sum(m.quantity_delta),0) as qty, coalesce(sum(m.value_delta),0) as value
       from products p left join inventory_movements m on m.business_id = p.business_id and m.product_id = p.id
      where p.business_id = $1 group by p.id, p.name order by p.name`,
    [ctx.businessId],
  );
  const items = rows.map((r) => ({ productId: r.product_id, name: r.name, quantity: D(r.qty), value: r2(r.value) }));
  return { items, totalValue: items.reduce((a, b) => a.plus(b.value), D(0)) };
}
