"use client";

import type { ReactNode } from "react";

/** Inline term with a hover/focus tooltip definition (for jargon like PSNR). */
export default function Term({
  children,
  def,
}: {
  children: ReactNode;
  def: string;
}) {
  return (
    <span
      tabIndex={0}
      className="group relative cursor-help underline decoration-dotted decoration-white/40 underline-offset-2 outline-none"
    >
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-60 -translate-x-1/2 rounded-xl border border-white/12 bg-panel p-3 text-[11.5px] font-normal leading-relaxed text-white/75 opacity-0 shadow-2xl transition duration-150 group-hover:opacity-100 group-focus:opacity-100">
        {def}
      </span>
    </span>
  );
}
