"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(app)/customers/actions";
import { STATUSES } from "@/lib/customer-input";
import { ErrorNote, Field, PrimaryButton, inputClass } from "./ui";

export type CustomerValues = {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  category?: string | null;
  status?: string;
  notes?: string | null;
  next_follow_up?: string | null;
};

const statusLabel: Record<string, string> = { lead: "Lead", active: "Active customer", inactive: "Inactive" };

export function CustomerForm({
  action,
  values = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values?: CustomerValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  return (
    <form action={formAction} className="space-y-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" id="name" defaultValue={values.name ?? ""} required maxLength={120} autoComplete="off" />
        <Field label="Company" id="company" defaultValue={values.company ?? ""} maxLength={120} autoComplete="off" />
        <Field label="Email" id="email" type="email" defaultValue={values.email ?? ""} maxLength={254} autoComplete="off" />
        <Field label="Phone" id="phone" type="tel" defaultValue={values.phone ?? ""} maxLength={30} placeholder="+44 7700 900123" autoComplete="off" />
        <Field label="Category" id="category" defaultValue={values.category ?? ""} maxLength={60} placeholder="Retail, VIP, Wholesale" autoComplete="off" />
        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-bold">
            Status
          </label>
          <select id="status" name="status" defaultValue={values.status ?? "lead"} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Field label="Next follow-up" id="next_follow_up" type="date" defaultValue={values.next_follow_up ?? ""} />
      </div>
      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-bold">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={4} maxLength={5000} defaultValue={values.notes ?? ""} className={inputClass} />
      </div>
      <ErrorNote message={state.error} />
      {state.saved && (
        <p role="status" className="rounded-2xl bg-mint/10 px-4 py-3 text-sm font-bold text-mint">
          Saved.
        </p>
      )}
      <div className="max-w-xs">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving" : submitLabel}
        </PrimaryButton>
      </div>
    </form>
  );
}
