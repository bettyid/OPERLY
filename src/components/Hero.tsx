import Link from "next/link";
import { Header } from "./Header";
import { HeroWidgets } from "./HeroWidgets";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-to-b from-[#d6cdf4] via-[#a99be2] to-[#7a66c8] px-3 pb-10 pt-5 sm:px-6 sm:pb-14 sm:pt-8">
      <div className="relative mx-auto max-w-6xl">
        <div className="absolute inset-x-8 -top-3 h-8 rounded-t-[2rem] bg-white/35" aria-hidden="true" />
        <div className="absolute inset-x-4 -top-1.5 h-8 rounded-t-[2rem] bg-white/60" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_80px_-30px_rgba(60,40,140,0.55)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_92%,rgba(140,140,245,0.30),transparent_70%),radial-gradient(40%_30%_at_20%_100%,rgba(190,170,250,0.25),transparent_70%)]" aria-hidden="true" />
          <div className="relative">
            <Header />
            <div className="px-5 pb-8 pt-8 text-center sm:pt-14">
              <h1 className="mx-auto max-w-3xl font-display text-[2.4rem] font-medium leading-[1.08] tracking-tight text-navy sm:text-6xl">
                Run your business. Let AI handle the{" "}
                <span className="font-title font-black text-orbit-500">busywork.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-navy/70">
                Record sales, stock, purchases and customer debts in one place, by tapping, typing or speaking. Operly keeps
                the numbers straight so you always know where your business stands.
              </p>
              <Link href="/register" className="mt-8 inline-block rounded-full bg-orbit-500 px-10 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_-12px_rgba(123,91,224,0.8)] hover:bg-orbit-600">
                Get started
              </Link>
              <p className="mt-3 text-sm text-navy/60">Free plan available. No card needed.</p>
            </div>
            <div className="max-h-[30rem] overflow-hidden sm:max-h-[26rem] lg:max-h-[23rem]">
              <HeroWidgets />
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-white/80">Preview with sample data.</p>
      </div>
    </section>
  );
}
