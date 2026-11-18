import Link from "next/link";
import { Logo } from "./Logo";

export function AuthPlaceholder({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-leaf-50 px-5 text-center">
      <Link href="/" aria-label="Operly home">
        <Logo />
      </Link>
      <h1 className="mt-10 font-display text-3xl font-semibold text-forest-900">{title}</h1>
      <p className="mt-3 max-w-sm text-slate">Accounts open in the next build step. Check back soon.</p>
      <Link href="/" className="mt-8 rounded-lg bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700">
        Back to home
      </Link>
    </main>
  );
}
