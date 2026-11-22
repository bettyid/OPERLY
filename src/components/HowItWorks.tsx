import { Coin, Glow } from "./art";
import { Reveal } from "./Reveal";

const steps = [
  { title: "Set up your shop", body: "Add your products, the ways you sell them (pack, carton) and your prices. Pick your country and currency once." },
  { title: "Record as you go", body: "Tap a sale, type a note or speak it. Purchases and expenses go in the same way, and stock follows automatically." },
  { title: "Know who owes you", body: "Part payments and pay-later sales become customer debts. Record payments as they arrive." },
  { title: "See where you stand", body: "Daily summaries and records you can trust, with deeper reports on the way." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-6 overflow-hidden bg-gradient-to-b from-[#eef0ff] via-[#e6e2fb] to-[#ddd6f7]">
      <Glow className="left-1/3 top-0 h-72 w-72 bg-orbit-400/25" />
      <div className="relative mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-medium tracking-tight text-navy sm:text-5xl">
            From notebook to a shop that runs itself
          </h2>
        </Reveal>

        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-orbit-400/50 lg:block" aria-hidden="true" />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 120} className="rounded-[1.75rem] bg-white/65 p-6 ring-1 ring-white shadow-[0_20px_40px_-28px_rgba(103,71,207,0.5)] backdrop-blur">
                <div className="relative -mt-12 mb-3 inline-block">
                  <Coin size={52} />
                  <span className="absolute inset-0 grid place-items-center pb-1.5 font-display text-lg font-bold text-orbit-600">{i + 1}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-navy">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-navy/70">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
