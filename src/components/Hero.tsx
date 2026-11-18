import Link from "next/link";
import { ProductPreview } from "./ProductPreview";

export function Hero() {
  return (
    <section className="border-b border-line bg-gradient-to-b from-leaf-50 to-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:py-24">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-forest-900 sm:text-5xl lg:text-[3.4rem]">
            Run your business. Let AI handle the busywork.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate">
            Keep your customers, sales and tasks in one workspace. Operly&apos;s assistant works from your real
            records to draft replies, write quotations and chase follow-ups.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-forest-800 px-6 py-3 text-base font-semibold text-white hover:bg-forest-700"
            >
              Start free
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-line bg-white px-6 py-3 text-base font-semibold text-forest-800 hover:border-forest-600"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-slate">Free plan available. No card needed.</p>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}
