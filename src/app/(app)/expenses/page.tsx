import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { SimpleForm } from "@/components/SimpleForm";
import { VoidForm } from "@/components/VoidForm";
import { query } from "@/lib/db";
import { localeFor, moneyFormatter } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { createExpenseAction, voidExpenseAction } from "./actions";

type Row = { id: string; description: string; amount: string; expense_date: string; payment_method: string; category: string | null; source: string; voided_at: Date | null };
const methodLabel: Record<string, string> = { cash: "Cash", bank_transfer: "Bank transfer", card: "Card", other: "Other" };

export default async function ExpensesPage() {
  const { ctx, business } = await requireCtx();
  if (!can(ctx.role, "expenses.manage")) redirect("/dashboard");
  const rows = await query<Row>(
    `select e.id, e.description, e.amount, to_char(e.expense_date,'YYYY-MM-DD') as expense_date, e.payment_method, c.name as category, e.source, e.voided_at
       from expenses e left join expense_categories c on c.business_id=e.business_id and c.id=e.category_id
      where e.business_id=$1 order by e.expense_date desc, e.created_at desc limit 100`,
    [business.id],
  );
  const money = moneyFormatter(business.country, business.currency);
  const fmt = new Intl.DateTimeFormat(localeFor(business.country), { dateStyle: "medium", timeZone: "UTC" });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: business.timezone }).format(new Date());
  const monthPrefix = today.slice(0, 7);
  const monthTotal = rows.filter((r) => !r.voided_at && r.expense_date.startsWith(monthPrefix)).reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Expenses</h1>
      <p className="mt-2 text-muted">Running costs like transport, rent and salaries. Buying stock goes under Purchases, not here.</p>
      <div className="mt-6 rounded-[1.75rem] bg-white p-6">
        <p className="text-sm font-bold text-muted">Spent this month</p>
        <p className="mt-2 font-display text-3xl font-semibold">{money.format(monthTotal)}</p>
      </div>

      <section className="mt-5 rounded-[2rem] bg-white p-6">
        <h2 className="font-display text-lg font-semibold">Add expense</h2>
        <div className="mt-4">
          <SimpleForm
            action={createExpenseAction}
            submitLabel="Add expense"
            successText="Expense added."
            hidden={{ key: randomUUID() }}
            columns={3}
            fields={[
              { name: "description", label: "What was it for?", required: true, placeholder: "Transportation" },
              { name: "amount", label: "Amount", type: "number", step: "0.01", min: "0.01", required: true },
              { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
              { name: "category", label: "Category (optional)", placeholder: "Transport, Rent, Salaries" },
              { name: "method", label: "Paid by", options: [
                { value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" },
                { value: "card", label: "Card" }, { value: "other", label: "Other" }] },
            ]}
          />
        </div>
      </section>

      <section className="mt-5 rounded-[2rem] bg-white p-4 sm:p-6">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No expenses yet.</p>
        ) : (
          <ul className="divide-y divide-edge">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className={r.voided_at ? "text-muted line-through" : ""}>
                  <p className="font-bold">{r.description}</p>
                  <p className="text-xs text-muted">
                    {fmt.format(new Date(r.expense_date + "T00:00:00Z"))} · {[r.category, methodLabel[r.payment_method]].filter(Boolean).join(" · ")}
                    {r.source === "summary" ? " · From a summary" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-display font-medium ${r.voided_at ? "text-muted line-through" : ""}`}>{money.format(Number(r.amount))}</span>
                  {r.voided_at ? <span className="text-xs font-bold text-muted">Voided</span>
                    : r.source === "summary" ? null : <VoidForm id={r.id} action={voidExpenseAction} label="Void" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
