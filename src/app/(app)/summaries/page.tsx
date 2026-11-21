import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { SummaryForm } from "@/components/SummaryForm";
import { VoidForm } from "@/components/VoidForm";
import { query } from "@/lib/db";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { createSummaryAction, voidSummaryAction } from "./actions";

type Row = {
  id: string; period: string; start: string; end: string; units_sold: string | null; sales_total: string | null;
  received: string; source: string; status: string; note: string | null; expense_total: string;
};

export default async function SummariesPage() {
  const { ctx, business } = await requireCtx();
  if (!can(ctx.role, "expenses.manage")) redirect("/dashboard");
  const rows = await query<Row>(
    `select s.id, s.period, to_char(s.period_start,'YYYY-MM-DD') as start, to_char(s.period_end,'YYYY-MM-DD') as "end", s.units_sold, s.sales_total,
            (s.received_cash + s.received_transfer + s.received_card + s.received_other) as received, s.source, s.status, s.note,
            coalesce((select sum(e.amount) from expenses e where e.business_id=s.business_id and e.summary_id=s.id),0) as expense_total
       from daily_summaries s where s.business_id=$1 order by s.period_start desc, s.created_at desc limit 60`,
    [business.id],
  );
  const money = moneyFormatter(business.country, business.currency);
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeZone: "UTC" });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: business.timezone }).format(new Date());
  const d = (s: string) => fmt.format(new Date(s + "T00:00:00Z"));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Daily summary</h1>
      <p className="mt-2 text-muted">Short on time? Record a whole day or week in one go, without entering each sale.</p>

      <section className="mt-6 rounded-[2rem] bg-white p-6 sm:p-8">
        <SummaryForm action={createSummaryAction} today={today} idemKey={randomUUID()} currency={business.currency} />
      </section>

      <section className="mt-5 rounded-[2rem] bg-white p-4 sm:p-6">
        <h2 className="px-2 font-display text-lg font-semibold">Saved summaries</h2>
        {rows.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted">No summaries yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-edge">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-2 py-3">
                <div className={r.status === "voided" ? "text-muted line-through" : ""}>
                  <p className="font-bold">
                    {r.period === "week" ? `${d(r.start)} to ${d(r.end)}` : d(r.start)}{" "}
                    <span className="ml-1 rounded-full bg-lilac-100 px-2 py-0.5 text-xs font-bold text-iris-700">Summary{r.source !== "manual" ? ` · ${r.source}` : ""}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Received {money.format(Number(r.received))}
                    {r.units_sold ? ` · ${Number(r.units_sold)} units sold` : ""}
                    {Number(r.expense_total) > 0 ? ` · Expenses ${money.format(Number(r.expense_total))}` : ""}
                    {r.sales_total ? ` · Sales value ${money.format(Number(r.sales_total))}` : ""}
                  </p>
                </div>
                {r.status === "voided" ? <span className="text-xs font-bold text-muted">Voided</span>
                  : <VoidForm id={r.id} action={voidSummaryAction} label="Void" help="Its expenses are voided too." />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
