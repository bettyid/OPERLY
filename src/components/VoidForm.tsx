"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action";
import { ErrorNote, inputClass } from "./ui";

/** "Void" with a required reason. The record stays in the history. */
export function VoidForm({
  id, action, label = "Void", help,
}: {
  id: string;
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
  label?: string;
  help?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { error: null });
  return (
    <details>
      <summary className="inline-block cursor-pointer rounded-full bg-amber/10 px-3 py-1.5 text-xs font-bold text-amber">{label}</summary>
      <form action={formAction} className="mt-2 max-w-sm space-y-2 rounded-2xl bg-lilac-50 p-3">
        <input type="hidden" name="id" value={id} />
        <input name="reason" required minLength={3} placeholder="Reason" aria-label="Reason" className={inputClass} />
        {help && <p className="text-xs text-muted">{help}</p>}
        <ErrorNote message={state.error} />
        <button type="submit" disabled={pending} className="rounded-full bg-amber px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
          {pending ? "Voiding" : label}
        </button>
      </form>
    </details>
  );
}
