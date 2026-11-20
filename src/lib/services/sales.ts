import { getPool, withTx, type Tx } from "@/lib/db";
import { audit } from "./audit";
import { addMovement, currentUnitCost, defaultLocation, lockProducts, reverseMovements, stockOf } from "./inventory";
import { D, Decimal, r2 } from "./money";
import { assertCan, DomainError, type Ctx } from "./permissions";
import { insertPayments, type PaymentInput } from "./payments";
import { nextNumber, parseDate, parseMoney, parseQty, paymentStatus } from "./validate";

export type SaleItemInput = {
  productId: string;
  unitName?: string;
  quantity: number | string;
  unitPrice?: number | string;
  lineDiscount?: number | string;
};

export type SaleInput = {
  customerId?: string | null;
  soldAt?: Date | string;
  items: SaleItemInput[];
  discount?: number | string;
  payments?: PaymentInput[];
  notes?: string | null;
  source?: "manual" | "pos" | "voice" | "ocr" | "summary" | "import";
  idempotencyKey?: string;
};

export type SaleResult = {
  saleId: string;
  saleNumber: number;
  subtotal: string;
  discount: string;
  total: string;
  amountPaid: string;
  paymentStatus: "paid" | "partial" | "unpaid";
  duplicate: boolean;
};

type UnitRow = { product_id: string; name: string; factor: string; sell_price: string | null; is_base: boolean };

export async function resolveUnits(tx: Tx, ctx: Ctx, productIds: string[]) {
  const res = await tx.query(
    "select product_id, name, factor, sell_price, is_base from product_units where business_id=$1 and product_id = any($2::uuid[])",
    [ctx.businessId, [...new Set(productIds)]],
  );
  const map = new Map<string, UnitRow[]>();
  for (const r of res.rows as UnitRow[]) map.set(r.product_id, [...(map.get(r.product_id) ?? []), r]);
  return map;
}

type Exec = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, string>[] }> };

/** Pass the open transaction when inside one, so no second connection is taken from the pool. */
async function findSaleByKey(ex: Exec, ctx: Ctx, key: string): Promise<SaleResult | null> {
  const res = await ex.query(
    "select id, sale_number, subtotal, discount, total, amount_paid from sales where business_id=$1 and idempotency_key=$2",
    [ctx.businessId, key],
  );
  const s = res.rows[0];
  if (!s) return null;
  return {
    saleId: s.id, saleNumber: Number(s.sale_number), subtotal: s.subtotal, discount: s.discount, total: s.total,
    amountPaid: s.amount_paid, paymentStatus: paymentStatus(s.total, s.amount_paid), duplicate: true,
  };
}

export async function createSale(ctx: Ctx, input: SaleInput): Promise<SaleResult> {
  try {
    return await withTx((tx) => createSaleTx(tx, ctx, input));
  } catch (e) {
    if ((e as { code?: string }).code === "23505" && input.idempotencyKey) {
      const existing = await findSaleByKey(getPool(), ctx, input.idempotencyKey);
      if (existing) return existing;
    }
    throw e;
  }
}

