import { AskPanel } from "@/components/AskPanel";
import { RevenueChart, type MonthPoint } from "@/components/RevenueChart";
import { query } from "@/lib/db";
import { moneyFormatter } from "@/lib/regions";
import { requireWorkspace } from "@/lib/session";

type Counts = { customers: string; open_deals: string; open_value: string; due_tasks: string };
type Month = { label: string; total: string };
type TopDeal = {
  id: string;
  title: string;
  customer: string | null;
  stage: string;
  value: string;
  expected_close: Date | null;
};

const stageLabel: Record<string, string> = {
  new: "New enquiry",
  contacted: "Contacted",
  interested: "Interested",
  negotiation: "Negotiation",
};

export default async function DashboardPage() {
  const { user, business } = await requireWorkspace();
  const tz = business.timezone;

  const [counts] = await query<Counts>(
    `select
       (select count(*) from customers where business_id = $1) as customers,
       (select count(*) from deals where business_id = $1 and stage not in ('won','lost')) as open_deals,
       (select coalesce(sum(value),0) from deals where business_id = $1 and stage not in ('won','lost')) as open_value,
       (select count(*) from tasks where business_id = $1 and done = false and due_date <= (now() at time zone $2)::date) as due_tasks`,
    [business.id, tz],
  );

  const months = await query<Month>(
    `with months as (
       select generate_series(
         date_trunc('month', now() at time zone $2) - interval '11 months',
         date_trunc('month', now() at time zone $2),
         interval '1 month') as m
     )
     select to_char(m, 'Mon') as label,
            coalesce((select sum(d.value) from deals d
                       where d.business_id = $1 and d.stage = 'won'
                         and date_trunc('month', coalesce(d.closed_at, d.updated_at) at time zone $2) = m), 0) as total
       from months order by m`,
    [business.id, tz],
  );

  const topDeals = await query<TopDeal>(
    `select d.id, d.title, c.name as customer, d.stage, d.value, d.expected_close
       from deals d left join customers c on c.id = d.customer_id
      where d.business_id = $1 and d.stage not in ('won','lost')
      order by d.value desc, d.created_at desc
      limit 5`,
    [business.id],
  );

  const money = moneyFormatter(business.country, business.currency);
  const series: MonthPoint[] = months.map((m) => ({ label: m.label, total: Number(m.total) }));
  const thisMonth = series[series.length - 1]?.total ?? 0;
  const lastMonth = series[series.length - 2]?.total ?? 0;
  const delta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const yearTotal = series.reduce((sum, p) => sum + p.total, 0);

  const stats = [
    { label: "Customers", value: Number(counts.customers).toLocaleString("en"), note: null },
    { label: "Open deals", value: Number(counts.open_deals).toLocaleString("en"), note: null },
    { label: "Pipeline value", value: money.format(Number(counts.open_value)), note: null },
    { label: "Won this month", value: money.format(thisMonth), note: delta === null ? null : `${delta >= 0 ? "+" : ""}${delta}% vs last month` },
  ];
  const firstName = user.name.split(" ")[0];
  const dueTasks = Number(counts.due_tasks);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
      <div className="min-w-0">
        <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Welcome, {firstName}</h1>
        <p className="mt-2 text-muted">
          Here is where {business.name} stands today
          {dueTasks > 0 ? `, with ${dueTasks} ${dueTasks === 1 ? "task" : "tasks"} due or overdue.` : "."}
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`rounded-[1.75rem] p-5 ${i === 3 ? "bg-iris-600 text-white" : "bg-white"}`}>
              <p className={`text-sm font-bold ${i === 3 ? "text-lilac-100" : "text-muted"}`}>{s.label}</p>
              <p className="mt-3 font-display text-2xl font-semibold">{s.value}</p>
              {s.note && <p className="mt-1 text-xs font-bold text-lilac-100">{s.note}</p>}
            </div>
          ))}
        </div>

        <section className="mt-5 rounded-[2rem] bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">Revenue from won deals</h2>
              <p className="text-sm text-muted">Last 12 months, in {business.currency}</p>
            </div>
            <p className="font-display text-2xl font-semibold">{money.format(yearTotal)}</p>
          </div>
          <div className="mt-4">
            <RevenueChart data={series} format={(n) => money.format(n)} />
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] bg-white p-6">
          <h2 className="font-display text-lg font-semibold">Biggest open deals</h2>
          {topDeals.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-lilac-50 px-4 py-6 text-center text-sm text-muted">
              No open deals yet. Deals you add in the Sales Hub appear here, largest first.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="text-xs font-bold text-muted">
                    <th className="pb-3 font-bold">Deal</th>
                    <th className="pb-3 font-bold">Customer</th>
                    <th className="pb-3 font-bold">Stage</th>
                    <th className="pb-3 text-right font-bold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {topDeals.map((d) => (
                    <tr key={d.id}>
                      <td className="py-3 font-bold">{d.title}</td>
                      <td className="py-3 text-muted">{d.customer ?? "No customer"}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-lilac-100 px-3 py-1 text-xs font-bold text-iris-700">
                          {stageLabel[d.stage] ?? d.stage}
                        </span>
                      </td>
                      <td className="py-3 text-right font-display font-medium">{money.format(Number(d.value))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AskPanel />
    </div>
  );
}
