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
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="Operly home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate hover:text-forest-800">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-2 text-sm font-medium text-forest-800 hover:text-forest-950">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
