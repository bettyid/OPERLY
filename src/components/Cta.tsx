import Link from "next/link";
import { Reveal } from "./Reveal";

export function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <Reveal className="rounded-[2.5rem] bg-iris-600 px-8 py-14 text-center text-white sm:px-12">
        <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Give your busywork to Operly
        </h2>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-lilac-100">
          Set up your workspace in minutes. The Free plan needs no card.
        </p>
        <Link href="/register" className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 text-base font-bold text-iris-700 hover:bg-lilac-100">
          Start free
        </Link>
      </Reveal>
    </section>
  );
}
