import { query } from "@/lib/db";
import { requireWorkspace } from "@/lib/session";

type Counts = {
  customers: string;
  open_deals: string;
  open_value: string;
  won_deals: string;
  due_tasks: string;
};

type Activity = { id: string; summary: string; actor: string; created_at: Date };

export default async function DashboardPage() {
  const { user, business } = await requireWorkspace();

  const [counts] = await query<Counts>(
    `select
       (select count(*) from customers where business_id = $1) as customers,
       (select count(*) from deals where business_id = $1 and stage not in ('won','lost')) as open_deals,
       (select coalesce(sum(value),0) from deals where business_id = $1 and stage not in ('won','lost')) as open_value,
       (select count(*) from deals where business_id = $1 and stage = 'won') as won_deals,
       (select count(*) from tasks where business_id = $1 and done = false and due_date <= current_date) as due_tasks`,
    [business.id],
  );
  const activities = await query<Activity>(
    "select id, summary, actor, created_at from activities where business_id = $1 order by created_at desc limit 6",
    [business.id],
  );

  const money = new Intl.NumberFormat("en", { style: "currency", currency: business.currency, maximumFractionDigits: 0 });
  const stats = [
    { label: "Customers", value: Number(counts.customers).toLocaleString("en"), tone: "bg-white" },
    { label: "Open deals", value: Number(counts.open_deals).toLocaleString("en"), tone: "bg-white" },
    { label: "Pipeline value", value: money.format(Number(counts.open_value)), tone: "bg-iris-600 text-white" },
    { label: "Tasks due or overdue", value: Number(counts.due_tasks).toLocaleString("en"), tone: "bg-midnight-900 text-white" },
  ];
  const firstName = user.name.split(" ")[0];
  const isEmpty = Number(counts.customers) === 0 && Number(counts.open_deals) === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {firstName}</h1>
      <p className="mt-2 text-muted">Here is where {business.name} stands today.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-[2rem] p-6 ${s.tone}`}>
            <p className={`text-sm font-bold ${s.tone.includes("text-white") ? "text-lilac-200" : "text-muted"}`}>{s.label}</p>
            <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {isEmpty && (
        <div className="mt-6 rounded-[2rem] bg-lilac-100 p-8">
          <h2 className="font-display text-xl font-semibold">Your workspace is ready</h2>
          <p className="mt-2 max-w-xl leading-relaxed text-muted">
            The numbers above fill in as you add customers and deals. The Customer Hub and Sales Hub are the next
            parts of Operly we are building.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-[2rem] bg-white p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Recent activity</h2>
        <ul className="mt-4 divide-y divide-edge">
          {activities.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-semibold">{a.summary}</span>
              <time className="shrink-0 text-xs text-muted" dateTime={new Date(a.created_at).toISOString()}>
                {new Date(a.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
              </time>
            </li>
          ))}
          {activities.length === 0 && <li className="py-3 text-sm text-muted">Nothing has happened yet.</li>}
        </ul>
      </section>
    </div>
  );
}
