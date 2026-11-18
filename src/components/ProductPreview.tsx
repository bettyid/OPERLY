const rows = [
  { name: "Ada Okafor", deal: "Boutique order", note: "Quotation sent 9 days ago", value: "$1,240" },
  { name: "Marcus Lee", deal: "Brand shoot", note: "No reply in 6 days", value: "$3,800" },
  { name: "Sofia Reyes", deal: "Monthly retainer", note: "Proposal viewed, no answer", value: "$950" },
];

const nav = ["Dashboard", "Customers", "Sales", "Tasks", "Assistant"];

export function ProductPreview() {
  return (
    <figure className="w-full">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_-20px_rgba(15,61,46,0.35)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-leaf-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-leaf-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-leaf-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-leaf-200" />
          <span className="ml-3 text-xs font-medium text-slate">Operly assistant</span>
        </div>
        <div className="flex">
          <aside className="hidden w-36 shrink-0 border-r border-line bg-leaf-50 p-3 sm:block">
            <ul className="space-y-1 text-sm">
              {nav.map((item) => (
                <li
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 ${
                    item === "Assistant" ? "bg-forest-800 font-medium text-white" : "text-slate"
                  }`}
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-leaf-100 px-4 py-2.5 text-sm text-forest-900">
              Which customers need a follow-up this week?
            </div>
            <div className="max-w-full space-y-3">
              <p className="text-sm text-ink">Three open deals have gone quiet. Here they are, oldest first.</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {rows.map((r, i) => (
                  <li
                    key={r.name}
                    className="settle flex items-center justify-between gap-3 px-3.5 py-3"
                    style={{ animationDelay: `${0.5 + i * 0.25}s` }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {r.name} <span className="font-normal text-slate">{r.deal}</span>
                      </p>
                      <p className="truncate text-xs text-signal">{r.note}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-forest-800">{r.value}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white">
                  Draft 3 follow-ups
                </span>
                <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-forest-800">
                  Create tasks
                </span>
              </div>
              <p className="text-xs text-slate">Drafts are saved for your review. Nothing is sent without your approval.</p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-slate">Preview with sample data.</figcaption>
    </figure>
  );
}
