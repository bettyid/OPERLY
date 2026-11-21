"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action";
import { ErrorNote, inputClass } from "./ui";

export function ReceiptActions({
  saleId, canVoid, voidAction,
}: {
  saleId: string;
  canVoid: boolean;
  voidAction: (prev: ActionState, f: FormData) => Promise<ActionState>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(voidAction, { error: null });
  return (
    <div className="print:hidden">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="rounded-full bg-iris-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-iris-500">
          Print receipt
        </button>
      </div>
      {canVoid && (
        <details className="mt-4">
          <summary className="inline-block cursor-pointer rounded-full bg-amber/10 px-5 py-2.5 text-sm font-bold text-amber">Void this sale</summary>
          <form action={action} className="mt-3 max-w-md space-y-3 rounded-2xl bg-lilac-50 p-4">
            <input type="hidden" name="id" value={saleId} />
            <label htmlFor="reason" className="block text-sm font-bold">Why is it being voided?</label>
            <input id="reason" name="reason" required minLength={3} className={inputClass} placeholder="Customer cancelled" />
            <p className="text-xs text-muted">Stock goes back on the shelf and the payments are marked void. The sale stays in the history.</p>
            <ErrorNote message={state.error} />
            <button type="submit" disabled={pending} className="rounded-full bg-amber px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {pending ? "Voiding" : "Void sale"}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
