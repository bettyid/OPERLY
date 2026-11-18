import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export const inputClass =
  "w-full rounded-2xl border border-edge bg-white px-4 py-3 text-base text-ink placeholder:text-muted/70 focus:border-iris-600 focus:outline-none focus:ring-2 focus:ring-iris-600/20";

export function Field({ label, id, ...props }: { label: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <input id={id} name={id} className={inputClass} {...props} />
    </div>
  );
}

export function SelectField({
  label,
  id,
  options,
  ...props
}: { label: string; id: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <select id={id} name={id} className={inputClass} {...props}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-full bg-iris-600 px-6 py-3.5 text-base font-bold text-white hover:bg-iris-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-amber/10 px-4 py-3 text-sm font-semibold text-amber">
      {message}
    </p>
  );
}
