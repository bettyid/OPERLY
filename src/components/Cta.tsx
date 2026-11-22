import Link from "next/link";
import { AreaChart, Coin, Glow, Sparkle } from "./art";
import { Reveal } from "./Reveal";

export function Cta() {
  return (
    <section className="bg-gradient-to-b from-[#eae5fb] to-[#cfc6f3] px-3 pb-16 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#6a50d8] via-[#7b5be0] to-[#9a86ee] px-8 py-14 text-center text-white shadow-[0_40px_80px_-40px_rgba(103,71,207,0.9)] sm:px-12">
          <Glow className="-left-10 -top-10 h-56 w-56 bg-white/25" />
          <Glow className="-bottom-16 right-10 h-56 w-56 bg-[#7fa6ff]/40" />
          <Coin size={64} className="float absolute left-[8%] top-10 hidden md:block" />
          <Coin size={40} className="float-slow absolute bottom-10 right-[10%] hidden md:block" />
          <Sparkle className="absolute right-[18%] top-12 hidden md:block" />
          <AreaChart values={[4, 6, 5, 8, 7, 11, 10, 14]} dots={false} className="absolute inset-x-0 bottom-0 h-24 w-full opacity-40" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">Give your busywork to Operly</h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-white/85">Set up your shop in minutes. The Free plan needs no card.</p>
            <Link href="/register" className="mt-8 inline-block rounded-full bg-white px-9 py-3.5 text-base font-bold text-orbit-600 shadow-lg hover:bg-lav-100">
              Get started
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
