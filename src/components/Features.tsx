import { AreaChart, Coin, CoinStack, Glow, Sparkle } from "./art";
import { Reveal } from "./Reveal";

const glass =
  "rounded-[2rem] bg-white/70 p-7 ring-1 ring-white shadow-[0_24px_50px_-30px_rgba(103,71,207,0.5)] backdrop-blur";

function Card({ className = "", delay = 0, children }: { className?: string; delay?: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay} className={`relative overflow-hidden ${className}`}>
      {children}
    </Reveal>
  );
}

const debtors = [
  { i: "AO", n: "Ada Okafor", owed: "30,000", pct: 62 },
  { i: "BL", n: "Ben Lee", owed: "10,000", pct: 20 },
  { i: "SR", n: "Sofia Reyes", owed: "4,500", pct: 85 },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-6 overflow-hidden bg-gradient-to-b from-[#e9e3fb] via-[#f3effd] to-[#eef0ff]">
      <Glow className="-left-24 top-10 h-72 w-72 bg-orbit-400/30" />
      <Glow className="-right-20 top-1/2 h-80 w-80 bg-[#9db8f5]/40" />
      <Coin size={64} className="float absolute right-[6%] top-16 hidden opacity-90 lg:block" />
      <Coin size={38} className="float-slow absolute left-[7%] top-[46%] hidden opacity-80 lg:block" />

      <div className="relative mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-medium tracking-tight text-navy sm:text-5xl">
            Everything your shop does in a day
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-navy/70">
            Sales, stock, purchases and debts share one set of records, so nothing is typed twice and the numbers always agree.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-6">
          {/* Speak or type */}
          <Card className="rounded-[2rem] bg-gradient-to-br from-[#3a2a8c] via-[#5a43c9] to-[#8a6fe8] p-7 text-white shadow-[0_30px_60px_-30px_rgba(60,40,140,0.8)] lg:col-span-3 lg:row-span-2">
            <Sparkle className="absolute right-6 top-6" />
            <h3 className="font-display text-2xl font-semibold">Speak or type</h3>
            <p className="mt-2 max-w-sm leading-relaxed text-white/80">
              Say what happened in your own words. Operly prepares the record, you check it, and only then is it saved.
            </p>
            <div className="mt-7 flex h-14 items-center gap-1.5" aria-hidden="true">
              {[12, 26, 40, 22, 48, 30, 14, 36, 50, 24, 16, 34, 22, 10].map((h, i) => (
                <span key={i} className="w-1.5 rounded-full bg-white/80" style={{ height: h, opacity: 0.45 + (i % 4) * 0.15 }} />
              ))}
            </div>
            <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 ring-1 ring-white/20">
              &ldquo;I sold five cartons of plantain chips for 125,000. The customer paid by bank transfer.&rdquo;
            </p>
            <div className="mt-4 rounded-2xl bg-white p-4 text-navy shadow-lg">
              <p className="text-xs font-bold text-orbit-500">Check before saving</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-lav-100 px-3 py-1">Sale</span>
                <span className="rounded-full bg-lav-100 px-3 py-1">5 cartons</span>
                <span className="rounded-full bg-lav-100 px-3 py-1">125,000</span>
                <span className="rounded-full bg-lav-100 px-3 py-1">Bank transfer</span>
              </div>
              <span className="mt-3 inline-block rounded-full bg-black px-4 py-2 text-xs font-bold text-white">Confirm and save</span>
            </div>
          </Card>

          {/* Quick sales */}
          <Card className={`${glass} lg:col-span-3`} delay={120}>
            <CoinStack className="absolute right-6 top-6 h-24 w-24" />
            <h3 className="font-display text-xl font-semibold text-navy">Quick sales and receipts</h3>
            <p className="mt-2 max-w-xs leading-relaxed text-navy/70">
              Tap products, take cash, transfer or card, and print a receipt. Stock updates itself.
            </p>
            <div className="mt-5 max-w-[15rem] rounded-2xl bg-white p-4 text-xs shadow-md ring-1 ring-lav-100">
              <p className="text-center text-[11px] font-bold text-navy">Receipt # 24</p>
              {[["Plantain chips x2", "2,200"], ["Zobo drink x1", "800"]].map(([a, b]) => (
                <div key={a} className="mt-2 flex justify-between text-navy/80"><span>{a}</span><span>{b}</span></div>
              ))}
              <div className="mt-2 flex justify-between border-t border-dashed border-lav-100 pt-2 text-sm font-bold text-navy"><span>Total</span><span>3,000</span></div>
              <p className="mt-1 text-[11px] font-bold text-mint">Paid in full</p>
            </div>
          </Card>

          {/* Stock */}
          <Card className={`${glass} lg:col-span-3`} delay={200}>
            <h3 className="font-display text-xl font-semibold text-navy">Stock you can trust</h3>
            <p className="mt-2 max-w-sm leading-relaxed text-navy/70">
              Every purchase, sale and loss is recorded, so counts always add up. Low-stock items are flagged.
            </p>
            <div className="mt-6 flex h-28 items-end gap-3" aria-hidden="true">
              {[["Chips", 88], ["Zobo", 52], ["Candles", 16], ["Soap", 70], ["Tea", 40]].map(([n, h]) => (
                <div key={n as string} className="flex flex-1 flex-col items-center gap-1">
                  {Number(h) < 20 && <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">Low</span>}
                  <div className={`w-full rounded-t-xl ${Number(h) < 20 ? "bg-amber/60" : "bg-gradient-to-t from-orbit-500 to-orbit-400/70"}`} style={{ height: `${h}%` }} />
                  <span className="text-[10px] font-semibold text-navy/60">{n}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Debts */}
          <Card className={`${glass} lg:col-span-2`} delay={120}>
            <h3 className="font-display text-xl font-semibold text-navy">Customer debts</h3>
            <p className="mt-2 leading-relaxed text-navy/70">Part payments become debts automatically. Payments clear the oldest sale first.</p>
            <ul className="mt-5 space-y-3">
              {debtors.map((d) => (
                <li key={d.n} className="rounded-2xl bg-white/80 p-3 ring-1 ring-lav-100">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orbit-500 text-[11px] font-bold text-white">{d.i}</span>
                    <span className="flex-1 truncate text-sm font-bold text-navy">{d.n}</span>
                    <span className="text-sm font-bold text-amber">{d.owed}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-lav-100"><div className="h-1.5 rounded-full bg-gradient-to-r from-orbit-400 to-orbit-600" style={{ width: `${d.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Real costs */}
          <Card className={`${glass} lg:col-span-2`} delay={200}>
            <h3 className="font-display text-xl font-semibold text-navy">Real costs, real profit</h3>
            <p className="mt-2 leading-relaxed text-navy/70">Each purchase keeps its own price, so you can see when a supplier raises theirs.</p>
            <AreaChart values={[18000, 19000, 19500, 19200, 20400, 21000]} className="mt-4 h-28 w-full" />
            <div className="mt-2 flex gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-amber/15 px-2.5 py-1 text-amber">+5.6% in Feb</span>
              <span className="rounded-full bg-lav-100 px-2.5 py-1 text-orbit-600">Cost per carton</span>
            </div>
          </Card>

          {/* Summaries */}
          <Card className={`${glass} lg:col-span-2`} delay={280}>
            <h3 className="font-display text-xl font-semibold text-navy">Daily summaries</h3>
            <p className="mt-2 leading-relaxed text-navy/70">Short on time? Record a whole day in one go, kept apart from individual sales.</p>
            <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-navy/60" aria-hidden="true">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className={`grid h-7 place-items-center rounded-lg ${i === 9 ? "bg-orbit-500 text-white" : i % 3 === 0 ? "bg-orbit-400/25 text-navy" : "bg-white/80 text-navy/70"}`}>{i + 8}</span>
              ))}
            </div>
          </Card>
        </div>
        <p className="mt-4 text-xs text-navy/50">Previews use sample data.</p>
      </div>
    </section>
  );
}
