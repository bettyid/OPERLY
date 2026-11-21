"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import type { ActionState } from "@/lib/action";
import { ErrorNote, PrimaryButton, inputClass } from "./ui";

export type PProduct = { id: string; name: string; baseUnit: string; units: { name: string; factor: number }[] };
type Line = { id: number; productId: string; unitName: string; quantity: string; unitCost: string };

export function PurchaseForm({
  action, products, suppliers, today, currency, idemKey,
}: {
  idemKey: string;
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
  products: PProduct[];
  suppliers: { id: string; name: string }[];
  today: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { error: null });
  const nextId = useRef(1);
  const first = products[0];
  const blank = (id: number): Line => ({ id, productId: first?.id ?? "", unitName: first?.units[0]?.name ?? "", quantity: "", unitCost: "" });
  const [lines, setLines] = useState<Line[]>([blank(0)]);
  const [extra, setExtra] = useState("");
  const [paid, setPaid] = useState("");

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const cents = (v: string) => Math.round((Number(v) || 0) * 100);
  const subtotal = lines.reduce((a, l) => a + Math.round((Number(l.quantity) || 0) * cents(l.unitCost)), 0);
  const total = subtotal + cents(extra);
  const fmt = (c: number) => (c / 100).toLocaleString("en", { style: "currency", currency });

  const update = (id: number, patch: Partial<Line>) => setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="key" value={idemKey} />
      <input type="hidden" name="lines" value={JSON.stringify(lines.map(({ productId, unitName, quantity, unitCost }) => ({ productId, unitName, quantity, unitCost })))} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="supplier_id" className="mb-1 block text-sm font-bold">Supplier</label>
          <select id="supplier_id" name="supplier_id" required className={inputClass} defaultValue="">
            <option value="" disabled>Choose a supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-bold">Purchase date</label>
          <input id="date" name="date" type="date" defaultValue={today} max={today} className={inputClass} required />
        </div>
      </div>

      <div className="space-y-3">
        {lines.map((l) => {
          const p = byId.get(l.productId);
          return (
            <div key={l.id} className="rounded-2xl bg-lilac-50 p-3">
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
                <div>
                  <label className="mb-1 block text-xs font-bold">Product</label>
                  <select value={l.productId} className={inputClass}
                    onChange={(e) => update(l.id, { productId: e.target.value, unitName: byId.get(e.target.value)?.units[0]?.name ?? "" })}>
                    {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Unit</label>
                  <select value={l.unitName} onChange={(e) => update(l.id, { unitName: e.target.value })} className={inputClass}>
                    {p?.units.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Quantity</label>
                  <input value={l.quantity} onChange={(e) => update(l.id, { quantity: e.target.value })} type="number" min="0" step="any" inputMode="decimal" className={inputClass} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Cost per {l.unitName || "unit"}</label>
                  <input value={l.unitCost} onChange={(e) => update(l.id, { unitCost: e.target.value })} type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} required />
                </div>
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines(lines.filter((x) => x.id !== l.id))} className="rounded-full bg-white px-3 py-2 text-sm font-bold text-amber" aria-label="Remove line">×</button>
                )}
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setLines([...lines, blank(nextId.current++)])} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-iris-700 ring-1 ring-edge hover:bg-lilac-100">
          Add another product
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="extra_costs" className="mb-1 block text-sm font-bold">Extra costs (transport, fees)</label>
          <input id="extra_costs" name="extra_costs" type="number" min="0" step="0.01" value={extra} onChange={(e) => setExtra(e.target.value)} className={inputClass} placeholder="0.00" />
        </div>
        <div>
          <label htmlFor="paid" className="mb-1 block text-sm font-bold">Paid now</label>
          <input id="paid" name="paid" type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} className={inputClass} placeholder="0.00" />
        </div>
        <div>
          <label htmlFor="method" className="mb-1 block text-sm font-bold">Payment method</label>
          <select id="method" name="method" className={inputClass} defaultValue="cash">
            <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option><option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-midnight-900 p-4 text-white">
        <div className="flex items-center justify-between"><span className="text-sm text-lilac-200">Total</span><span className="font-display text-2xl font-semibold">{fmt(total)}</span></div>
        <div className="mt-1 flex items-center justify-between text-sm text-lilac-200"><span>Still owed to supplier</span><span>{fmt(Math.max(total - cents(paid), 0))}</span></div>
      </div>

      <ErrorNote message={state.error} />
      <div className="max-w-xs"><PrimaryButton type="submit" disabled={pending || products.length === 0}>{pending ? "Saving" : "Record purchase"}</PrimaryButton></div>
    </form>
  );
}
