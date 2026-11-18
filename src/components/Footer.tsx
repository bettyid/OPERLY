import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-auto bg-midnight-900 text-lilac-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed">Your business. Understood. A worldwide AI workspace for customers, sales and tasks.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#how-it-works" className="hover:text-white">How it works</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
          <Link href="/login" className="hover:text-white">Log in</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs">© 2026 Operly. All rights reserved.</div>
    </footer>
  );
}
