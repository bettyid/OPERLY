import Link from "next/link";
import { fmtQty } from "@/lib/action";
import { query } from "@/lib/db";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";

type Row = {
  id: string; name: string; sku: string | null; base_unit: string; min_stock: string; archived_at: Date | null;
  category: string | null; stock: string; value: string;
};
type Unit = { product_id: string; name: string; sell_price: string | null; is_base: boolean };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; archived?: string }> }) {
  const { ctx, business } = await requireCtx();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const showArchived = sp.archived === "1";
  const like = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;

  const rows = await query<Row>(
    `select p.id, p.name, p.sku, p.base_unit, p.min_stock, p.archived_at, c.name as category,
            coalesce(sum(m.quantity_delta),0) as stock, coalesce(sum(m.value_delta),0) as value
       from products p
       left join product_categories c on c.business_id = p.business_id and c.id = p.category_id
       left join inventory_movements m on m.business_id = p.business_id and m.product_id = p.id
      where p.business_id = $1 and ($2::boolean or p.archived_at is null)
        and ($3::text is null or p.name ilike $3 or coalesce(p.sku,'') ilike $3)
      group by p.id, c.name order by lower(p.name) limit 300`,
    [business.id, showArchived, like],
  );
  const units = rows.length
    ? await query<Unit>("select product_id, name, sell_price, is_base from product_units where business_id=$1 and product_id = any($2::uuid[]) order by is_base desc, factor", [business.id, rows.map((r) => r.id)])
    : [];
  const money = moneyFormatter(business.country, business.currency);
  const canManage = can(ctx.role, "products.manage");
  const canSeeCost = can(ctx.role, "costs.view");
  const locale = localeFor(business.country);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Products</h1>
          <p className="mt-2 text-muted">What you sell, how it is packaged, and how much is in stock.</p>
        </div>
        {canManage && (
          <Link href="/products/new" className="rounded-full bg-iris-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-iris-500">
            Add product
          </Link>
        )}
      </div>

      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or code" aria-label="Search products"
          className="min-w-0 flex-1 rounded-full border border-edge bg-white px-5 py-2.5 text-sm focus:border-iris-600 focus:outline-none focus:ring-2 focus:ring-iris-600/20" />
        <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold">
          <input type="checkbox" name="archived" value="1" defaultChecked={showArchived} /> Show archived
        </label>
        <button type="submit" className="rounded-full bg-midnight-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-midnight-800">Search</button>
      </form>

      <section className="mt-5 rounded-[2rem] bg-white p-4 sm:p-6">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-display text-lg font-semibold">{q ? "No products match" : "No products yet"}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {q ? "Try a different search." : "Add your first product, then record a purchase to put stock on the shelf."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="text-xs font-bold text-muted">
                  <th className="pb-3 pl-2 font-bold">Product</th>
                  <th className="pb-3 font-bold">Prices</th>
                  <th className="pb-3 text-right font-bold">In stock</th>
                  {canSeeCost && <th className="pb-3 pr-2 text-right font-bold">Stock value</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {rows.map((r) => {
                  const stock = Number(r.stock);
                  const low = stock <= Number(r.min_stock) && !r.archived_at;
                  return (
                    <tr key={r.id} className="hover:bg-lilac-50">
                      <td className="py-3 pl-2">
                        <Link href={`/products/${r.id}`} className="font-bold hover:text-iris-600">{r.name}</Link>
                        <p className="text-xs text-muted">{[r.category, r.sku].filter(Boolean).join(" · ")}{r.archived_at ? " · Archived" : ""}</p>
                      </td>
                      <td className="py-3 text-muted">
                        {units.filter((u) => u.product_id === r.id && u.sell_price !== null).map((u) => `${money.format(Number(u.sell_price))}/${u.name}`).join(", ") || "No price set"}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-display font-medium">{fmtQty(stock)}</span> <span className="text-xs text-muted">{r.base_unit}</span>
                        {low && <span className="ml-2 rounded-full bg-amber/15 px-2 py-0.5 text-xs font-bold text-amber">Low</span>}
                      </td>
                      {canSeeCost && <td className="py-3 pr-2 text-right">{money.format(Number(r.value))}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mt-3 text-xs text-muted">Stock is counted from recorded purchases, sales and adjustments. Numbers shown in {locale}.</p>
    </div>
  );
}
