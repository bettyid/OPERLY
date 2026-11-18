import Link from "next/link";
import { Logo } from "./Logo";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full bg-midnight-900 pl-5 pr-2 shadow-[0_10px_30px_-12px_rgba(27,27,48,0.6)]">
        <Link href="/" aria-label="Operly home">
          <Logo light />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-lilac-200 hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-lilac-200 hover:text-white">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-iris-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-iris-500"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
