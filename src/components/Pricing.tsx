import Link from "next/link";
import { Reveal } from "./Reveal";

const plans = [
  {
    name: "Free",
    blurb: "Individuals and small shops getting started",
    price: "$0",
    note: "No card needed",
    features: [
      "One business workspace",
      "Products, stock and quick sales with receipts",
      "Customer debts and payment records",
      "Daily summaries and expenses",
      "A small monthly AI allowance",
    ],
    featured: false,
  },
  {
    name: "Pro",
    blurb: "Owners and growing businesses",
    price: "Priced at launch",
    note: "Monthly or annual billing",
    features: [
      "Everything in Free",
      "Higher monthly AI allowance",
      "Voice and typed capture",
      "More customers, products and history",
      "Business analytics as it rolls out",
    ],
    featured: true,
  },
  {
    name: "Business",
    blurb: "Teams and multi-person shops",
    price: "Priced at launch",
    note: "Monthly or annual billing",
    features: [
      "Everything in Pro",
      "Team members and roles",
      "Highest AI allowance",
      "Priority support",
      "Integrations as they are verified",
    ],
    featured: false,
  },
];

function Check() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-mint" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-6 bg-gradient-to-br from-[#e8d6f9] via-[#c7c3f7] to-[#a8c9f3] px-3 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-white/35 p-5 ring-1 ring-white/70 backdrop-blur sm:p-10">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-navy sm:text-5xl">Plans and Pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-navy/70 sm:text-base">
            Start free and upgrade when your business needs more. Paid plan prices are announced at launch.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-center">
          {plans.map((p, i) => (
            <Reveal
              key={p.name}
              delay={i * 120}
              className={`flex flex-col rounded-[1.5rem] bg-white/70 p-6 ring-1 ring-white backdrop-blur ${
                p.featured ? "shadow-[0_30px_60px_-30px_rgba(103,71,207,0.55)] lg:py-9" : "shadow-[0_16px_40px_-24px_rgba(60,40,140,0.35)]"
              }`}
            >
              <h3 className="font-display text-lg font-semibold text-navy">{p.name}</h3>
              <p className="mt-1 text-sm text-navy/60">{p.blurb}</p>
              <p className="mt-5 font-display text-3xl font-medium text-navy">{p.price}</p>
              <p className="mt-1 text-xs text-navy/60">{p.note}</p>
              <Link
                href="/register"
                className={`mt-5 rounded-full px-6 py-3 text-center text-sm font-bold text-white ${
                  p.featured ? "bg-orbit-500 hover:bg-orbit-600" : "bg-black hover:bg-navy"
                }`}
              >
                Get started
              </Link>
              <p className="mt-6 text-xs font-bold text-navy">What&apos;s included:</p>
              <ul className="mt-3 space-y-3 text-sm text-navy/80">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5"><Check />{f}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-navy/60">Every plan starts on the Free plan. You can upgrade or cancel at any time once paid plans open.</p>
      </div>
    </section>
  );
}
