"use client";

import { motion } from "framer-motion";
import Reveal from "./Reveal";

const PROPS = [
  {
    k: "Position",
    v: "(x, y, z)",
    d: "Where the blob sits in 3D space.",
    c: "#a78bfa",
  },
  {
    k: "Covariance",
    v: "scale + rotation",
    d: "Its size, stretch and orientation — a squashed ellipsoid.",
    c: "#22d3ee",
  },
  {
    k: "Color (SH)",
    v: "spherical harmonics",
    d: "Color that changes with viewing angle — gives real sheen, glints, reflections.",
    c: "#f472b6",
  },
  {
    k: "Opacity",
    v: "α",
    d: "How solid vs see-through it is. Thousands overlap to build a surface.",
    c: "#facc15",
  },
];

// a few illustrative gaussian ellipses
const BLOBS = [
  { cx: 90, cy: 80, rx: 34, ry: 22, rot: -18, c: "#8b5cf6" },
  { cx: 150, cy: 120, rx: 40, ry: 26, rot: 24, c: "#22d3ee" },
  { cx: 210, cy: 90, rx: 30, ry: 20, rot: -8, c: "#f472b6" },
  { cx: 120, cy: 170, rx: 36, ry: 24, rot: 12, c: "#34d399" },
  { cx: 200, cy: 165, rx: 28, ry: 18, rot: -30, c: "#facc15" },
  { cx: 160, cy: 80, rx: 24, ry: 16, rot: 40, c: "#60a5fa" },
];

export default function Gaussians() {
  return (
    <section id="gaussians" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <Reveal>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-violet/80">
          The primitive
        </p>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          What <span className="grad-text">is</span> a Gaussian Splat?
        </h2>
      </Reveal>

      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        {/* animated SVG */}
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl p-6">
            <svg viewBox="0 0 300 240" className="w-full">
              <defs>
                {BLOBS.map((b, i) => (
                  <radialGradient id={`g${i}`} key={i}>
                    <stop offset="0%" stopColor={b.c} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={b.c} stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>
              {BLOBS.map((b, i) => (
                <motion.ellipse
                  key={i}
                  cx={b.cx}
                  cy={b.cy}
                  rx={b.rx}
                  ry={b.ry}
                  fill={`url(#g${i})`}
                  transform={`rotate(${b.rot} ${b.cx} ${b.cy})`}
                  initial={{ opacity: 0, scale: 0.4 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.12 }}
                  style={{ transformOrigin: `${b.cx}px ${b.cy}px` }}
                >
                  <animate
                    attributeName="rx"
                    values={`${b.rx};${b.rx + 4};${b.rx}`}
                    dur={`${4 + i}s`}
                    repeatCount="indefinite"
                  />
                </motion.ellipse>
              ))}
              {/* callout on one gaussian */}
              <circle cx={150} cy={120} r={2.5} fill="#fff" />
              <line
                x1={150}
                y1={120}
                x2={250}
                y2={48}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <text x={252} y={46} fill="#fff" fontSize="9" opacity="0.8">
                one Gaussian
              </text>
            </svg>
            <p className="mt-2 text-center text-[12px] text-white/45">
              Millions of these fuzzy ellipsoids overlap to form a photoreal,
              renderable scene.
            </p>
          </div>
        </Reveal>

        {/* explanation */}
        <div className="space-y-5">
          <Reveal>
            <p className="text-[15px] leading-relaxed text-white/65">
              It is <b className="text-white/90">not a mesh</b>. A scene is{" "}
              <b className="text-white/90">millions of tiny, fuzzy, colored 3D
              ellipsoids</b> — &ldquo;Gaussians.&rdquo; A differentiable renderer
              &ldquo;splats&rdquo; them onto your screen, and gradient descent
              nudges every one until the render matches your photos. The result
              renders in <b className="text-white/90">real time, in a browser</b>,
              and captures soft, complex things — fabric, foliage, glass — that
              meshes choke on.
            </p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROPS.map((p, i) => (
              <Reveal key={p.k} delay={i * 0.06}>
                <div className="glass h-full rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: p.c }}
                    />
                    <span className="text-[13px] font-semibold text-white">
                      {p.k}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-white/40">
                      {p.v}
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">
                    {p.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
