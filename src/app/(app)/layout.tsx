import Link from "next/link";
import { AppNav, type NavItem } from "@/components/AppNav";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { requireWorkspace } from "@/lib/session";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" },
  {
    href: "/customers",
    label: "Customers",
    icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await requireWorkspace();
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
