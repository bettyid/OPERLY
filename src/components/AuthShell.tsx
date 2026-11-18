import Link from "next/link";
import { Logo } from "./Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" aria-label="Operly home" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <aside className="hidden bg-midnight-900 p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-md">
          <p className="font-display text-3xl font-semibold leading-tight">
            Run your business. Let AI handle the busywork.
          </p>
          <ul className="mt-8 space-y-4 text-lilac-200">
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-iris-400" aria-hidden="true" />
              Customers, deals and tasks in one workspace
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-iris-400" aria-hidden="true" />
              An assistant that works from your real records
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-iris-400" aria-hidden="true" />
              Nothing goes out to a customer without your approval
            </li>
          </ul>
        </div>
      </aside>
    </main>
  );
}
