"use client";

import { motion } from "framer-motion";
import Reveal from "./Reveal";
import Term from "./Term";

type Step = {
  n: string;
  title: string;
  tool: string;
  io: [string, string];
  what: string;
  why: string;
  lever: string;
  icon: JSX.Element;
};

const I = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STEPS: Step[] = [
  {
    n: "01",
    title: "Capture",
    tool: "4K phone video",
    io: ["the space", "one 4K clip"],
    what: "Walk the space once, slowly and steadily, holding a single continuous 4K video.",
    why: "Resolution + sharpness + parallax set the quality ceiling before any algorithm runs. We translate (not pan) so every surface is seen from several positions, keep ~70–80% overlap, and close the loop.",
    lever: "Shoot 4K not 1080p · kill motion blur (slow, steady, fast shutter) · even lighting · avoid mirrors/glass · cover each surface from 3+ angles.",
    icon: I("M4 7h3l2-2h6l2 2h3v12H4z M12 17a4 4 0 100-8 4 4 0 000 8z"),
  },
  {
    n: "02",
    title: "Frame extraction",
    tool: "uniform sampling",
    io: ["video", "~600 frames"],
    what: "Sample ~600 evenly-spaced frames, scaled to ~1920 px on the long side.",
    why: "Uniform spacing preserves frame overlap (motion-gating thinned it and fragmented our reconstruction). Shooting 4K still pays off — a 4K frame scaled to 1920 is sharper and less noisy than native 1080p. We work at 1920 because SfM + training cost scales with pixels, and the Gaussian budget (not input pixels) usually limits detail first.",
    lever: "600 frames for a room, 1000+ for a venue · keep ~70% overlap · raise the working resolution for finer detail — costs more Gaussians + VRAM, diminishing returns.",
    icon: I("M3 5h18v14H3z M8 5v14 M16 5v14"),
  },
  {
    n: "03",
    title: "Neural matching",
    tool: "hloc · ALIKED + LightGlue",
    io: ["frames", "feature matches"],
    what: "For each frame, retrieve its 32 most-similar frames, detect learned ALIKED keypoints, and match them with LightGlue.",
    why: "Learned features beat hand-crafted SIFT across changing light, viewpoint and low texture — the exact conditions that break classic SfM. Retrieval avoids O(n²) matching, so it scales to hundreds of frames.",
    lever: "More retrieval pairs → more loop closures around tiers/aisles · swap detector (DISK / SuperPoint) for dark interiors.",
    icon: I("M5 12l4 4 M5 12l4-4 M19 12l-4 4 M19 12l-4-4 M9 12h6"),
  },
  {
    n: "04",
    title: "Structure-from-Motion",
    tool: "GLOMAP (global SfM)",
    io: ["matches", "poses + point cloud"],
    what: "Solve every camera pose and a sparse 3D point cloud at once, then gravity-align the scene.",
    why: "A global solve is loop-robust and ~10× faster than incremental COLMAP, which fragments when you walk back past where you started. Alignment fixes 'up' so seat cameras sit at correct eye-height.",
    lever: "Tuned inlier thresholds · orientation align · GPU feature extraction · accurate poses are the single biggest PSNR driver.",
    icon: I("M12 3l8 5v8l-8 5-8-5V8z M12 3v18 M4 8l8 5 8-5"),
  },
  {
    n: "05",
    title: "Splat training",
    tool: "gsplat MCMC + bilateral grid",
    io: ["poses + images", "millions of Gaussians"],
    what: "Optimize millions of Gaussians to match the photos, with per-image exposure correction.",
    why: "MCMC keeps a fixed Gaussian budget, makes far fewer floaters, and tolerates imperfect init. The bilateral grid corrects phone auto-exposure drift between frames → truer color (our single biggest visible win vs plain training).",
    lever: "Full SH3 color · --antialiased (Mip-Splatting, ≈ +1 PSNR) · opacity / scale regularization to kill floaters · more Gaussians + more steps.",
    icon: I("M12 2a10 10 0 100 20 10 10 0 000-20z M7 13a3 3 0 106 0 M14 9a2 2 0 104 0"),
  },
  {
    n: "06",
    title: "Export & serve",
    tool: "SH3 .ply → .spz / .sog + LOD",
    io: ["Gaussians", "web splat"],
    what: "Export a standard SH3 .ply, compress to a streaming format, and serve to a browser viewer.",
    why: "Compression keeps files web-friendly with no visible quality loss; level-of-detail scales the same pipeline from a single object up to a full venue.",
    lever: "Aggressive compression for mobile · bake per-seat camera presets · stream LOD tiles for large spaces.",
    icon: I("M12 3v12 M8 11l4 4 4-4 M5 21h14"),
  },
];

