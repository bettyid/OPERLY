import { Reveal } from "./Reveal";

const points = [
  { title: "It reads", body: "Only your own business records. Never another business's." },
  { title: "It prepares", body: "Replies, quotations and tasks arrive as drafts you can edit." },
  { title: "You approve", body: "Messages to customers, payments and plan changes never happen without you." },
];

export function Control() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <Reveal className="grid gap-10 rounded-[2.5rem] bg-midnight-900 p-8 text-white sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            AI that works inside your permissions
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-lilac-300">
            Your customers&apos; details are sensitive. Operly treats the assistant like a careful team member, not an
            autopilot.
          </p>
          <dl className="mt-8 space-y-5">
            {points.map((p) => (
              <div key={p.title} className="flex gap-4">
                <dt className="w-24 shrink-0 font-display font-semibold text-iris-400">{p.title}</dt>
                <dd className="leading-relaxed text-lilac-100">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-[2rem] bg-iris-600 p-6">
          <p className="text-xs font-bold text-lilac-100">Confirmation needed</p>
          <p className="mt-2 font-display text-xl font-semibold">Send follow-up to Marcus Lee?</p>
          <p className="mt-2 text-sm leading-relaxed text-lilac-100">
            Email, 2 sentences. Mentions the brand shoot quotation from last week.
          </p>
          <div className="mt-6 flex gap-2">
            <span className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-iris-700">Approve and send</span>
            <span className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold">Edit</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
