import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "For individuals exploring Operly",
    features: [
      "One business workspace",
      "Basic dashboard",
      "Limited customer records",
      "Basic sales tracking and tasks",
      "Limited AI usage",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "Priced at launch",
    note: "For owners and growing businesses",
    features: [
      "Higher AI usage",
      "Expanded customer management",
      "Advanced sales tracking",
      "AI quotations and document generation",
      "Business insights and automation",
    ],
    cta: "Start free",
    featured: true,
  },
  {
    name: "Business",
    price: "Priced at launch",
    note: "For teams",
    features: [
      "Multiple team members",
      "Shared workspace and roles",
      "Advanced AI and analytics",
      "Higher automation limits",
      "Priority support",
    ],
    cta: "Start free",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          Start free, upgrade when you need more
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-muted">
          Monthly and annual billing will be available. Paid plan prices are announced at launch.
        </p>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-[2rem] p-8 ${
                p.featured ? "bg-iris-600 text-white shadow-[0_30px_60px_-30px_rgba(91,79,233,0.8)]" : "bg-white"
              }`}
            >
              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <p className={`mt-1 text-sm ${p.featured ? "text-lilac-100" : "text-muted"}`}>{p.note}</p>
              <p className="mt-6 font-display text-3xl font-semibold">{p.price}</p>
              <ul className={`mt-6 flex-1 space-y-3 text-sm ${p.featured ? "text-lilac-100" : "text-ink"}`}>
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 rounded-full px-5 py-3 text-center text-sm font-bold ${
                  p.featured
                    ? "bg-white text-iris-700 hover:bg-lilac-100"
                    : "bg-lilac-100 text-iris-700 hover:bg-lilac-200"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
