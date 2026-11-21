"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { SummaryState } from "@/app/(app)/summaries/actions";
import { ErrorNote, PrimaryButton, inputClass } from "./ui";

type Exp = { id: number; description: string; amount: string; category: string };

export function SummaryForm({
  action, today, idemKey, currency,
}: {
  action: (prev: SummaryState, f: FormData) => Promise<SummaryState>;
  today: string;
  idemKey: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<SummaryState, FormData>(action, { error: null });
  const [period, setPeriod] = useState<"day" | "week">("day");
  const [expenses, setExpenses] = useState<Exp[]>([]);
  const nextId = useRef(1);
  const ref = useRef<HTMLFormElement>(null);

  // After a successful save, clear the expense rows (adjusting state while rendering is the supported pattern)
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) setExpenses([]);
  }
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  const upd = (id: number, patch: Partial<Exp>) => setExpenses(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <input type="hidden" name="key" value={idemKey} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="expenses" value={JSON.stringify(expenses.map(({ description, amount, category }) => ({ description, amount, category })))} />

      <div role="radiogroup" aria-label="Period" className="inline-grid grid-cols-2 gap-1 rounded-full bg-lilac-100 p-1 text-sm font-bold">
        {([["day", "One day"], ["week", "A week"]] as const).map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={period === v} onClick={() => setPeriod(v)}
            className={`rounded-full px-5 py-2 ${period === v ? "bg-iris-600 text-white" : "text-iris-700"}`}>{label}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="start" className="mb-1 block text-xs font-bold">{period === "week" ? "First day" : "Date"}</label>
          <input id="start" name="start" type="date" defaultValue={today} max={today} required className={inputClass} />
        </div>
        {period === "week" && (
          <div>
            <label htmlFor="end" className="mb-1 block text-xs font-bold">Last day</label>
            <input id="end" name="end" type="date" defaultValue={today} max={today} required className={inputClass} />
          </div>
        )}
        <div>
          <label htmlFor="units" className="mb-1 block text-xs font-bold">Units sold (optional)</label>
          <input id="units" name="units" type="number" min="0" step="any" inputMode="decimal" className={inputClass} placeholder="15" />
        </div>
      </div>

      <fieldset className="rounded-2xl bg-lilac-50 p-4">
        <legend className="px-2 text-sm font-bold">Money received ({currency})</legend>
        <div className="grid gap-3 sm:grid-cols-4">
          {([["cash", "Cash"], ["transfer", "Bank transfer"], ["card", "Card"], ["other", "Other"]] as const).map(([name, label]) => (
            <div key={name}>
              <label htmlFor={name} className="mb-1 block text-xs font-bold">{label}</label>
              <input id={name} name={name} type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} placeholder="0.00" />
            </div>
          ))}
        </div>
        <div className="mt-3 sm:max-w-xs">
          <label htmlFor="sales_total" className="mb-1 block text-xs font-bold">Total sales value (only if you know it)</label>
          <input id="sales_total" name="sales_total" type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} placeholder="Leave empty if unsure" />
        </div>
      </fieldset>

      <fieldset className="rounded-2xl bg-lilac-50 p-4">
        <legend className="px-2 text-sm font-bold">Expenses that day</legend>
        {expenses.map((e) => (
          <div key={e.id} className="mb-2 grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2">
            <input value={e.description} onChange={(x) => upd(e.id, { description: x.target.value })} className={inputClass} placeholder="Transportation" aria-label="Expense" />
            <input value={e.amount} onChange={(x) => upd(e.id, { amount: x.target.value })} type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} placeholder="Amount" aria-label="Amount" />
            <input value={e.category} onChange={(x) => upd(e.id, { category: x.target.value })} className={inputClass} placeholder="Category" aria-label="Category" />
            <button type="button" onClick={() => setExpenses(expenses.filter((x) => x.id !== e.id))} className="mb-1 rounded-full bg-white px-3 py-2 text-sm font-bold text-amber" aria-label="Remove expense">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setExpenses([...expenses, { id: nextId.current++, description: "", amount: "", category: "" }])}
          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-iris-700 ring-1 ring-edge hover:bg-lilac-100">Add an expense</button>
      </fieldset>

      <div>
        <label htmlFor="note" className="mb-1 block text-xs font-bold">Note (optional)</label>
        <input id="note" name="note" maxLength={500} className={inputClass} />
      </div>
      <p className="text-xs text-muted">Enter only what you know. A summary doesn&apos;t change your stock or customers, and Operly never invents product or customer details.</p>

      <ErrorNote message={state.error} />
      {state.ok && <p role="status" className="rounded-2xl bg-mint/10 px-4 py-3 text-sm font-bold text-mint">{state.notice ?? "Saved."}</p>}
      <div className="max-w-xs"><PrimaryButton type="submit" disabled={pending}>{pending ? "Saving" : "Save summary"}</PrimaryButton></div>
    </form>
  );
}
