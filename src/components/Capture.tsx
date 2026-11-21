"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ConfirmState, ExtractState } from "@/app/(app)/capture/actions";
import type { CatalogProduct, Draft } from "@/lib/capture/draft";
import { ErrorNote, inputClass } from "./ui";

type Opt = { id: string; name: string };
type Line = { id: number; productId: string; unitName: string; quantity: string; price: string };
type Review = {
  type: "sale" | "purchase" | "expense" | "summary";
  date: string;
  partyId: string;
  lines: Line[];
  payMode: "full" | "partial" | "later";
  paid: string;
  method: string;
  discount: string;
  extraCosts: string;
  expense: { description: string; amount: string; category: string };
  summary: { period: "day" | "week"; end: string; unitsSold: string; cash: string; transfer: string; card: string; other: string; expenses: { description: string; amount: string }[] };
};

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start(): void; stop(): void };
type SpeechCtor = new () => SpeechRec;
const speechCtor = (): SpeechCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const noop = () => () => {};

function toReview(d: Draft, today: string): Review {
  const type = d.type === "unknown" ? "sale" : d.type;
  return {
    type, date: d.date || today, partyId: d.partyId ?? "",
    lines: d.lines.map((l, i) => ({ id: i, productId: l.productId ?? "", unitName: l.unitName, quantity: l.quantity, price: l.price })),
    payMode: d.payMode, paid: d.paid, method: d.method || "cash", discount: d.discount, extraCosts: d.extraCosts,
    expense: d.expense ?? { description: "", amount: "", category: "" },
    summary: d.summary ? { ...d.summary, end: d.date || today } : { period: "day", end: d.date || today, unitsSold: "", cash: "", transfer: "", card: "", other: "", expenses: [] },
  };
}

export function Capture({
  products, customers, suppliers, today, currency, locale, speechLang, canDiscount, extract, confirm, discard,
}: {
  products: CatalogProduct[];
  customers: Opt[];
  suppliers: Opt[];
  today: string;
  currency: string;
  locale: string;
  speechLang: string;
  canDiscount: boolean;
  extract: (prev: ExtractState, f: FormData) => Promise<ExtractState>;
  confirm: (prev: ConfirmState, f: FormData) => Promise<ConfirmState>;
  discard: (f: FormData) => Promise<void>;
}) {
  const [ex, extractAction, extracting] = useActionState<ExtractState, FormData>(extract, { error: null });
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const supported = useSyncExternalStore(noop, () => !!speechCtor(), () => false);

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = speechLang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => setText(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="space-y-5">
      <form action={extractAction} className="rounded-[2rem] bg-white p-5 sm:p-6">
        <label htmlFor="transcript" className="mb-2 block text-sm font-bold">Say or type what happened</label>
        <textarea id="transcript" name="transcript" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} required
          placeholder="I sold five cartons of plantain chips today for 125,000. The customer paid by bank transfer." className={inputClass} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {supported && (
            <button type="button" onClick={toggleMic} aria-pressed={listening}
              className={`rounded-full px-5 py-2.5 text-sm font-bold ${listening ? "bg-amber text-white" : "bg-lilac-100 text-iris-700 hover:bg-lilac-200"}`}>
              {listening ? "Listening… tap to stop" : "Tap to speak"}
            </button>
          )}
          <button type="submit" disabled={extracting || text.trim().length < 3}
            className="rounded-full bg-iris-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-iris-500 disabled:cursor-not-allowed disabled:opacity-60">
            {extracting ? "Reading your note" : "Understand"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {supported ? "" : "Tip: tap the microphone on your phone keyboard to speak. "}
          You always review and correct the result before anything is saved.
        </p>
        <div className="mt-3"><ErrorNote message={ex.error} /></div>
      </form>

      {ex.draft && ex.captureId && (
        <ReviewCard key={ex.captureId} captureId={ex.captureId} draft={ex.draft} products={products} customers={customers} suppliers={suppliers}
          today={today} currency={currency} locale={locale} canDiscount={canDiscount} confirm={confirm} discard={discard} />
      )}
    </div>
  );
}

