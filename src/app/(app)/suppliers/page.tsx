import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { SimpleForm } from "@/components/SimpleForm";
import { query } from "@/lib/db";
import { moneyFormatter } from "@/lib/regions";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";
import { createSupplierAction, paySupplierAction } from "./actions";

export default async function SuppliersPage() {
  const { ctx, business } = await requireCtx();
  if (!can(ctx.role, "costs.view")) redirect("/dashboard");
  const canManage = can(ctx.role, "purchases.create");
  const rows = await query<{ id: string; name: string; phone: string | null; billed: string; paid: string }>(
    `select s.id, s.name, s.phone,
            coalesce(sum(p.total) filter (where p.status='completed'),0) as billed,
            coalesce(sum(p.amount_paid) filter (where p.status='completed'),0) as paid
       from suppliers s left join purchases p on p.business_id=s.business_id and p.supplier_id=s.id
      where s.business_id=$1 and s.archived_at is null group by s.id order by lower(s.name)`,
    [business.id],
  );
  const money = moneyFormatter(business.country, business.currency);
  const totalOwed = rows.reduce((a, r) => a + (Number(r.billed) - Number(r.paid)), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-title text-4xl font-black tracking-tight sm:text-5xl">Suppliers</h1>
      <p className="mt-2 text-muted">{canManage ? `You owe suppliers ${money.format(totalOwed)} in total.` : "Who you buy from."}</p>

      {canManage && (
        <section className="mt-6 rounded-[2rem] bg-white p-6">
          <h2 className="font-display text-lg font-semibold">Add supplier</h2>
          <div className="mt-4">
            <SimpleForm
              action={createSupplierAction}
              submitLabel="Add supplier"
              successText="Supplier added."
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "phone", label: "Phone", type: "tel", placeholder: "+44 7700 900123" },
                { name: "email", label: "Email", type: "email" },
                { name: "notes", label: "Notes" },
              ]}
            />
          </div>
        </section>
      )}

      <section className="mt-5 rounded-[2rem] bg-white p-4 sm:p-6">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No suppliers yet. Add one, then record purchases from them.</p>
        ) : (
          <ul className="divide-y divide-edge">
            {rows.map((r) => {
              const owed = Number(r.billed) - Number(r.paid);
              return (
                <li key={r.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{r.name}</p>
                      {r.phone && <p className="text-xs text-muted">{r.phone}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-muted">You owe</p>
                      <p className={`font-display text-lg font-semibold ${owed > 0 ? "text-amber" : ""}`}>{money.format(owed)}</p>
                    </div>
                  </div>
                  {canManage && owed > 0 && (
                    <details className="mt-3">
                      <summary className="inline-block cursor-pointer rounded-full bg-lilac-100 px-4 py-2 text-sm font-bold text-iris-700">Record a payment</summary>
                      <div className="mt-3 rounded-2xl bg-lilac-50 p-4">
                        <SimpleForm
                          action={paySupplierAction}
                          submitLabel="Record payment"
                          successText="Payment recorded."
                          hidden={{ supplier_id: r.id, key: randomUUID() }}
                          fields={[
                            { name: "amount", label: "Amount", type: "number", step: "0.01", min: "0.01", required: true },
                            { name: "method", label: "Method", options: [
                              { value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" },
                              { value: "card", label: "Card" }, { value: "other", label: "Other" }] },
                          ]}
                        />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
