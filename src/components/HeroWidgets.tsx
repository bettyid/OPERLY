/** Sample-data widgets that float at the bottom of the hero frame. All figures are illustrative. */

function Wave({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 60" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d="M0 40 C 15 20, 25 50, 45 34 S 75 10, 95 30 S 130 52, 150 28 S 185 14, 200 24" fill="none" stroke="#7b5be0" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Dots({ filled, total, cols }: { filled: number; total: number; cols: number }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i < filled ? "bg-orbit-500" : "bg-lav-100"}`} />
      ))}
    </div>
  );
}

const card = "rounded-[1.5rem] bg-white p-4 shadow-[0_10px_30px_-12px_rgba(103,71,207,0.25)] ring-1 ring-lav-100";

export function HeroWidgets() {
  const bars = [14, 26, 18, 34, 22, 40, 28];
  return (
    <div className="relative mx-auto mt-2 grid max-w-5xl gap-4 px-4 pb-0 sm:px-7 lg:grid-cols-[1fr_1.35fr_1fr]">
      {/* left column */}
      <div className="hidden gap-4 lg:grid lg:content-start">
        <div className="grid grid-cols-2 gap-4">
          <div className={card}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lav-100 text-orbit-500" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </span>
            <p className="mt-3 font-display text-lg font-semibold text-navy">13 days</p>
            <p className="text-[11px] text-navy/60">oldest unpaid sale</p>
            <div className="mt-3"><Dots filled={13} total={21} cols={7} /></div>
          </div>
          <div className={card}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lav-100 text-orbit-500" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </span>
            <div className="mt-3 flex items-end gap-1" aria-hidden="true">
              {bars.map((h, i) => <span key={i} className={`w-2 rounded-full ${i === 5 ? "bg-orbit-500" : "bg-lav-100"}`} style={{ height: h }} />)}
            </div>
            <p className="mt-2 inline-block rounded-full bg-orbit-500 px-2.5 py-0.5 text-[11px] font-bold text-white">This month</p>
          </div>
        </div>
        <div className={card}>
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lav-100 text-orbit-500" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-6 4 4 6-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <p className="font-display text-lg font-semibold text-navy"><span className="text-orbit-500">₦</span> 624,000</p>
          </div>
          <Wave className="mt-2 h-14 w-full" />
          <div className="mt-1 flex items-end justify-between">
            <div><p className="text-sm font-bold text-navy">Weekly sales</p><p className="text-[11px] text-navy/60">All products</p></div>
            <span className="rounded-full bg-lav-100 px-2.5 py-1 text-[11px] font-bold text-orbit-500">+9.3%</span>
          </div>
        </div>
      </div>

      {/* centre: business today */}
      <div className="rounded-[1.75rem] bg-white p-4 shadow-[0_20px_50px_-20px_rgba(103,71,207,0.35)] ring-1 ring-lav-100 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-navy">Business today</p>
          <span className="rounded-full bg-lav-100 px-3 py-1 text-[11px] font-bold text-navy/70">Filters</span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-lav-50 px-4 py-2 ring-1 ring-lav-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="#7b5be0" strokeWidth="2.4" /><path d="M20 20l-4-4" stroke="#7b5be0" strokeWidth="2.4" strokeLinecap="round" /></svg>
          <span className="truncate text-xs text-navy/60">Search sales, stock, customers</span>
          <span className="ml-auto hidden rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-navy/70 ring-1 ring-lav-100 sm:inline">Today ×</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-lav-50 p-3 ring-1 ring-lav-100">
            <p className="font-display text-base font-semibold text-navy"><span className="text-orbit-500">₦</span> 43,200</p>
            <p className="text-[11px] text-navy/60">Sales today</p>
            <div className="mt-3 flex items-end gap-1" aria-hidden="true">
              {[10, 20, 14, 28, 18, 24].map((h, i) => <span key={i} className={`w-1.5 rounded-full ${i === 3 ? "bg-orbit-500" : "bg-orbit-400/40"}`} style={{ height: h }} />)}
            </div>
          </div>
          <div className="rounded-2xl bg-lav-50 p-3 ring-1 ring-lav-100">
            <p className="text-[11px] font-bold text-navy">Stock alerts</p>
            <ul className="mt-2 space-y-2 text-[11px] text-navy/80">
              {["Plantain chips: low", "Zobo drink: 12 left", "Candles: 4 left"].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orbit-500" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 rounded-2xl bg-lav-50 p-3 text-center ring-1 ring-lav-100 sm:col-span-1">
            <svg className="mx-auto" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <g stroke="#7b5be0" strokeWidth="1.8" strokeLinecap="round">{[0, 45, 90, 135].map((a) => <path key={a} d="M12 2v5M12 17v5" transform={`rotate(${a} 12 12)`} />)}</g>
            </svg>
            <p className="mt-1 text-[11px] font-bold text-navy">Customer debts</p>
            <p className="text-[11px] text-navy/60">3 customers owe ₦40,000</p>
            <span className="mt-2 inline-block rounded-full bg-black px-4 py-1.5 text-[11px] font-bold text-white">View debts</span>
          </div>
        </div>
      </div>

      {/* right column */}
      <div className="hidden gap-4 lg:grid lg:content-start">
        <div className={card}>
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lav-100 text-orbit-500" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </span>
            <p className="font-display text-lg font-semibold text-navy"><span className="text-orbit-500">₦</span> 160,730</p>
          </div>
          <Wave className="mt-2 h-12 w-full" />
          <div className="mt-1 flex items-end justify-between">
            <div><p className="text-sm font-bold text-navy">Cash received</p><p className="text-[11px] text-navy/60">This month</p></div>
            <span className="rounded-full bg-lav-100 px-2.5 py-1 text-[11px] font-bold text-orbit-500">+9.3%</span>
          </div>
        </div>
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lav-100 text-orbit-500" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </span>
            <span className="rounded-full bg-lav-50 px-3 py-1 text-[11px] font-bold text-navy ring-1 ring-lav-100">Weekly ⌄</span>
          </div>
          <div className="mt-3"><Dots filled={34} total={60} cols={12} /></div>
          <p className="mt-3 text-[11px] text-navy/60">Total received</p>
          <p className="font-display text-xl font-semibold text-navy"><span className="text-orbit-500">₦</span> 623,194.80</p>
        </div>
      </div>
    </div>
  );
}
