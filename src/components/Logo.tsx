export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="10" fill="#5b4fe9" />
        <circle cx="15" cy="15" r="6.2" fill="none" stroke="#ffffff" strokeWidth="2.6" />
        <circle cx="20" cy="10" r="2.4" fill="#cfcaf6" />
      </svg>
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        Operly
      </span>
    </span>
  );
}
