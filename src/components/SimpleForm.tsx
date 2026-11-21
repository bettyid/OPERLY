"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action";
import { ErrorNote, PrimaryButton, inputClass } from "./ui";

export type FieldSpec = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  step?: string;
  min?: string;
  defaultValue?: string;
};

/** A small inline form that clears itself after a successful save. */
export function SimpleForm({
  action,
  fields,
  submitLabel,
  hidden = {},
  successText = "Saved.",
  columns = 2,
}: {
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
  fields: FieldSpec[];
  submitLabel: string;
  hidden?: Record<string, string>;
  successText?: string;
  columns?: 1 | 2 | 3;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { error: null });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const grid = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className={`grid gap-3 ${grid}`}>
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={`f-${f.name}`} className="mb-1 block text-xs font-bold">{f.label}</label>
            {f.options ? (
              <select id={`f-${f.name}`} name={f.name} required={f.required} defaultValue={f.defaultValue} className={inputClass}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input id={`f-${f.name}`} name={f.name} type={f.type ?? "text"} required={f.required} placeholder={f.placeholder}
                step={f.step} min={f.min} defaultValue={f.defaultValue} className={inputClass} autoComplete="off" />
            )}
          </div>
        ))}
      </div>
      <ErrorNote message={state.error} />
      {state.ok && <p role="status" className="rounded-2xl bg-mint/10 px-4 py-2.5 text-sm font-bold text-mint">{successText}</p>}
      <div className="max-w-xs"><PrimaryButton type="submit" disabled={pending}>{pending ? "Saving" : submitLabel}</PrimaryButton></div>
    </form>
  );
}
