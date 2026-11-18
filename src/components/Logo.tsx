export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill={light ? "#e6f2e9" : "#0f3d2e"} />
        <circle cx="14" cy="14" r="6" fill="none" stroke={light ? "#0f3d2e" : "#e6f2e9"} strokeWidth="2.5" />
        <circle cx="18.5" cy="9.5" r="2.2" fill={light ? "#1e6b52" : "#8fd1a8"} />
      </svg>
      <span
        className={`font-display text-xl font-semibold tracking-tight ${
          light ? "text-white" : "text-forest-900"
        }`}
      >
        Operly
      </span>
    </span>
  );
}
