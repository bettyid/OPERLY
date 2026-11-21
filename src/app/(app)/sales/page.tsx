import Link from "next/link";
import { query } from "@/lib/db";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { requireCtx } from "@/lib/session";

type Row = { id: string; sale_number: string; sold_at: Date; customer: string | null; total: string; amount_paid: string; status: string };

export default async function SalesPage() {
  const { business } = await requireCtx();
  const rows = await query<Row>(
    `select s.id, s.sale_number, s.sold_at, c.name as customer, s.total, s.amount_paid, s.status
       from sales s left join customers c on c.business_id=s.business_id and c.id=s.customer_id
      where s.business_id=$1 order by s.sold_at desc, s.sale_number desc limit 100`,
    [business.id],
  );
  const money = moneyFormatter(business.country, business.currency);
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeStyle: "short", timeZone: business.timezone });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Sales</h1>
          <p className="mt-2 text-muted">Every sale, with how much has been paid.</p>
        </div>
        <Link href="/pos" className="rounded-full bg-iris-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-iris-500">New sale</Link>
      </div>
      <section className="mt-6 rounded-[2rem] bg-white p-4 sm:p-6">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No sales yet. Record your first one from Quick sale.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead><tr className="text-xs font-bold text-muted">
                <th className="pb-3 pl-2 font-bold">No.</th><th className="pb-3 font-bold">Date</th><th className="pb-3 font-bold">Customer</th>
                <th className="pb-3 text-right font-bold">Total</th><th className="pb-3 pr-2 text-right font-bold">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-edge">
                {rows.map((r) => {
                  const owed = Number(r.total) - Number(r.amount_paid);
                  return (
                    <tr key={r.id} className="hover:bg-lilac-50">
                      <td className="py-3 pl-2"><Link href={`/sales/${r.id}`} className="font-bold hover:text-iris-600">#{r.sale_number}</Link></td>
                      <td className="py-3">{fmt.format(new Date(r.sold_at))}</td>
                      <td className="py-3 text-muted">{r.customer ?? "Walk-in"}</td>
                      <td className={`py-3 text-right ${r.status === "voided" ? "text-muted line-through" : ""}`}>{money.format(Number(r.total))}</td>
                      <td className="py-3 pr-2 text-right">
                        {r.status === "voided" ? <span className="rounded-full bg-lilac-200 px-3 py-1 text-xs font-bold text-muted">Voided</span>
                          : owed > 0 ? <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-bold text-amber">Owes {money.format(owed)}</span>
                          : <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-bold text-mint">Paid</span>}
                      </td>
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
