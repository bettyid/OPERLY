import Link from "next/link";
import { AppNav, type NavItem } from "@/components/AppNav";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { can } from "@/lib/services/permissions";
import { requireCtx } from "@/lib/session";

const ALL_NAV: (NavItem & { needs?: Parameters<typeof can>[1] })[] = [
  { href: "/dashboard", label: "Dashboard", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" },
  { href: "/pos", label: "Quick sale", icon: "M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z" },
  { href: "/sales", label: "Sales", icon: "M6 2h12v20l-3-2-3 2-3-2-3 2V2zm3 6h6M9 12h6" },
  { href: "/products", label: "Products", icon: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" },
  { href: "/purchases", label: "Purchases", icon: "M3 7h11v9H3V7zm11 3h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z", needs: "purchases.create" },
  { href: "/suppliers", label: "Suppliers", icon: "M4 21V5l8-3 8 3v16M9 21v-5h6v5M9 8h.01M15 8h.01M9 12h.01M15 12h.01", needs: "purchases.create" },
  {
    href: "/customers",
    label: "Customers",
    icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  },
  { href: "/debts", label: "Debts", icon: "M3 7h18v12H3V7zm0 0l3-4h12l3 4M16 13h2" },
  { href: "/summaries", label: "Daily summary", icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z", needs: "expenses.manage" },
  { href: "/expenses", label: "Expenses", icon: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", needs: "expenses.manage" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { ctx, user, business } = await requireCtx();
  const nav: NavItem[] = ALL_NAV.filter((n) => !n.needs || can(ctx.role, n.needs)).map(({ href, label, icon }) => ({ href, label, icon }));
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr] lg:gap-0">
      <aside className="hidden p-4 lg:block">
        <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-[2rem] bg-midnight-900 p-5">
          <Link href="/dashboard" aria-label="Operly dashboard" className="px-2 py-1">
            <Logo light />
          </Link>
          <div className="mt-8 flex-1">
            <AppNav items={nav} variant="side" />
          </div>
          <div className="rounded-2xl bg-midnight-800 p-4">
            <p className="truncate text-sm font-bold text-white">{business.name}</p>
            <p className="mt-0.5 text-xs capitalize text-lilac-300">{business.plan} plan</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="px-4 pt-4 lg:px-8 lg:pt-6">
          <div className="flex items-center justify-between rounded-full bg-white px-3 py-2 pl-5">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{business.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full bg-iris-600 text-xs font-bold text-white"
                title={user.name}
              >
                {initials}
              </span>
              <SignOutButton />
            </div>
          </div>
          <div className="mt-3 rounded-full bg-midnight-900 py-3 lg:hidden">
            <AppNav items={nav} variant="top" />
          </div>
        </header>
        <main className="px-4 pb-16 pt-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
