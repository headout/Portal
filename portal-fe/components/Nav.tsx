"use client";

import { useEffect, useState } from "react";

const LINKS = [
  ["What is a splat", "#gaussians"],
  ["Pipeline", "#pipeline"],
  ["Specs", "#specs"],
  ["Use cases", "#usecases"],
  ["vs KIRI", "#kiri"],
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2.5" : "py-4"
      }`}
    >
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-5 ${
          scrolled ? "glass glow-violet" : "border border-transparent"
        }`}
      >
        <a href="#top" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portal-logo.png" alt="Portal" className="h-6 w-auto sm:h-7" />
          <span className="hidden text-[11px] font-medium text-white/35 sm:inline">
            video → splat
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-1.5 text-[13px] text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        <a
          href="#usecases"
          className="rounded-lg bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold text-ink transition hover:bg-white"
        >
          See it live
        </a>
      </nav>
    </header>
  );
}
