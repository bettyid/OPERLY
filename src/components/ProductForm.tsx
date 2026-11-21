"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/action";
import { ErrorNote, Field, PrimaryButton, inputClass } from "./ui";

type UnitRow = { id: number; name: string; factor: string; price: string };

export function ProductForm({
  action,
}: {
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { error: null });
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [base, setBase] = useState("unit");

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" id="name" required maxLength={120} autoComplete="off" />
        <Field label="SKU or code (optional)" id="sku" maxLength={60} autoComplete="off" />
        <Field label="Category" id="category" maxLength={80} placeholder="Snacks, Drinks, Fabric" autoComplete="off" />
        <Field label="Minimum stock (alert level)" id="min_stock" type="number" min="0" step="any" defaultValue="0" />
      </div>

      <fieldset className="rounded-2xl bg-lilac-50 p-4">
        <legend className="px-2 text-sm font-bold">Units and prices</legend>
        <p className="mb-3 text-xs text-muted">
          Stock is counted in the smallest unit you sell, such as a pack. Add bigger units like a carton and say how many
          packs it holds.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="base_unit" className="mb-1.5 block text-sm font-bold">
              Smallest unit
            </label>
            <input
              id="base_unit"
              name="base_unit"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className={inputClass}
              placeholder="pack, piece, kg"
              maxLength={30}
              required
            />
          </div>
          <Field label={`Selling price per ${base || "unit"}`} id="base_price" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>

        {rows.map((r) => (
          <div key={r.id} className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold">Unit name</label>
              <input name="unit_name" defaultValue={r.name} className={inputClass} placeholder="carton" maxLength={30} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Holds ({base || "unit"}s)</label>
              <input name="unit_factor" defaultValue={r.factor} type="number" min="0.0001" step="any" className={inputClass} placeholder="24" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Price</label>
              <input name="unit_price" defaultValue={r.price} type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" />
            </div>
            <button
              type="button"
              onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
              className="mb-1 rounded-full bg-white px-3 py-2 text-sm font-bold text-amber"
              aria-label="Remove unit"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows([...rows, { id: Date.now(), name: "", factor: "", price: "" }])}
          className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-iris-700 hover:bg-lilac-100"
        >
          Add another unit
        </button>
      </fieldset>

      <ErrorNote message={state.error} />
      <div className="max-w-xs">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving" : "Add product"}
        </PrimaryButton>
      </div>
    </form>
  );
}
