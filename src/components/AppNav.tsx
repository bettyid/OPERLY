"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppNav({ items, variant }: { items: NavItem[]; variant: "side" | "top" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="App" className={variant === "side" ? "space-y-1" : "flex gap-2 overflow-x-auto px-4 pb-3"}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-bold ${
              active ? "bg-iris-600 text-white" : "text-lilac-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon d={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
