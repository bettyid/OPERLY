const points = [
  { title: "It reads", body: "The assistant sees only your own business records, never another business's." },
  { title: "It prepares", body: "Replies, quotations and tasks are created as drafts you can edit." },
  { title: "You approve", body: "Messages to customers, payments and plan changes never happen without your confirmation." },
];

export function Control() {
  return (
    <section className="bg-forest-900 text-white">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          AI that works inside your permissions
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-leaf-200">
          Your customers&apos; details are sensitive. Operly treats the assistant like a careful team member, not an
          autopilot.
        </p>
        <dl className="mt-10 grid gap-8 sm:grid-cols-3">
          {points.map((p) => (
            <div key={p.title} className="border-l-2 border-leaf-200/40 pl-5">
              <dt className="font-display text-lg font-semibold">{p.title}</dt>
              <dd className="mt-2 leading-relaxed text-leaf-200">{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
