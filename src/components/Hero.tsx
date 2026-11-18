import Link from "next/link";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:pt-20">
      <div>
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Run your business. Let AI handle the busywork.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
          Customers, sales and tasks live in one workspace. Operly&apos;s assistant works from your real records to
          draft replies, write quotations and chase follow-ups.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className="rounded-full bg-iris-600 px-7 py-3.5 text-base font-bold text-white shadow-[0_12px_24px_-10px_rgba(91,79,233,0.7)] hover:bg-iris-500"
          >
            Start free
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full bg-white px-7 py-3.5 text-base font-bold text-ink hover:bg-lilac-100"
          >
            See how it works
          </a>
        </div>
        <p className="mt-5 text-sm text-muted">Free plan available. No card needed.</p>
      </div>
      <HeroVisual />
    </section>
  );
}
