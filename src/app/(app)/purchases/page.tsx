import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";

type Row = { id: string; purchase_number: string; purchased_at: Date; supplier: string; total: string; amount_paid: string; status: string; items: string };

export default async function PurchasesPage() {
  const { ctx, business } = await requireCtx();
  if (!can(ctx.role, "costs.view")) redirect("/dashboard");
  const rows = await query<Row>(
    `select p.id, p.purchase_number, p.purchased_at, s.name as supplier, p.total, p.amount_paid, p.status,
            (select count(*) from purchase_items i where i.business_id=p.business_id and i.purchase_id=p.id) as items
       from purchases p join suppliers s on s.business_id=p.business_id and s.id=p.supplier_id
      where p.business_id=$1 order by p.purchased_at desc, p.purchase_number desc limit 100`,
    [business.id],
  );
  const money = moneyFormatter(business.country, business.currency);
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeZone: business.timezone });
  const canCreate = can(ctx.role, "purchases.create");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Purchases</h1>
          <p className="mt-2 text-muted">Stock you bought, at the price you actually paid.</p>
        </div>
        {canCreate && <Link href="/purchases/new" className="rounded-full bg-iris-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-iris-500">Record purchase</Link>}
      </div>
      <section className="mt-6 rounded-[2rem] bg-white p-4 sm:p-6">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No purchases yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead><tr className="text-xs font-bold text-muted">
                <th className="pb-3 pl-2 font-bold">No.</th><th className="pb-3 font-bold">Date</th><th className="pb-3 font-bold">Supplier</th>
                <th className="pb-3 text-right font-bold">Total</th><th className="pb-3 pr-2 text-right font-bold">Still owed</th>
              </tr></thead>
              <tbody className="divide-y divide-edge">
                {rows.map((r) => {
                  const owed = Number(r.total) - Number(r.amount_paid);
                  return (
                    <tr key={r.id} className={r.status === "voided" ? "text-muted line-through" : ""}>
                      <td className="py-3 pl-2 font-bold">#{r.purchase_number}</td>
                      <td className="py-3">{fmt.format(new Date(r.purchased_at))}</td>
                      <td className="py-3">{r.supplier} <span className="text-xs text-muted">({r.items} {Number(r.items) === 1 ? "line" : "lines"})</span></td>
                      <td className="py-3 text-right">{money.format(Number(r.total))}</td>
                      <td className="py-3 pr-2 text-right">{r.status === "voided" ? "Voided" : owed > 0 ? <span className="font-bold text-amber">{money.format(owed)}</span> : "Paid"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
