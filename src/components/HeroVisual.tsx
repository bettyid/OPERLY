const deals = [
  { initials: "AO", name: "Ada Okafor", due: "In 2 days", status: "Unsent", value: "$1,240", active: false },
  { initials: "ML", name: "Marcus Lee", due: "In 5 days", status: "Unsent", value: "$3,800", active: true },
  { initials: "SR", name: "Sofia Reyes", due: "In 9 days", status: "Viewed", value: "$950", active: false },
  { initials: "TN", name: "Tunde Nwosu", due: "In 12 days", status: "Viewed", value: "$2,150", active: false },
];

export function HeroVisual() {
  return (
    <div className="relative pb-2 lg:pb-14">
      <div className="settle absolute -top-4 right-4 z-10 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_14px_30px_-14px_rgba(91,79,233,0.45)] sm:flex lg:-top-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber/15 text-amber" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M9 5v4.5l3 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <p className="text-xs font-semibold text-muted">Needs follow-up</p>
          <p className="font-display text-lg font-semibold leading-tight text-ink">3 deals</p>
        </div>
      </div>

      <div className="rounded-[2rem] bg-midnight-900 p-5 text-white shadow-[0_30px_60px_-30px_rgba(27,27,48,0.7)] lg:w-[82%]">
        <p className="mb-4 font-display text-sm font-medium text-lilac-300">Open deals</p>
        <ul className="space-y-2">
          {deals.map((d) => (
            <li
              key={d.name}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                d.active ? "bg-iris-600" : "bg-midnight-800/70"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  d.active ? "bg-white text-iris-700" : "bg-lilac-200 text-midnight-900"
                }`}
              >
                {d.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{d.name}</p>
                <p className={`text-xs ${d.active ? "text-lilac-100" : "text-lilac-300"}`}>{d.due}</p>
              </div>
              <span
                className={`hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline ${
                  d.active ? "bg-white text-iris-700" : "bg-white/10 text-lilac-200"
                }`}
              >
                {d.status}
              </span>
              <span className="font-display text-sm font-medium">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-4 rounded-[2rem] bg-iris-600 p-5 text-white shadow-[0_30px_60px_-24px_rgba(91,79,233,0.7)] lg:absolute lg:-bottom-0 lg:right-0 lg:mt-0 lg:w-[66%]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-lilac-200">Customer</p>
            <p className="font-display text-lg font-semibold">Marcus Lee</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Brand shoot</span>
        </div>
        <div className="mt-4 rounded-2xl bg-white/12 p-4 backdrop-blur">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold text-lilac-100">
            <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
            Operly drafted a follow-up
          </p>
          <p className="settle text-sm leading-relaxed" style={{ animationDelay: "0.6s" }}>
            Hi Marcus, just checking in on the brand shoot quote I sent last week.
          </p>
          <p className="settle text-sm leading-relaxed" style={{ animationDelay: "1.4s" }}>
            Happy to adjust the scope if that helps. <span className="caret ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-white" aria-hidden="true" />
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-lilac-100">Nothing is sent until you approve.</p>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-iris-700">Review draft</span>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted lg:absolute lg:-bottom-9 lg:left-1 lg:mt-0">Preview with sample data.</p>
    </div>
  );
}
