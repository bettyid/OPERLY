"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/action";
import { ErrorNote, inputClass } from "./ui";

export type PosProduct = {
  id: string;
  name: string;
  baseUnit: string;
  stock: number;
  units: { name: string; factor: number; price: number }[];
};
type Cart = { productId: string; unitName: string; qty: number };

export function Pos({
  action, products, customers, currency, locale, canDiscount, idemKey,
}: {
  idemKey: string;
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
  products: PosProduct[];
  customers: { id: string; name: string }[];
  currency: string;
  locale: string;
  canDiscount: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { error: null });
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Cart[]>([]);
  const [mode, setMode] = useState<"full" | "partial" | "later">("full");
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const money = (c: number) => (c / 100).toLocaleString(locale, { style: "currency", currency });
  const cents = (n: number) => Math.round(n * 100);

  const lineCents = (l: Cart) => {
    const u = byId.get(l.productId)?.units.find((x) => x.name === l.unitName);
    return u ? Math.round(l.qty * cents(u.price)) : 0;
  };
  const subtotal = cart.reduce((a, l) => a + lineCents(l), 0);
  const disc = Math.min(cents(Number(discount) || 0), subtotal);
  const total = subtotal - disc;

  const shown = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60);

  function add(p: PosProduct) {
    const unit = p.units[0];
    const existing = cart.find((l) => l.productId === p.id && l.unitName === unit.name);
    if (existing) setCart(cart.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l)));
    else setCart([...cart, { productId: p.id, unitName: unit.name, qty: 1 }]);
  }
  const setLine = (i: number, patch: Partial<Cart>) => setCart(cart.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <input type="hidden" name="key" value={idemKey} />
      <input type="hidden" name="cart" value={JSON.stringify(cart.map((l) => ({ productId: l.productId, unitName: l.unitName, quantity: String(l.qty) })))} />
      <input type="hidden" name="pay_mode" value={mode} />

      <section className="rounded-[2rem] bg-white p-4 sm:p-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products"
          className="w-full rounded-full border border-edge px-5 py-3 text-base focus:border-iris-600 focus:outline-none focus:ring-2 focus:ring-iris-600/20" />
        {shown.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-lilac-50 px-4 py-8 text-center text-sm text-muted">
            {products.length === 0 ? "Add products with a selling price to start selling." : "No products match."}
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => add(p)} disabled={p.stock <= 0}
                  className="flex h-full min-h-24 w-full flex-col justify-between rounded-2xl bg-lilac-50 p-3 text-left hover:bg-lilac-100 disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="text-sm font-bold leading-snug">{p.name}</span>
                  <span>
                    <span className="block font-display text-base font-semibold text-iris-700">{money(cents(p.units[0].price))}<span className="text-xs font-normal text-muted">/{p.units[0].name}</span></span>
                    <span className="text-xs text-muted">{p.stock > 0 ? `${p.stock.toLocaleString(locale, { maximumFractionDigits: 3 })} ${p.baseUnit} left` : "Out of stock"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[2rem] bg-white p-4 sm:p-6 lg:sticky lg:top-6 lg:self-start">
        <h2 className="font-display text-lg font-semibold">Current sale</h2>
        {cart.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-lilac-50 px-4 py-6 text-center text-sm text-muted">Tap a product to add it.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {cart.map((l, i) => {
              const p = byId.get(l.productId)!;
              return (
                <li key={`${l.productId}-${l.unitName}`} className="rounded-2xl bg-lilac-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{p.name}</p>
                    <button type="button" onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-sm font-bold text-amber" aria-label={`Remove ${p.name}`}>×</button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setLine(i, { qty: Math.max(l.qty - 1, 1) })} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold" aria-label="Less">−</button>
                      <input type="number" min="0.001" step="any" inputMode="decimal" value={l.qty} aria-label="Quantity"
                        onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} className="w-16 rounded-xl border border-edge bg-white px-2 py-2 text-center text-sm font-bold" />
                      <button type="button" onClick={() => setLine(i, { qty: l.qty + 1 })} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold" aria-label="More">+</button>
                    </div>
                    <select value={l.unitName} onChange={(e) => setLine(i, { unitName: e.target.value })} className="rounded-xl border border-edge bg-white px-2 py-2 text-sm font-semibold" aria-label="Unit">
                      {p.units.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                    <span className="font-display font-medium">{money(lineCents(l))}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="customer_id" className="mb-1 block text-xs font-bold">Customer (optional for walk-ins)</label>
            <select id="customer_id" name="customer_id" className={inputClass} defaultValue="">
              <option value="">Walk-in customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {canDiscount && (
            <div>
              <label htmlFor="discount" className="mb-1 block text-xs font-bold">Discount</label>
              <input id="discount" name="discount" type="number" min="0" step="0.01" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputClass} placeholder="0.00" />
            </div>
          )}
          <div role="radiogroup" aria-label="Payment" className="grid grid-cols-3 gap-1 rounded-full bg-lilac-100 p-1 text-xs font-bold">
            {([["full", "Paid in full"], ["partial", "Part payment"], ["later", "Pay later"]] as const).map(([m, label]) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                className={`rounded-full px-2 py-2 ${mode === m ? "bg-iris-600 text-white" : "text-iris-700"}`}>{label}</button>
            ))}
          </div>
          {mode === "partial" && (
            <input name="paid" type="number" min="0.01" step="0.01" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} className={inputClass} placeholder="Amount paid now" aria-label="Amount paid now" required />
          )}
          {mode !== "later" && (
            <select name="method" className={inputClass} defaultValue="cash" aria-label="Payment method">
              <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option><option value="other">Other</option>
            </select>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-midnight-900 p-4 text-white">
          {disc > 0 && <div className="flex justify-between text-sm text-lilac-200"><span>Subtotal</span><span>{money(subtotal)}</span></div>}
          <div className="flex items-center justify-between"><span className="text-sm text-lilac-200">Total</span><span className="font-display text-2xl font-semibold">{money(total)}</span></div>
          {mode === "partial" && <div className="mt-1 flex justify-between text-sm text-lilac-200"><span>Customer still owes</span><span>{money(Math.max(total - cents(Number(paid) || 0), 0))}</span></div>}
          {mode === "later" && <div className="mt-1 flex justify-between text-sm text-lilac-200"><span>Customer owes</span><span>{money(total)}</span></div>}
        </div>

        <div className="mt-3"><ErrorNote message={state.error} /></div>
        <button type="submit" disabled={pending || cart.length === 0}
          className="mt-3 w-full rounded-full bg-iris-600 px-6 py-4 text-base font-bold text-white hover:bg-iris-500 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Saving sale" : `Complete sale · ${money(total)}`}
        </button>
      </section>
    </form>
  );
}
