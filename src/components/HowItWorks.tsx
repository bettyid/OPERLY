const steps = [
  { title: "Add your customers", body: "Create profiles or import a spreadsheet. Set your business name and logo once." },
  { title: "Track each deal", body: "Place every opportunity in your pipeline and move it forward as the conversation does." },
  { title: "Ask Operly", body: "Request a summary, a reply, a quotation or follow-up tasks in plain language." },
  { title: "Review and approve", body: "Operly prepares the work. You read it, change it and decide what goes out." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
        From scattered notes to a working routine
      </h2>
      <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {steps.map((s, i) => (
          <li key={s.title} className="relative">
            {i < steps.length - 1 && (
              <span className="absolute left-14 top-6 hidden h-0.5 w-[calc(100%-2rem)] bg-lilac-300 lg:block" aria-hidden="true" />
            )}
            <span className="relative grid h-12 w-12 place-items-center rounded-full bg-iris-600 font-display text-lg font-semibold text-white">
              {i + 1}
            </span>
            <h3 className="mt-5 font-display text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
