import Link from "next/link";
import { Logo } from "./Logo";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** Navigation that sits inside the hero frame. */
export function Header() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-7">
      <Link href="/" aria-label="Operly home">
        <Logo />
      </Link>
      <nav aria-label="Main" className="hidden items-center gap-1 rounded-full bg-lav-100 p-1 md:flex">
        <a href="#top" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-orbit-500 shadow-sm">Home</a>
        {links.map((l) => (
          <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-sm font-semibold text-navy/80 hover:text-orbit-500">
            {l.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-1">
        <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-navy hover:text-orbit-500">Log in</Link>
        <Link href="/register" className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-navy">Start free</Link>
      </div>
    </header>
  );
}
