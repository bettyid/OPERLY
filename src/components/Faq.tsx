const faqs = [
  {
    q: "Who is Operly for?",
    a: "Small businesses that talk to customers and track sales every week: online sellers, fashion and beauty brands, agencies, freelancers, consultants and service providers.",
  },
  {
    q: "Will the AI message my customers on its own?",
    a: "No. It prepares drafts and tasks. Anything sent to a customer, any payment and any plan change needs your confirmation.",
  },
  {
    q: "Does the assistant make up customers or numbers?",
    a: "It is built to answer from the records in your workspace. If something is not recorded, it tells you instead of guessing.",
  },
  {
    q: "Is my customer data private?",
    a: "Each business's data is kept separate, and the assistant follows the same access rules as the rest of the app.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes one workspace, basic sales tracking, tasks and limited AI usage.",
  },
  {
    q: "Can I bring in my existing customers?",
    a: "Yes. You can import customer records from a spreadsheet and export them again at any time.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-b border-line bg-leaf-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
          Questions, answered
        </h2>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-semibold text-forest-900">
                {f.q}
                <span className="text-forest-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-slate">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