async function createSaleTx(tx: Tx, ctx: Ctx, input: SaleInput): Promise<SaleResult> {
  assertCan(ctx, "sales.create");
  if (input.idempotencyKey) {
    const dup = await findSaleByKey(tx, ctx, input.idempotencyKey);
    if (dup) return dup;
  }
  if (!input.items?.length) throw new DomainError("Add at least one product to the sale.");
  if (input.items.length > 200) throw new DomainError("A sale can have at most 200 lines.");

  const discount = parseMoney(input.discount ?? 0, "Discount", { allowZero: true });
  const anyLineDiscount = input.items.some((i) => i.lineDiscount !== undefined && !D(i.lineDiscount).isZero());
  if (discount.gt(0) || anyLineDiscount) assertCan(ctx, "sales.discount");

  const soldAt = parseDate(input.soldAt, "Sale date");

  if (input.customerId) {
    const c = await tx.query("select 1 from customers where business_id=$1 and id=$2", [ctx.businessId, input.customerId]);
    if (!c.rowCount) throw new DomainError("Customer not found.", "not_found");
  }

  const products = await lockProducts(tx, ctx, input.items.map((i) => i.productId));
  for (const p of products.values()) if (p.archived_at) throw new DomainError(`${p.name} is archived and can't be sold.`);
  const units = await resolveUnits(tx, ctx, input.items.map((i) => i.productId));
  const locationId = await defaultLocation(tx, ctx);

  type Line = {
    productId: string; unitName: string; factor: Decimal; qty: Decimal; base: Decimal; price: Decimal; lineDiscount: Decimal; lineTotal: Decimal;
  };
  const lines: Line[] = input.items.map((i) => {
    const list = units.get(i.productId) ?? [];
    const unit = i.unitName ? list.find((u) => u.name === i.unitName!.trim().toLowerCase()) : list.find((u) => u.is_base);
    if (!unit) throw new DomainError(`That unit isn't set up for ${products.get(i.productId)!.name}.`);
    const qty = parseQty(i.quantity, "Quantity");
    const base = qty.times(unit.factor);
    if (!base.equals(base.toDecimalPlaces(3))) throw new DomainError("That quantity does not convert to a whole base amount.");
    const priceRaw = i.unitPrice ?? unit.sell_price;
    if (priceRaw === null || priceRaw === undefined) {
      throw new DomainError(`Set a selling price for ${products.get(i.productId)!.name} (${unit.name}).`);
    }
    const price = parseMoney(priceRaw, "Price", { allowZero: true });
    const lineDiscount = parseMoney(i.lineDiscount ?? 0, "Line discount", { allowZero: true });
    const gross = r2(qty.times(price));
    if (lineDiscount.gt(gross)) throw new DomainError("A line discount cannot be more than the line amount.");
    return { productId: i.productId, unitName: unit.name, factor: D(unit.factor), qty, base, price, lineDiscount, lineTotal: gross.minus(lineDiscount) };
  });

  const subtotal = lines.reduce((a, l) => a.plus(l.lineTotal), D(0));
  if (discount.gt(subtotal)) throw new DomainError("The discount cannot be more than the sale amount.");
  const total = subtotal.minus(discount);

  const payments = input.payments ?? [];
  const paidTotal = payments.reduce((a, p) => a.plus(parseMoney(p.amount, "Payment amount")), D(0));
  if (paidTotal.gt(total)) throw new DomainError("Payments add up to more than the sale total.");

  // Stock check (per product, across the sale)
  if (!ctx.allowNegativeStock) {
    const need = new Map<string, Decimal>();
    for (const l of lines) need.set(l.productId, (need.get(l.productId) ?? D(0)).plus(l.base));
    for (const [pid, qty] of need) {
      const { qty: have } = await stockOf(tx, ctx, pid, locationId);
      if (have.lt(qty)) {
        const p = products.get(pid)!;
        throw new DomainError(`Not enough ${p.name} in stock: ${have.toString()} ${p.base_unit} available, ${qty.toString()} needed.`, "insufficient_stock");
      }
    }
  }

  const saleNumber = await nextNumber(tx, ctx.businessId, "sale");
  const sale = await tx.query(
    `insert into sales (business_id, sale_number, customer_id, location_id, sold_at, currency, subtotal, discount, total, source, notes, idempotency_key, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [
      ctx.businessId, saleNumber, input.customerId ?? null, locationId, soldAt, ctx.currency, subtotal.toString(),
      discount.toString(), total.toString(), input.source ?? "manual", input.notes ?? null, input.idempotencyKey ?? null, ctx.userId,
    ],
  );
  const saleId: string = sale.rows[0].id;

  for (const l of lines) {
    const item = await tx.query(
      `insert into sale_items (business_id, sale_id, product_id, unit_name, unit_factor, quantity, base_quantity, unit_price, line_discount, line_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [ctx.businessId, saleId, l.productId, l.unitName, l.factor.toString(), l.qty.toString(), l.base.toString(), l.price.toString(), l.lineDiscount.toString(), l.lineTotal.toString()],
    );
    const unitCost = await currentUnitCost(tx, ctx, l.productId);
    const { qty: have, value } = await stockOf(tx, ctx, l.productId);
    // Selling the last units clears the remaining value exactly, so no rounding residue is left behind.
    const valueOut = have.equals(l.base) ? value : unitCost.times(l.base).toDecimalPlaces(4);
    await addMovement(tx, ctx, {
      productId: l.productId, locationId, kind: "sale", quantityDelta: l.base.neg(), unitCost,
      valueDelta: valueOut.neg(), refType: "sale_item", refId: item.rows[0].id, occurredAt: soldAt,
    });
    await tx.query("update sale_items set cogs = $3 where business_id=$1 and id=$2", [ctx.businessId, item.rows[0].id, r2(valueOut).toString()]);
  }

  const paid = await insertPayments(tx, ctx, { saleId }, payments, input.idempotencyKey ? `${input.idempotencyKey}:pay` : undefined);
  await tx.query("update sales set amount_paid = $3 where business_id=$1 and id=$2", [ctx.businessId, saleId, paid.toString()]);

  await audit(tx, ctx, "sale", saleId, "create", null, { saleNumber, total: total.toString(), paid: paid.toString(), items: lines.length });
  return {
    saleId, saleNumber, subtotal: subtotal.toFixed(2), discount: discount.toFixed(2), total: total.toFixed(2),
    amountPaid: paid.toFixed(2), paymentStatus: paymentStatus(total, paid), duplicate: false,
  };
}

export async function voidSale(ctx: Ctx, saleId: string, reason: string) {
  assertCan(ctx, "sales.void");
  const why = (reason ?? "").trim();
  if (why.length < 3) throw new DomainError("Give a reason for voiding this sale.");
  return withTx(async (tx) => {
    const res = await tx.query("select * from sales where business_id=$1 and id=$2 for update", [ctx.businessId, saleId]);
    const sale = res.rows[0];
    if (!sale) throw new DomainError("Sale not found.", "not_found");
    if (sale.status === "voided") throw new DomainError("This sale is already voided.", "already_voided");

    const items = await tx.query("select id, product_id from sale_items where business_id=$1 and sale_id=$2", [ctx.businessId, saleId]);
    await lockProducts(tx, ctx, items.rows.map((r) => r.product_id));
    await reverseMovements(tx, ctx, "sale_item", items.rows.map((r) => r.id), `Void of sale #${sale.sale_number}: ${why}`);
    await tx.query("update payments set voided_at = now() where business_id=$1 and sale_id=$2 and voided_at is null", [ctx.businessId, saleId]);
    await tx.query("update sales set status='voided', voided_at=now(), void_reason=$3 where business_id=$1 and id=$2", [ctx.businessId, saleId, why]);
    await audit(tx, ctx, "sale", saleId, "void", { status: "completed", total: sale.total, amount_paid: sale.amount_paid }, { status: "voided" }, why);
  });
}
