const features = [
  {
    title: "Customer Hub",
    body: "One profile per customer with contact details, notes, interaction history and the next follow-up date. Search, filter and import from a spreadsheet.",
  },
  {
    title: "Sales Hub",
    body: "Move every opportunity through a pipeline from new enquiry to won or lost, with deal values and a record of what happened at each stage.",
  },
  {
    title: "Operly AI",
    body: "Ask in plain language. The assistant reads your actual customers, deals and tasks, so answers come from your records and not from guesses.",
  },
  {
    title: "Tasks and reminders",
    body: "Turn any follow-up into a task linked to the customer. See what is due today, what is overdue and what the assistant has queued for you.",
  },
  {
    title: "Quotations and replies",
    body: "Generate a quotation or a customer reply from the deal itself, using your business name and contact details. Review, edit, then download as PDF.",
  },
  {
    title: "Business insights",
    body: "See revenue, enquiries, conversion and lost deals in readable charts, with a plain-English summary of what changed since last month.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            Everything a small business touches in a day
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-slate">
            Stop moving between spreadsheets, chat threads and calendar reminders. Each part of Operly works from the
            same records.
          </p>
        </div>
        <dl className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="border-t border-line py-6">
              <dt className="font-display text-lg font-semibold text-forest-800">{f.title}</dt>
              <dd className="mt-2 leading-relaxed text-slate">{f.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
