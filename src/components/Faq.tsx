import { Glow } from "./art";
import { Reveal } from "./Reveal";

const faqs = [
  { q: "Who is Operly for?", a: "Shops, wholesalers, online sellers and service businesses that sell to customers every week and want clear records of sales, stock, costs and who owes them." },
  { q: "Will the AI save things on its own?", a: "No. A spoken or typed note becomes a draft. Nothing is recorded until you check it and confirm." },
  { q: "What happens when a customer pays only part?", a: "Record what they paid. The rest is added to that customer's debt automatically, and you can record later payments from the Debts page." },
  { q: "Which currencies and countries work?", a: "You choose your country, currency and time zone when you set up. Naira, pounds, dollars, euros, cedis, shillings, rand and rupees are supported, and numbers follow your country's style." },
  { q: "Is my data private?", a: "Each business's records are kept separate. Staff accounts can sell, but can't see costs or profit, give discounts or void sales." },
  { q: "Does it work without internet?", a: "Not yet. Operly needs a connection today. Offline sales that sync later are planned." },
  { q: "Is there a free plan?", a: "Yes. The Free plan includes one workspace, products and stock, quick sales with receipts, customer debts and a small monthly AI allowance." },
];

export function Faq() {
  return (
    <section id="faq" className="relative scroll-mt-6 overflow-hidden bg-gradient-to-b from-[#a8c9f3] via-[#d7dcf8] to-[#eae5fb]">
      <Glow className="-left-16 top-24 h-64 w-64 bg-orbit-400/25" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <Reveal>
          <h2 className="font-display text-3xl font-medium tracking-tight text-navy sm:text-5xl">Questions, answered</h2>
        </Reveal>
        <Reveal delay={120} className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-3xl bg-white/70 px-6 py-5 ring-1 ring-white backdrop-blur">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-medium text-navy">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lav-100 text-orbit-500 transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-navy/70">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
