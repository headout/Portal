"use client";

import { useState } from "react";
import Reveal from "./Reveal";

function Shot({
  src,
  label,
  win,
}: {
  src: string;
  label: string;
  win?: boolean;
}) {
  const [err, setErr] = useState(false);
  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-2xl border bg-black ${
        win ? "border-cyan/40 glow-violet" : "border-white/10"
      }`}
    >
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          onError={() => setErr(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="dotgrid flex h-full w-full flex-col items-center justify-center gap-1 text-center">
          <span className="text-[12px] text-white/45">
            drop{" "}
            <code className="rounded bg-white/10 px-1 text-white/70">
              {src.replace("/media/", "")}
            </code>{" "}
            in
          </span>
          <span className="font-mono text-[10px] text-white/30">
            portal-fe/public/media/
          </span>
        </div>
      )}
      <span
        className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
          win ? "bg-cyan/20 text-cyan" : "bg-black/55 text-white/70"
        }`}
      >
        {label}
      </span>
      {win && (
        <span className="absolute right-3 top-3 rounded-full bg-cyan px-2.5 py-1 text-[11px] font-bold text-ink">
          winner
        </span>
      )}
    </div>
  );
}

const WINS = [
  ["Sharper, legible text", "Signage and screens stay readable — KIRI smears them."],
  ["Truer color", "The bilateral grid corrects exposure drift; KIRI's whites blow out."],
  ["More overall clarity", "Cleaner geometry from neural matching + loop-robust global SfM."],
];

const TABLE: [string, string, string][] = [
  ["Input resolution used", "1080p (API cap)", "Full 4K"],
  ["Color / exposure", "Per-frame drift", "Bilateral-grid corrected"],
  ["Built for", "General object scans", "Constrained-viewing experiences"],
  ["Seat→camera coords", "—", "Baked in"],
  ["Delivery", "App / their cloud", "Web-native, your CDN"],
];

export default function KiriCompare() {
  return (
    <section id="kiri" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-28">
      <Reveal>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-violet/80">
          Benchmark
        </p>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Same video. <span className="grad-text">Portal won.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">
          We ran the leading commercial app —{" "}
          <b className="text-white/80">KIRI Engine</b> — on the exact same footage.
          Side by side, Portal came out sharper, truer and cleaner.
        </p>
      </Reveal>

      <Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Shot src="/media/kiri.jpg" label="KIRI Engine" />
          <Shot src="/media/portal.jpg" label="Portal (ours)" win />
        </div>
      </Reveal>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {WINS.map(([t, d], i) => (
          <Reveal key={t} delay={i * 0.06}>
            <div className="glass h-full rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan/20 text-[11px] text-cyan">
                  ✓
                </span>
                {t}
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{d}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* honest caveat */}
      <Reveal>
        <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4">
          <p className="text-[12.5px] leading-relaxed text-yellow-100/70">
            <b className="text-yellow-200/90">Kept honest:</b> KIRI&apos;s API
            caps input at 1080p, while we ran full 4K — so part of this edge is
            resolution. We still hold the advantage on color and product fit, and
            we re-confirm head-to-head at matched resolution before claiming a
            general win.
          </p>
        </div>
      </Reveal>

      {/* product-fit table */}
      <Reveal>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <thead>
              <tr className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/45">
                <th className="px-5 py-3 font-semibold"></th>
                <th className="px-5 py-3 font-semibold">KIRI Engine</th>
                <th className="px-5 py-3 font-semibold text-cyan/80">Portal</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map((r) => (
                <tr key={r[0]} className="border-t border-white/6">
                  <td className="px-5 py-3 font-medium text-white/70">{r[0]}</td>
                  <td className="px-5 py-3 text-white/45">{r[1]}</td>
                  <td className="px-5 py-3 font-medium text-white/85">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}
