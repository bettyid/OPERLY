import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/CustomerForm";
import { DeleteCustomerButton } from "@/components/DeleteCustomerButton";
import { query } from "@/lib/db";
import { localeFor } from "@/lib/regions";
import { requireWorkspace } from "@/lib/session";
import { updateCustomer } from "../actions";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  category: string | null;
  status: string;
  notes: string | null;
  next_follow_up: string | null;
};
type Activity = { id: string; summary: string; actor: string; created_at: Date };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireWorkspace();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [customer] = await query<Customer>(
    `select id, name, email, phone, company, category, status, notes,
            to_char(next_follow_up, 'YYYY-MM-DD') as next_follow_up
       from customers where id = $1 and business_id = $2`,
    [id, business.id],
  );
  if (!customer) notFound();

  const activities = await query<Activity>(
    `select id, summary, actor, created_at from activities
      where business_id = $1 and customer_id = $2 order by created_at desc limit 20`,
    [business.id, id],
  );
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: business.timezone,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/customers" className="text-sm font-bold text-iris-600 hover:underline">
        Back to customers
      </Link>
      <h1 className="mt-3 font-title text-4xl font-black tracking-tight sm:text-5xl">{customer.name}</h1>
      {customer.company && <p className="mt-2 text-muted">{customer.company}</p>}

      <div className="mt-6 rounded-[2rem] bg-white p-6 sm:p-8">
        <CustomerForm action={updateCustomer} values={customer} submitLabel="Save changes" />
      </div>

      <section className="mt-5 rounded-[2rem] bg-white p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold">History</h2>
        <ul className="mt-4 divide-y divide-edge">
          {activities.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-semibold">{a.summary}</span>
              <time className="shrink-0 text-xs text-muted" dateTime={new Date(a.created_at).toISOString()}>
                {fmt.format(new Date(a.created_at))}
              </time>
            </li>
          ))}
          {activities.length === 0 && <li className="py-3 text-sm text-muted">No history yet.</li>}
        </ul>
      </section>

      <div className="mt-6">
        <DeleteCustomerButton id={customer.id} name={customer.name} />
      </div>
    </div>
  );
}
