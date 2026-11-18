"use client";

import { useActionState } from "react";
import { importCustomers, type FormState } from "@/app/(app)/customers/actions";
import { ErrorNote, PrimaryButton, inputClass } from "./ui";

export function ImportForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(importCustomers, { error: null });
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="file" className="mb-1.5 block text-sm font-bold">
          CSV file
        </label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required className={inputClass} />
      </div>
      <ErrorNote message={state.error} />
      {state.saved && state.message && (
        <p role="status" className="rounded-2xl bg-mint/10 px-4 py-3 text-sm font-bold text-mint">
          {state.message}
        </p>
      )}
      <div className="max-w-xs">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Importing" : "Import customers"}
        </PrimaryButton>
      </div>
    </form>
  );
}
