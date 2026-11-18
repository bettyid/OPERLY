import Link from "next/link";
import { query } from "@/lib/db";
import { localeFor } from "@/lib/regions";
import { requireWorkspace } from "@/lib/session";

const PAGE_SIZE = 25;

type Row = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  next_follow_up: string | null;
  overdue: boolean;
};

const statusStyle: Record<string, string> = {
  lead: "bg-amber/15 text-amber",
  active: "bg-mint/15 text-mint",
  inactive: "bg-lilac-200 text-muted",
};
const statusLabel: Record<string, string> = { lead: "Lead", active: "Active", inactive: "Inactive" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { business } = await requireWorkspace();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = ["lead", "active", "inactive"].includes(sp.status ?? "") ? sp.status! : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const like = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
  const where = `business_id = $1
    and ($2::text is null or name ilike $2 or coalesce(email,'') ilike $2 or coalesce(company,'') ilike $2 or coalesce(phone,'') ilike $2)
    and ($3::text = '' or status = $3)`;

  const [{ total }] = await query<{ total: string }>(`select count(*) as total from customers where ${where}`, [
    business.id,
    like,
    status,
  ]);
  const rows = await query<Row>(
    `select id, name, email, company, status,
            to_char(next_follow_up, 'YYYY-MM-DD') as next_follow_up,
            coalesce(next_follow_up < (now() at time zone $4)::date, false) as overdue
       from customers where ${where}
      order by (next_follow_up is null), next_follow_up asc, created_at desc
      limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
    [business.id, like, status, business.timezone],
  );

  const count = Number(total);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeZone: "UTC" });
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/customers${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Customers</h1>
          <p className="mt-2 text-muted">
            {count.toLocaleString(localeFor(business.country))} {count === 1 ? "customer" : "customers"}
            {q || status ? " match your filters" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/customers/import" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-iris-700 hover:bg-lilac-100">
            Import CSV
          </Link>
          <a href="/customers/export" download className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-iris-700 hover:bg-lilac-100">
            Export CSV
          </a>
          <Link href="/customers/new" className="rounded-full bg-iris-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-iris-500">
            Add customer
          </Link>
        </div>
      </div>

      <form method="get" className="mt-6 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, company or phone"
          aria-label="Search customers"
          className="min-w-0 flex-1 rounded-full border border-edge bg-white px-5 py-2.5 text-sm focus:border-iris-600 focus:outline-none focus:ring-2 focus:ring-iris-600/20"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by status"
          className="rounded-full border border-edge bg-white px-4 py-2.5 text-sm font-semibold focus:border-iris-600 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="lead">Leads</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" className="rounded-full bg-midnight-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-midnight-800">
          Search
        </button>
      </form>

      <section className="mt-5 rounded-[2rem] bg-white p-4 sm:p-6">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-display text-lg font-semibold">{q || status ? "No customers match" : "No customers yet"}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {q || status
                ? "Try a different search or clear the filter."
                : "Add your first customer, or import a spreadsheet saved as CSV."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="text-xs font-bold text-muted">
                  <th className="pb-3 pl-2 font-bold">Customer</th>
                  <th className="pb-3 font-bold">Company</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 pr-2 font-bold">Next follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-lilac-50">
                    <td className="py-3 pl-2">
                      <Link href={`/customers/${r.id}`} className="font-bold text-ink hover:text-iris-600">
                        {r.name}
                      </Link>
                      {r.email && <p className="text-xs text-muted">{r.email}</p>}
                    </td>
                    <td className="py-3 text-muted">{r.company ?? ""}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[r.status]}`}>{statusLabel[r.status]}</span>
                    </td>
                    <td className="py-3 pr-2">
                      {r.next_follow_up ? (
                        <span className={r.overdue ? "font-bold text-amber" : "text-ink"}>
                          {fmt.format(new Date(r.next_follow_up + "T00:00:00Z"))}
                          {r.overdue && " (overdue)"}
                        </span>
                      ) : (
                        <span className="text-muted">None set</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-sm font-bold">
          {page > 1 ? (
            <Link href={href(page - 1)} className="rounded-full bg-white px-5 py-2.5 text-iris-700 hover:bg-lilac-100">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1)} className="rounded-full bg-white px-5 py-2.5 text-iris-700 hover:bg-lilac-100">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
