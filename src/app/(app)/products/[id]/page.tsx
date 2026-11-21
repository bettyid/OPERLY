import Link from "next/link";
import { notFound } from "next/navigation";
import { EditProductForm } from "@/components/EditProductForm";
import { fmtQty } from "@/lib/action";
import { query } from "@/lib/db";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { purchaseCostHistory } from "@/lib/services/purchases";
import { requireCtx } from "@/lib/session";
import { archiveProductAction, updateProductAction } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { ctx, business } = await requireCtx();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [p] = await query<{
    id: string; name: string; sku: string | null; description: string | null; base_unit: string; min_stock: string;
    archived_at: Date | null; category: string | null; stock: string; value: string;
  }>(
    `select p.id, p.name, p.sku, p.description, p.base_unit, p.min_stock, p.archived_at, c.name as category,
            coalesce((select sum(quantity_delta) from inventory_movements m where m.business_id=p.business_id and m.product_id=p.id),0) as stock,
            coalesce((select sum(value_delta) from inventory_movements m where m.business_id=p.business_id and m.product_id=p.id),0) as value
       from products p left join product_categories c on c.business_id=p.business_id and c.id=p.category_id
      where p.business_id=$1 and p.id=$2`,
    [business.id, id],
  );
  if (!p) notFound();

  const units = await query<{ name: string; factor: string; sell_price: string | null; is_base: boolean }>(
    "select name, factor, sell_price, is_base from product_units where business_id=$1 and product_id=$2 order by is_base desc, factor",
    [business.id, id],
  );
  const canManage = can(ctx.role, "products.manage");
  const canSeeCost = can(ctx.role, "costs.view");
  const history = canSeeCost ? await purchaseCostHistory(ctx, id) : [];
  const money = moneyFormatter(business.country, business.currency);
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeZone: business.timezone });
  const stock = Number(p.stock);
  const perUnitCost = Number(p.stock) > 0 ? Number(p.value) / Number(p.stock) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/products" className="text-sm font-bold text-iris-600 hover:underline">Back to products</Link>
      <h1 className="mt-3 font-title text-4xl font-black tracking-tight sm:text-5xl">{p.name}</h1>
      <p className="mt-2 text-muted">{p.archived_at ? "Archived. " : ""}{[p.category, p.sku].filter(Boolean).join(" · ")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.75rem] bg-white p-5">
          <p className="text-sm font-bold text-muted">In stock</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmtQty(stock)} <span className="text-sm font-normal text-muted">{p.base_unit}</span></p>
        </div>
        {canSeeCost && (
          <>
            <div className="rounded-[1.75rem] bg-white p-5">
              <p className="text-sm font-bold text-muted">Stock value</p>
              <p className="mt-2 font-display text-2xl font-semibold">{money.format(Number(p.value))}</p>
            </div>
            <div className="rounded-[1.75rem] bg-white p-5">
              <p className="text-sm font-bold text-muted">Average cost per {p.base_unit}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{stock > 0 ? money.format(perUnitCost) : "No stock"}</p>
            </div>
          </>
        )}
      </div>

      {canManage && (
        <div className="mt-5 rounded-[2rem] bg-white p-6 sm:p-8">
          <EditProductForm
            action={updateProductAction}
            product={{
              id: p.id, name: p.name, sku: p.sku, description: p.description, category: p.category, minStock: p.min_stock,
              baseUnit: p.base_unit,
              units: units.map((u) => ({ name: u.name, factor: u.factor, price: u.sell_price, isBase: u.is_base })),
            }}
          />
        </div>
      )}

      {canSeeCost && (
        <section className="mt-5 rounded-[2rem] bg-white p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">Purchase price history</h2>
          <p className="mt-1 text-sm text-muted">Every purchase is kept with its own price. Costs per {p.base_unit} include extra costs.</p>
          {history.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-lilac-50 px-4 py-6 text-center text-sm text-muted">No purchases recorded for this product yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold text-muted">
                    <th className="pb-3 font-bold">Date</th><th className="pb-3 font-bold">Supplier</th>
                    <th className="pb-3 text-right font-bold">Paid per unit</th><th className="pb-3 text-right font-bold">Cost per {p.base_unit}</th>
                    <th className="pb-3 text-right font-bold">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td className="py-3">{fmt.format(new Date(h.purchasedAt))}</td>
                      <td className="py-3 text-muted">{h.supplier}</td>
                      <td className="py-3 text-right">{money.format(Number(h.unitCost))} <span className="text-xs text-muted">/{h.unitName}</span></td>
                      <td className="py-3 text-right">{Number(h.baseUnitCost).toLocaleString(localeFor(business.country), { maximumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right">
                        {h.changePct === null ? <span className="text-muted">First purchase</span> : (
                          <span className={Number(h.changePct) > 0 ? "font-bold text-amber" : Number(h.changePct) < 0 ? "font-bold text-mint" : "text-muted"}>
                            {Number(h.changePct) > 0 ? "+" : ""}{String(h.changePct)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {canManage && (
        <form action={archiveProductAction} className="mt-6">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="archive" value={p.archived_at ? "false" : "true"} />
          <button type="submit" className="rounded-full bg-lilac-100 px-5 py-2.5 text-sm font-bold text-iris-700 hover:bg-lilac-200">
            {p.archived_at ? "Restore product" : "Archive product"}
          </button>
        </form>
      )}
    </div>
  );
}
