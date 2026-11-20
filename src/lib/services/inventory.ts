import type { Tx } from "@/lib/db";
import { D, Decimal, r6 } from "./money";
import { DomainError, type Ctx } from "./permissions";

export type MovementKind =
  | "opening" | "purchase" | "sale" | "return_in" | "return_out"
  | "damage" | "adjustment" | "transfer_in" | "transfer_out" | "reversal";

export async function defaultLocation(tx: Tx, ctx: Ctx): Promise<string> {
  const found = await tx.query("select id from stock_locations where business_id = $1 and is_default", [ctx.businessId]);
  if (found.rows[0]) return found.rows[0].id;
  const created = await tx.query(
    `insert into stock_locations (business_id, name, is_default) values ($1, 'Main', true)
     on conflict do nothing returning id`,
    [ctx.businessId],
  );
  if (created.rows[0]) return created.rows[0].id;
  const again = await tx.query("select id from stock_locations where business_id = $1 and is_default", [ctx.businessId]);
  return again.rows[0].id;
}

/** Lock product rows (in id order, to avoid deadlocks) so stock checks and ledger writes cannot race. */
export async function lockProducts(tx: Tx, ctx: Ctx, ids: string[]) {
  const unique = [...new Set(ids)].sort();
  const res = await tx.query(
    `select id, name, base_unit, archived_at from products
      where business_id = $1 and id = any($2::uuid[]) order by id for update`,
    [ctx.businessId, unique],
  );
  if (res.rows.length !== unique.length) throw new DomainError("One of the products was not found.", "not_found");
  return new Map<string, { id: string; name: string; base_unit: string; archived_at: Date | null }>(
    res.rows.map((r) => [r.id, r]),
  );
}

export async function stockOf(tx: Tx, ctx: Ctx, productId: string, locationId?: string) {
  const res = await tx.query(
    `select coalesce(sum(quantity_delta),0) as qty, coalesce(sum(value_delta),0) as value
       from inventory_movements
      where business_id = $1 and product_id = $2 and ($3::uuid is null or location_id = $3)`,
    [ctx.businessId, productId, locationId ?? null],
  );
  return { qty: D(res.rows[0].qty), value: D(res.rows[0].value) };
}

/** Weighted-average cost per base unit across the whole business; falls back to the latest purchase cost. */
export async function currentUnitCost(tx: Tx, ctx: Ctx, productId: string): Promise<Decimal> {
  if (ctx.costingMethod !== "weighted_average") {
    throw new DomainError("FIFO costing is not available yet. Use weighted average.", "unsupported");
  }
  const { qty, value } = await stockOf(tx, ctx, productId);
  if (qty.gt(0) && value.gt(0)) return r6(value.div(qty));
  const last = await tx.query(
    `select base_unit_cost from purchase_items pi join purchases p on p.id = pi.purchase_id and p.business_id = pi.business_id
      where pi.business_id = $1 and pi.product_id = $2 and p.status = 'completed'
      order by p.purchased_at desc, pi.id desc limit 1`,
    [ctx.businessId, productId],
  );
  return last.rows[0] ? D(last.rows[0].base_unit_cost) : D(0);
}

export async function addMovement(
  tx: Tx,
  ctx: Ctx,
  m: {
    productId: string;
    locationId: string;
    kind: MovementKind;
    quantityDelta: Decimal;
    unitCost: Decimal;
    valueDelta: Decimal;
    refType?: string;
    refId?: string;
    reason?: string | null;
    reversesId?: number | null;
    occurredAt?: Date;
  },
): Promise<number> {
  const res = await tx.query(
    `insert into inventory_movements
       (business_id, product_id, location_id, kind, quantity_delta, unit_cost, value_delta, ref_type, ref_id, reason, reverses_id, occurred_at, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,coalesce($12, now()),$13) returning id`,
    [
      ctx.businessId, m.productId, m.locationId, m.kind, m.quantityDelta.toString(), m.unitCost.toString(),
      m.valueDelta.toString(), m.refType ?? null, m.refId ?? null, m.reason ?? null, m.reversesId ?? null,
      m.occurredAt ?? null, ctx.userId,
    ],
  );
  return Number(res.rows[0].id);
}

/** Reverse every ledger row that belongs to a document, at its original cost. */
export async function reverseMovements(tx: Tx, ctx: Ctx, refType: string, refIds: string[], reason: string) {
  const rows = await tx.query(
    `select id, product_id, location_id, quantity_delta, unit_cost, value_delta, ref_id
       from inventory_movements
      where business_id = $1 and ref_type = $2 and ref_id = any($3::uuid[]) and kind <> 'reversal'
        and not exists (select 1 from inventory_movements r where r.reverses_id = inventory_movements.id)
      order by id`,
    [ctx.businessId, refType, refIds],
  );
  for (const r of rows.rows) {
    await addMovement(tx, ctx, {
      productId: r.product_id,
      locationId: r.location_id,
      kind: "reversal",
      quantityDelta: D(r.quantity_delta).neg(),
      unitCost: D(r.unit_cost),
      valueDelta: D(r.value_delta).neg(),
      refType,
      refId: r.ref_id,
      reason,
      reversesId: Number(r.id),
    });
  }
}
