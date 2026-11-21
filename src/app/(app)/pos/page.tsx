import { randomUUID } from "node:crypto";
import { Pos, type PosProduct } from "@/components/Pos";
import { query } from "@/lib/db";
import { localeFor } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { createPosSaleAction } from "./actions";

export default async function PosPage() {
  const { ctx, business } = await requireCtx();
  const products = await query<{ id: string; name: string; base_unit: string; stock: string }>(
    `select p.id, p.name, p.base_unit,
            coalesce((select sum(quantity_delta) from inventory_movements m where m.business_id=p.business_id and m.product_id=p.id),0) as stock
       from products p where p.business_id=$1 and p.archived_at is null order by lower(p.name)`,
    [business.id],
  );
  const units = await query<{ product_id: string; name: string; factor: string; sell_price: string | null }>(
    "select product_id, name, factor, sell_price from product_units where business_id=$1 and sell_price is not null order by is_base desc, factor",
    [business.id],
  );
  const customers = await query<{ id: string; name: string }>(
    "select id, name from customers where business_id=$1 and archived_at is null order by lower(name) limit 500", [business.id]);

  const list: PosProduct[] = products
    .map((p) => ({
      id: p.id, name: p.name, baseUnit: p.base_unit, stock: Number(p.stock),
      units: units.filter((u) => u.product_id === p.id).map((u) => ({ name: u.name, factor: Number(u.factor), price: Number(u.sell_price) })),
    }))
    .filter((p) => p.units.length > 0);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Quick sale</h1>
      <p className="mt-2 mb-6 text-muted">Tap products, choose how the customer pays, and finish. Stock updates automatically.</p>
      <Pos idemKey={randomUUID()} action={createPosSaleAction} products={list} customers={customers} currency={business.currency}
        locale={localeFor(business.country)} canDiscount={can(ctx.role, "sales.discount")} />
    </div>
  );
}
