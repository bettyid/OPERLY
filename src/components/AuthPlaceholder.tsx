import Link from "next/link";
import { Logo } from "./Logo";

export function AuthPlaceholder({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Link href="/" aria-label="Operly home">
        <Logo />
      </Link>
      <h1 className="mt-10 font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-sm text-muted">Accounts open in the next build step. Check back soon.</p>
      <Link href="/" className="mt-8 rounded-full bg-iris-600 px-6 py-3 text-sm font-bold text-white hover:bg-iris-500">
        Back to home
      </Link>
    </main>
  );
}
