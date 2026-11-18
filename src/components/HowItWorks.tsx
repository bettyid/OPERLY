const steps = [
  { title: "Add your customers", body: "Create profiles or import a spreadsheet. Set up your business name and logo once." },
  { title: "Track each deal", body: "Place every opportunity in your pipeline and move it forward as the conversation does." },
  { title: "Ask Operly", body: "Request a summary, a reply, a quotation or a set of follow-up tasks in plain language." },
  { title: "Review and approve", body: "Operly prepares the work. You read it, change it and decide what goes out." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-b border-line bg-leaf-50">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
          From scattered notes to a working routine
        </h2>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-2 border-forest-800 pt-5">
              <span className="font-display text-sm font-semibold text-forest-600">Step {i + 1}</span>
              <h3 className="mt-1 font-display text-lg font-semibold text-forest-900">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-slate">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
