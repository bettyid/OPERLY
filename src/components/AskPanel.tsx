const prompts = [
  "Which customers need a follow-up this week?",
  "Summarise today's business activity",
  "Show my sales performance this month",
  "Draft a reply to my latest enquiry",
];

export function AskPanel() {
  return (
    <aside aria-label="Ask Operly" className="flex flex-col rounded-[2rem] bg-white p-5 xl:sticky xl:top-6 xl:h-[calc(100vh-7.5rem)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          Ask Operly
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#5b4fe9" aria-hidden="true">
            <path d="M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7L12 2z" />
          </svg>
        </h2>
        <span className="rounded-full bg-lilac-100 px-3 py-1 text-xs font-bold text-iris-700">Connects next</span>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl bg-lilac-50 p-4">
        <p className="text-sm font-bold text-iris-700">Your assistant</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Operly will answer from your own customers, deals and tasks, and draft replies and quotations for you to
          approve. The assistant switches on in the next build step, once your customer and sales records exist.
        </p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-muted">You will be able to ask</p>
        <ul className="grid gap-2">
          {prompts.map((p) => (
            <li key={p} className="rounded-2xl bg-lilac-100 px-4 py-2.5 text-sm font-semibold text-iris-700">
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-edge px-4 py-2.5">
        <input
          disabled
          aria-label="Message Operly"
          placeholder="Assistant not connected yet"
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted/70 disabled:cursor-not-allowed"
        />
        <span className="grid h-8 w-8 place-items-center rounded-full bg-lilac-200 text-white" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#5b4fe9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </aside>
  );
}