function ReviewCard({
  captureId, draft, products, customers, suppliers, today, currency, locale, canDiscount, confirm, discard,
}: {
  captureId: string; draft: Draft; products: CatalogProduct[]; customers: Opt[]; suppliers: Opt[]; today: string; currency: string; locale: string; canDiscount: boolean;
  confirm: (prev: ConfirmState, f: FormData) => Promise<ConfirmState>; discard: (f: FormData) => Promise<void>;
}) {
  const [result, confirmAction, saving] = useActionState<ConfirmState, FormData>(confirm, { error: null });
  const [r, setR] = useState<Review>(() => toReview(draft, today));
  const nextId = useRef(100);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const set = (patch: Partial<Review>) => setR({ ...r, ...patch });
  const setLine = (id: number, patch: Partial<Line>) => set({ lines: r.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const isTrade = r.type === "sale" || r.type === "purchase";
  const cents = (v: string) => Math.round((Number(v) || 0) * 100);
  const subtotal = r.lines.reduce((a, l) => a + Math.round((Number(l.quantity) || 0) * cents(l.price)), 0);
  const total = Math.max(subtotal - cents(r.discount) + (r.type === "purchase" ? cents(r.extraCosts) : 0), 0);
  const money = (c: number) => (c / 100).toLocaleString(locale, { style: "currency", currency });
  const parties = r.type === "sale" ? customers : suppliers;
  const labels = { sale: "Sale", purchase: "Purchase", expense: "Expense", summary: "Daily or weekly summary" } as const;

  if (result.ok) {
    return (
      <div role="status" className="rounded-[2rem] bg-mint/10 p-6">
        <p className="font-display text-lg font-semibold text-mint">{result.message}</p>
        {result.href && <Link href={result.href} className="mt-2 inline-block text-sm font-bold text-iris-700 underline">View it</Link>}
      </div>
    );
  }

  return (
    <form action={confirmAction} className="space-y-4 rounded-[2rem] bg-white p-5 sm:p-6">
      <input type="hidden" name="capture_id" value={captureId} />
      <input type="hidden" name="payload" value={JSON.stringify({ ...r, lines: r.lines.map(({ productId, unitName, quantity, price }) => ({ productId, unitName, quantity, price })) })} />
      <div>
        <h2 className="font-display text-lg font-semibold">Check before saving</h2>
        <p className="mt-1 text-sm text-muted">This is what I understood. Nothing is recorded until you confirm.</p>
      </div>

      {draft.issues.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-amber/10 p-4 text-sm font-semibold text-amber">
          {draft.issues.map((i, n) => <li key={n}>• {i}</li>)}
        </ul>
      )}

      <div role="radiogroup" aria-label="What is this?" className="grid grid-cols-2 gap-1 rounded-3xl bg-lilac-100 p-1 text-xs font-bold sm:grid-cols-4">
        {(["sale", "purchase", "expense", "summary"] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={r.type === t} onClick={() => set({ type: t })}
            className={`rounded-full px-3 py-2 ${r.type === t ? "bg-iris-600 text-white" : "text-iris-700"}`}>{labels[t]}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold">{r.type === "summary" ? "First day" : "Date"}</label>
          <input type="date" value={r.date} max={today} onChange={(e) => set({ date: e.target.value })} className={inputClass} required />
        </div>
        {isTrade && (
          <div>
            <label className="mb-1 block text-xs font-bold">{r.type === "sale" ? "Customer" : "Supplier"}</label>
            <select value={r.partyId} onChange={(e) => set({ partyId: e.target.value })} className={inputClass} required={r.type === "purchase"}>
              <option value="">{r.type === "sale" ? "Walk-in customer" : "Choose a supplier"}</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {isTrade && (
        <div className="space-y-3">
          {r.lines.map((l) => {
            const p = byId.get(l.productId);
            return (
              <div key={l.id} className="rounded-2xl bg-lilac-50 p-3">
                <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
                  <div>
                    <label className="mb-1 block text-xs font-bold">Product</label>
                    <select value={l.productId} className={inputClass} onChange={(e) => setLine(l.id, { productId: e.target.value, unitName: byId.get(e.target.value)?.baseUnit ?? "" })}>
                      <option value="">Choose a product</option>
                      {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold">Unit</label>
                    <select value={l.unitName} onChange={(e) => setLine(l.id, { unitName: e.target.value })} className={inputClass}>
                      {p?.units.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold">Quantity</label>
                    <input type="number" min="0" step="any" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(l.id, { quantity: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold">{r.type === "sale" ? "Price each" : "Cost each"}</label>
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={l.price} onChange={(e) => setLine(l.id, { price: e.target.value })} className={inputClass} />
                  </div>
                  <button type="button" onClick={() => set({ lines: r.lines.filter((x) => x.id !== l.id) })} className="rounded-full bg-white px-3 py-2 text-sm font-bold text-amber" aria-label="Remove line">×</button>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => set({ lines: [...r.lines, { id: nextId.current++, productId: "", unitName: "", quantity: "", price: "" }] })}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-iris-700 ring-1 ring-edge hover:bg-lilac-100">Add a product</button>

          <div className="grid gap-3 sm:grid-cols-3">
            {r.type === "sale" && canDiscount && (
              <div><label className="mb-1 block text-xs font-bold">Discount</label>
                <input type="number" min="0" step="0.01" value={r.discount} onChange={(e) => set({ discount: e.target.value })} className={inputClass} /></div>
            )}
            {r.type === "purchase" && (
              <div><label className="mb-1 block text-xs font-bold">Extra costs</label>
                <input type="number" min="0" step="0.01" value={r.extraCosts} onChange={(e) => set({ extraCosts: e.target.value })} className={inputClass} /></div>
            )}
            {r.type === "sale" ? (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold">Payment</label>
                <div role="radiogroup" aria-label="Payment" className="grid grid-cols-3 gap-1 rounded-full bg-lilac-100 p-1 text-xs font-bold">
                  {([["full", "Paid in full"], ["partial", "Part payment"], ["later", "Pay later"]] as const).map(([m, label]) => (
                    <button key={m} type="button" role="radio" aria-checked={r.payMode === m} onClick={() => set({ payMode: m })}
                      className={`rounded-full px-2 py-2 ${r.payMode === m ? "bg-iris-600 text-white" : "text-iris-700"}`}>{label}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div><label className="mb-1 block text-xs font-bold">Paid to supplier now</label>
                <input type="number" min="0" step="0.01" value={r.paid} onChange={(e) => set({ paid: e.target.value })} className={inputClass} /></div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.type === "sale" && r.payMode === "partial" && (
              <div><label className="mb-1 block text-xs font-bold">Paid now</label>
                <input type="number" min="0.01" step="0.01" value={r.paid} onChange={(e) => set({ paid: e.target.value })} className={inputClass} /></div>
            )}
            {!(r.type === "sale" && r.payMode === "later") && (
              <div><label className="mb-1 block text-xs font-bold">Payment method</label>
                <select value={r.method} onChange={(e) => set({ method: e.target.value })} className={inputClass}>
                  <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="other">Other</option>
                </select></div>
            )}
          </div>
          <div className="rounded-2xl bg-midnight-900 p-4 text-white">
            <div className="flex items-center justify-between"><span className="text-sm text-lilac-200">Total</span><span className="font-display text-2xl font-semibold">{money(total)}</span></div>
          </div>
        </div>
      )}

      {r.type === "expense" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="mb-1 block text-xs font-bold">What was it for?</label>
            <input value={r.expense.description} onChange={(e) => set({ expense: { ...r.expense, description: e.target.value } })} className={inputClass} /></div>
          <div><label className="mb-1 block text-xs font-bold">Amount</label>
            <input type="number" min="0" step="0.01" value={r.expense.amount} onChange={(e) => set({ expense: { ...r.expense, amount: e.target.value } })} className={inputClass} /></div>
          <div><label className="mb-1 block text-xs font-bold">Category (optional)</label>
            <input value={r.expense.category} onChange={(e) => set({ expense: { ...r.expense, category: e.target.value } })} className={inputClass} /></div>
          <div><label className="mb-1 block text-xs font-bold">Paid by</label>
            <select value={r.method} onChange={(e) => set({ method: e.target.value })} className={inputClass}>
              <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="other">Other</option>
            </select></div>
        </div>
      )}

      {r.type === "summary" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="mb-1 block text-xs font-bold">Period</label>
              <select value={r.summary.period} onChange={(e) => set({ summary: { ...r.summary, period: e.target.value === "week" ? "week" : "day" } })} className={inputClass}>
                <option value="day">One day</option><option value="week">A week</option></select></div>
            {r.summary.period === "week" && (
              <div><label className="mb-1 block text-xs font-bold">Last day</label>
                <input type="date" max={today} value={r.summary.end} onChange={(e) => set({ summary: { ...r.summary, end: e.target.value } })} className={inputClass} /></div>
            )}
            <div><label className="mb-1 block text-xs font-bold">Units sold</label>
              <input type="number" min="0" step="any" value={r.summary.unitsSold} onChange={(e) => set({ summary: { ...r.summary, unitsSold: e.target.value } })} className={inputClass} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {(["cash", "transfer", "card", "other"] as const).map((k) => (
              <div key={k}><label className="mb-1 block text-xs font-bold capitalize">{k} received</label>
                <input type="number" min="0" step="0.01" value={r.summary[k]} onChange={(e) => set({ summary: { ...r.summary, [k]: e.target.value } })} className={inputClass} /></div>
            ))}
          </div>
          {r.summary.expenses.map((e, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr] gap-2">
              <input value={e.description} onChange={(x) => set({ summary: { ...r.summary, expenses: r.summary.expenses.map((y, j) => (j === i ? { ...y, description: x.target.value } : y)) } })} className={inputClass} aria-label="Expense" />
              <input type="number" min="0" step="0.01" value={e.amount} onChange={(x) => set({ summary: { ...r.summary, expenses: r.summary.expenses.map((y, j) => (j === i ? { ...y, amount: x.target.value } : y)) } })} className={inputClass} aria-label="Expense amount" />
            </div>
          ))}
        </div>
      )}

      <ErrorNote message={result.error} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="rounded-full bg-iris-600 px-6 py-3 text-sm font-bold text-white hover:bg-iris-500 disabled:opacity-60">
          {saving ? "Saving" : "Confirm and save"}
        </button>
        <button type="submit" formAction={discard} formNoValidate className="rounded-full bg-lilac-100 px-6 py-3 text-sm font-bold text-iris-700 hover:bg-lilac-200">Discard</button>
      </div>
    </form>
  );
}
