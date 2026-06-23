"use client";

import Reveal from "./Reveal";
import Term from "./Term";

const STATS: { v: string; l: string; s: string; tip?: string }[] = [
  { v: "4K", l: "max input", s: "3840×2160, HDR or SDR" },
  { v: "1–4M", l: "Gaussians", s: "web-streamable budget" },
  {
    v: "~30",
    l: "target PSNR",
    s: "on a clean capture",
    tip: "PSNR = how closely the 3D render matches the original photos (in dB). Higher is sharper: 25–30 looks good, 30+ is near-photoreal.",
  },
  { v: "60 fps", l: "in-browser", s: "no plugin, no app" },
];

const ROWS: [string, string, string, string, boolean][] = [
  ["≤ 1 min", "600", "~25 min", "single object · small room", false],
  ["1 – 5 min", "600 – 1000", "~30 – 50 min", "room · theatre · gallery", true],
  ["5 – 10 min", "1000 – 1500", "~1 – 1.5 hr", "large venue · multi-room", false],
  ["10 min +", "streaming / LOD", "scales linearly", "full attraction tour", false],
];

export default function Specs() {
  return (
    <section id="specs" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan/10 blur-[120px]" />
      <Reveal>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-violet/80">
          Capability
        </p>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          How much video can it eat?
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">
          We sub-sample any clip down to a target frame count, so video{" "}
          <i>length</i> is not the hard limit — <b className="text-white/80">coverage
          and frame count</b> are. GPU memory scales with the number of Gaussians,
          not the minutes of footage. Sweet spot:{" "}
          <span className="text-white/85">2–5 minutes of steady 4K.</span>
        </p>
      </Reveal>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.l} delay={i * 0.06}>
            <div className="glass h-full rounded-2xl p-5">
              <div className="grad-text text-4xl font-semibold tracking-tight">
                {s.v}
              </div>
              <div className="mt-1 text-[13px] font-medium text-white/80">
                {s.tip ? <Term def={s.tip}>{s.l}</Term> : s.l}
              </div>
              <div className="mt-0.5 text-[12px] text-white/45">{s.s}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead>
              <tr className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/45">
                <th className="px-5 py-3 font-semibold">Video length (4K)</th>
                <th className="px-5 py-3 font-semibold">Frames used</th>
                <th className="px-5 py-3 font-semibold">Pose + train · 1×A100</th>
                <th className="px-5 py-3 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr
                  key={r[0]}
                  className={`border-t border-white/6 ${
                    r[4] ? "bg-violet/[0.06]" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-white/90">
                    {r[0]}
                    {r[4] && (
                      <span className="ml-2 rounded bg-violet/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet">
                        sweet spot
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-white/60">{r[1]}</td>
                  <td className="px-5 py-3.5 text-white/60">{r[2]}</td>
                  <td className="px-5 py-3.5 text-white/60">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
      <Reveal>
        <p className="mt-4 text-[12px] text-white/40">
          Timings on a single NVIDIA A100. Longer / larger spaces use more frames
          (proportionally more compute) or hierarchical streaming reconstruction.
        </p>
      </Reveal>
    </section>
  );
}
