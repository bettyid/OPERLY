"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action";
import { ErrorNote, Field, PrimaryButton, inputClass } from "./ui";

export type ProductValues = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  minStock: string;
  baseUnit: string;
  units: { name: string; factor: string; price: string | null; isBase: boolean }[];
};

export function EditProductForm({
  action,
  product,
}: {
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
  product: ProductValues;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { error: null });
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={product.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" id="name" defaultValue={product.name} required maxLength={120} autoComplete="off" />
        <Field label="SKU or code" id="sku" defaultValue={product.sku ?? ""} maxLength={60} autoComplete="off" />
        <Field label="Category" id="category" defaultValue={product.category ?? ""} maxLength={80} autoComplete="off" />
        <Field label={`Minimum stock (${product.baseUnit})`} id="min_stock" type="number" min="0" step="any" defaultValue={product.minStock} />
      </div>
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-bold">
          Description
        </label>
        <textarea id="description" name="description" rows={2} defaultValue={product.description ?? ""} className={inputClass} maxLength={1000} />
      </div>
      <fieldset className="rounded-2xl bg-lilac-50 p-4">
        <legend className="px-2 text-sm font-bold">Selling prices</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {product.units.map((u) => (
            <div key={u.name}>
              <input type="hidden" name="price_unit" value={u.name} />
              <label className="mb-1 block text-xs font-bold">
                Per {u.name}
                {!u.isBase && <span className="font-normal text-muted"> (holds {Number(u.factor)} {product.baseUnit}s)</span>}
              </label>
              <input name="price_value" type="number" min="0" step="0.01" defaultValue={u.price ?? ""} className={inputClass} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Price changes are saved in the price history.</p>
      </fieldset>
      <ErrorNote message={state.error} />
      {state.ok && (
        <p role="status" className="rounded-2xl bg-mint/10 px-4 py-3 text-sm font-bold text-mint">
          Saved.
        </p>
      )}
      <div className="max-w-xs">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving" : "Save changes"}
        </PrimaryButton>
      </div>
    </form>
  );
}
