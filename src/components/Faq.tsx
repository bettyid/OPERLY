import { Reveal } from "./Reveal";

const faqs = [
  { q: "Who is Operly for?", a: "Small businesses that talk to customers and track sales every week: online sellers, fashion and beauty brands, agencies, freelancers, consultants and service providers." },
  { q: "Will the AI message my customers on its own?", a: "No. It prepares drafts and tasks. Anything sent to a customer, any payment and any plan change needs your confirmation." },
  { q: "Does the assistant make up customers or numbers?", a: "It is built to answer from the records in your workspace. If something is not recorded, it tells you instead of guessing." },
  { q: "Is my customer data private?", a: "Each business's data is kept separate, and the assistant follows the same access rules as the rest of the app." },
  { q: "Is there a free plan?", a: "Yes. The Free plan includes one workspace, basic sales tracking, tasks and limited AI usage." },
  { q: "Can I bring in my existing customers?", a: "Yes. You can import customer records from a spreadsheet and export them again at any time." },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">Questions, answered</h2>
        </Reveal>
        <Reveal delay={120} className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-3xl bg-white px-6 py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-medium">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lilac-100 text-iris-600 transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
