import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PurchaseForm, type PProduct } from "@/components/PurchaseForm";
import { query } from "@/lib/db";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { createPurchaseAction } from "../actions";

export default async function NewPurchasePage() {
  const { ctx, business } = await requireCtx();
  if (!can(ctx.role, "purchases.create")) redirect("/dashboard");

  const products = await query<{ id: string; name: string; base_unit: string }>(
    "select id, name, base_unit from products where business_id=$1 and archived_at is null order by lower(name)", [business.id]);
  const units = await query<{ product_id: string; name: string; factor: string; is_base: boolean }>(
    "select product_id, name, factor, is_base from product_units where business_id=$1 order by is_base desc, factor", [business.id]);
  const suppliers = await query<{ id: string; name: string }>(
    "select id, name from suppliers where business_id=$1 and archived_at is null order by lower(name)", [business.id]);
  const list: PProduct[] = products.map((p) => ({
    id: p.id, name: p.name, baseUnit: p.base_unit,
    units: units.filter((u) => u.product_id === p.id).map((u) => ({ name: u.name, factor: Number(u.factor) })),
  }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: business.timezone }).format(new Date());

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/purchases" className="text-sm font-bold text-iris-600 hover:underline">Back to purchases</Link>
      <h1 className="mt-3 font-title text-4xl font-black tracking-tight sm:text-5xl">Record purchase</h1>
      <div className="mt-6 rounded-[2rem] bg-white p-6 sm:p-8">
        {suppliers.length === 0 || list.length === 0 ? (
          <p className="rounded-2xl bg-lilac-50 px-4 py-6 text-center text-sm text-muted">
            You need at least one <Link href="/suppliers" className="font-bold text-iris-600 underline">supplier</Link> and one{" "}
            <Link href="/products/new" className="font-bold text-iris-600 underline">product</Link> before recording a purchase.
          </p>
        ) : (
          <PurchaseForm idemKey={randomUUID()} action={createPurchaseAction} products={list} suppliers={suppliers} today={today} currency={business.currency} />
        )}
      </div>
    </div>
  );
}
