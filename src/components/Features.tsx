import { Reveal } from "./Reveal";

const customers = [
  { n: "Ada Okafor", t: "Boutique", c: "bg-mint/15 text-mint" },
  { n: "Marcus Lee", t: "Agency client", c: "bg-amber/15 text-amber" },
  { n: "Sofia Reyes", t: "Retainer", c: "bg-iris-600/10 text-iris-600" },
];
const stages = ["New enquiry", "Contacted", "Interested", "Negotiation", "Won"];
const tasks = [
  { t: "Send Ada her quotation", d: true },
  { t: "Call Marcus about scope", d: false },
  { t: "Review Sofia's proposal", d: false },
];

function Card({ className = "", delay = 0, children }: { className?: string; delay?: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay} className={`rounded-[2rem] p-7 ${className}`}>
      {children}
    </Reveal>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <Reveal>
        <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          Everything a small business touches in a day
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
          Every part of Operly works from the same records, so nothing is typed twice.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 lg:grid-cols-6">
        <Card className="bg-midnight-900 text-white lg:col-span-3 lg:row-span-2">
          <h3 className="font-display text-2xl font-semibold">Operly AI</h3>
          <p className="mt-2 max-w-sm leading-relaxed text-lilac-300">
            Ask in plain language. It answers from your customers, deals and tasks, and tells you when something is
            not on record.
          </p>
          <div className="mt-8 space-y-3">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-iris-600 px-4 py-2.5 text-sm font-semibold">
              Summarise today&apos;s activity
            </div>
            <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-midnight-800 px-4 py-3 text-sm leading-relaxed text-lilac-100">
              You have 2 new enquiries, 1 quotation waiting to be sent and 3 follow-ups due. Want me to draft the
              follow-ups?
            </div>
            <div className="flex gap-2 pt-1">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Draft follow-ups</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Show enquiries</span>
            </div>
          </div>
        </Card>

        <Card delay={120} className="bg-white lg:col-span-3">
          <h3 className="font-display text-xl font-semibold">Customer Hub</h3>
          <p className="mt-2 leading-relaxed text-muted">
            One profile per customer with notes, history and the next follow-up date.
          </p>
          <ul className="mt-5 space-y-2">
            {customers.map((c) => (
              <li key={c.n} className="flex items-center justify-between rounded-2xl bg-lilac-50 px-4 py-2.5">
                <span className="text-sm font-bold">{c.n}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.c}`}>{c.t}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card delay={200} className="bg-white lg:col-span-3">
          <h3 className="font-display text-xl font-semibold">Sales Hub</h3>
          <p className="mt-2 leading-relaxed text-muted">Move each opportunity from first enquiry to won or lost.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {stages.map((s, i) => (
              <span
                key={s}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                  i === 2 ? "bg-iris-600 text-white" : "bg-lilac-100 text-iris-700"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </Card>

        <Card className="bg-white lg:col-span-2">
          <h3 className="font-display text-xl font-semibold">Tasks and reminders</h3>
          <ul className="mt-4 space-y-3">
            {tasks.map((t) => (
              <li key={t.t} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                    t.d ? "border-mint bg-mint text-white" : "border-lilac-300"
                  }`}
                  aria-hidden="true"
                >
                  {t.d && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5.2l2 2L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={t.d ? "text-muted line-through" : "font-semibold"}>{t.t}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card delay={120} className="bg-iris-600 text-white lg:col-span-2">
          <h3 className="font-display text-xl font-semibold">Quotations and replies</h3>
          <p className="mt-2 leading-relaxed text-lilac-100">
            Generate from the deal, use your business details, edit, then download as PDF.
          </p>
          <div className="mt-5 rounded-2xl bg-white/15 p-4">
            <div className="flex justify-between text-sm font-bold">
              <span>Quotation</span>
              <span>$3,800</span>
            </div>
            <div className="mt-3 h-2 w-4/5 rounded-full bg-white/30" />
            <div className="mt-2 h-2 w-3/5 rounded-full bg-white/30" />
          </div>
        </Card>

        <Card delay={240} className="bg-white lg:col-span-2">
          <h3 className="font-display text-xl font-semibold">Business insights</h3>
          <p className="mt-2 leading-relaxed text-muted">Revenue, conversion and lost deals, explained in plain English.</p>
          <svg viewBox="0 0 200 70" className="mt-5 w-full" aria-hidden="true">
            <path d="M0 58 L30 50 L60 54 L90 36 L120 40 L150 20 L200 8" fill="none" stroke="#5b4fe9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 58 L30 50 L60 54 L90 36 L120 40 L150 20 L200 8 L200 70 L0 70 Z" fill="#5b4fe9" opacity="0.1" />
          </svg>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted">Previews use sample data.</p>
    </section>
  );
}
