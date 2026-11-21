import { randomUUID } from "node:crypto";
import Link from "next/link";
import { SimpleForm } from "@/components/SimpleForm";
import { daysSince } from "@/lib/action";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { listDebtors } from "@/lib/services/payments";
import { requireCtx } from "@/lib/session";
import { receivePaymentAction } from "./actions";

export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { ctx, business } = await requireCtx();
  const { sort } = await searchParams;
  const debtors = await listDebtors(ctx);
  if (sort === "oldest") debtors.sort((a, b) => a.oldestSaleAt.getTime() - b.oldestSaleAt.getTime());

  const money = moneyFormatter(business.country, business.currency);
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeZone: business.timezone });
  const total = debtors.reduce((a, d) => a + Number(d.owed.toFixed(2)), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Customer debts</h1>
      <p className="mt-2 text-muted">Customers who bought on credit or paid only part. Debts are added here automatically from your sales.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.75rem] bg-iris-600 p-6 text-white">
          <p className="text-sm font-bold text-lilac-100">Total owed to you</p>
          <p className="mt-2 font-display text-3xl font-semibold">{money.format(total)}</p>
        </div>
        <div className="rounded-[1.75rem] bg-white p-6">
          <p className="text-sm font-bold text-muted">Customers who owe</p>
          <p className="mt-2 font-display text-3xl font-semibold">{debtors.length}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm font-bold">
        <span className="text-muted">Sort by</span>
        <Link href="/debts" className={`rounded-full px-4 py-2 ${sort !== "oldest" ? "bg-iris-600 text-white" : "bg-white text-iris-700"}`}>Biggest debt</Link>
        <Link href="/debts?sort=oldest" className={`rounded-full px-4 py-2 ${sort === "oldest" ? "bg-iris-600 text-white" : "bg-white text-iris-700"}`}>Oldest first</Link>
      </div>

      <section className="mt-4 rounded-[2rem] bg-white p-4 sm:p-6">
        {debtors.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-display text-lg font-semibold">No one owes you anything</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              When you record a sale as part payment or pay later, the unpaid amount shows up here with the customer&apos;s name.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-edge">
            {debtors.map((d) => (
              <li key={d.customerId} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/customers/${d.customerId}`} className="font-bold hover:text-iris-600">{d.name}</Link>
                    <p className="text-xs text-muted">
                      {d.phone ? `${d.phone} · ` : ""}{d.openSales} unpaid {d.openSales === 1 ? "sale" : "sales"} · oldest {daysSince(d.oldestSaleAt)} days ago
                    </p>
                  </div>
                  <p className="font-display text-xl font-semibold text-amber">{money.format(Number(d.owed))}</p>
                </div>
                <details className="mt-3">
                  <summary className="inline-block cursor-pointer rounded-full bg-lilac-100 px-4 py-2 text-sm font-bold text-iris-700">See sales and record a payment</summary>
                  <div className="mt-3 space-y-4 rounded-2xl bg-lilac-50 p-4">
                    <ul className="divide-y divide-edge text-sm">
                      {d.sales.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <Link href={`/sales/${s.id}`} className="font-bold hover:text-iris-600">Sale #{s.saleNumber}</Link>
                          <span className="text-muted">{fmt.format(s.soldAt)}</span>
                          <span className="text-muted">Total {money.format(Number(s.total))}, paid {money.format(Number(s.paid))}</span>
                          <span className="font-bold text-amber">Owes {money.format(Number(s.owed))}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted">A payment clears the oldest sale first.</p>
                    <SimpleForm
                      action={receivePaymentAction}
                      submitLabel="Record payment"
                      successText="Payment recorded."
                      hidden={{ customer_id: d.customerId, key: randomUUID() }}
                      fields={[
                        { name: "amount", label: `Amount received (up to ${money.format(Number(d.owed))})`, type: "number", step: "0.01", min: "0.01", required: true },
                        { name: "method", label: "Method", options: [
                          { value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" },
                          { value: "card", label: "Card" }, { value: "other", label: "Other" }] },
                      ]}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-3 text-xs text-muted">Amounts are in {business.currency}. Voided sales are not counted.</p>
    </div>
  );
}
