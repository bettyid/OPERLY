import { AreaChart, Coin, Glow, Sparkle } from "./art";
import { Reveal } from "./Reveal";

const points = [
  { title: "It drafts", body: "A spoken or typed note becomes a draft record. It never saves on its own." },
  { title: "You check", body: "Every product, price and customer is matched by the app and shown for you to correct." },
  { title: "Then it saves", body: "Only your confirmation records the sale, purchase or expense. Staff can't see costs or void sales." },
];

export function Control() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#ddd6f7] to-[#cfc6f3] px-3 py-10 sm:px-6">
      <div className="relative mx-auto max-w-6xl">
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2c1f78] via-[#4a38b4] to-[#7458d8] p-8 text-white shadow-[0_40px_80px_-40px_rgba(44,31,120,0.9)] sm:p-12">
          <Glow className="-right-10 -top-10 h-64 w-64 bg-white/20" />
          <Glow className="-bottom-16 left-10 h-56 w-56 bg-[#7fa6ff]/30" />
          <Coin size={70} className="float absolute right-8 top-8 hidden opacity-95 md:block" />
          <Sparkle className="absolute bottom-10 right-1/3 hidden md:block" />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">You stay in control of your records</h2>
              <p className="mt-4 max-w-md leading-relaxed text-white/80">
                Your numbers decide how you run your shop, so Operly treats them carefully. The AI helps with typing. It never decides what is true.
              </p>
              <dl className="mt-8 space-y-5">
                {points.map((p) => (
                  <div key={p.title} className="flex gap-4">
                    <dt className="w-24 shrink-0 font-display font-semibold text-[#c9b8ff]">{p.title}</dt>
                    <dd className="leading-relaxed text-white/85">{p.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-[2rem] bg-white/95 p-6 text-navy shadow-2xl">
              <p className="text-xs font-bold text-orbit-500">Check before saving</p>
              <p className="mt-2 font-display text-xl font-semibold">Sale to Ada Okafor</p>
              <p className="mt-1 text-sm text-navy/70">5 cartons of plantain chips. Paid 50,000 by bank transfer.</p>
              <AreaChart values={[3, 5, 4, 7, 6, 9, 8]} className="mt-3 h-16 w-full" dots={false} />
              <p className="rounded-xl bg-amber/10 px-3 py-2 text-xs font-semibold text-amber">The remaining 75,000 will be added to Ada&apos;s debt.</p>
              <div className="mt-4 flex gap-2">
                <span className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white">Confirm and save</span>
                <span className="rounded-full bg-lav-100 px-5 py-2.5 text-sm font-bold text-orbit-600">Edit</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