const FLOW = ["VIDEO", "600 FRAMES", "MATCHES", "POSES + POINTS", "GAUSSIANS", "WEB SPLAT"];

export default function Pipeline() {
  return (
    <section id="pipeline" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-28">
      <Reveal>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-cyan/80">
          The pipeline
        </p>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Six steps from <span className="grad-text">video to splat</span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">
          Every stage is swappable. Below each step: what it does, why we picked
          that tool, and the lever that pushes{" "}
          <Term def="PSNR (peak signal-to-noise ratio) measures how closely the rendered 3D scene matches the original photos, in decibels. Higher is better: under 20 is rough, 25–30 looks good, 30+ is near-photoreal.">
            <span className="text-white/80">PSNR</span>
          </Term>{" "}
          up — a quality score for{" "}
          <b className="text-white/75">how closely the 3D render matches the real
          photos</b> (higher = sharper; 30+ ≈ near-photoreal).
        </p>
      </Reveal>

      {/* data-flow ribbon */}
      <Reveal>
        <div className="mt-10 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            {FLOW.map((f, i) => (
              <div key={f} className="flex items-center gap-2">
                <span
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-wide ${
                    i === 0
                      ? "bg-violet/20 text-violet"
                      : i === FLOW.length - 1
                        ? "bg-cyan/20 text-cyan"
                        : "bg-white/5 text-white/65"
                  }`}
                >
                  {f}
                </span>
                {i < FLOW.length - 1 && (
                  <svg viewBox="0 0 24 12" className="h-3 w-6 text-white/30">
                    <path d="M0 6h20 M16 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* timeline */}
      <div className="relative mt-12 pl-0 sm:pl-2">
        <div className="flowline absolute left-[27px] top-2 hidden h-[calc(100%-2rem)] w-px sm:block" />
        <div className="space-y-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.04}>
              <div className="flex gap-4 sm:gap-6">
                {/* node */}
                <div className="relative hidden shrink-0 sm:block">
                  <div className="glow-violet flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-panel text-white/80">
                    {s.icon}
                  </div>
                </div>
                {/* card */}
                <div className="glass flex-1 rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-mono text-[12px] text-violet">{s.n}</span>
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      {s.title}
                    </h3>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-cyan/90">
                      {s.tool}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/40">
                      <span className="text-white/60">{s.io[0]}</span>
                      <span>→</span>
                      <span className="text-white/60">{s.io[1]}</span>
                    </span>
                  </div>

                  <p className="mt-3 text-[14px] leading-relaxed text-white/75">
                    {s.what}
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-white/[0.015] p-3.5">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                        <span className="text-violet">◆</span> Why this choice
                      </p>
                      <p className="text-[12.5px] leading-relaxed text-white/60">
                        {s.why}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan/15 bg-cyan/[0.04] p-3.5">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan/70">
                        <motion.span
                          animate={{ y: [0, -2, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          ↑
                        </motion.span>{" "}
                        Push PSNR higher
                      </p>
                      <p className="text-[12.5px] leading-relaxed text-white/70">
                        {s.lever}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
