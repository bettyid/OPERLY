"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  as?: "div" | "li" | "section";
  className?: string;
  delay?: number;
};

export function Reveal({ children, as = "div", className = "", delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const Tag = as as "div";
  const [state, setState] = useState<"visible" | "hidden" | "shown">("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const motion =
    state === "hidden"
      ? "opacity-0 translate-y-8"
      : state === "shown"
        ? "opacity-100 translate-y-0 transition duration-700 ease-out"
        : "";

  return (
    <Tag
      ref={ref}
      className={`${className} ${motion}`}
      style={state === "shown" && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
