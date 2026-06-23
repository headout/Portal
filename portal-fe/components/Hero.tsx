"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import SplatViewer from "./SplatViewer";

const BADGES = ["4K input", "~30 min on 1 GPU", "Runs in the browser", "Beats KIRI"];

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // video -> splat morph, driven by scroll through the tall section
  // video hands off to the point cloud early; the viewer drives cloud->splat itself
  const inOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);
  const inScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.86]);
  const inBlur = useTransform(scrollYProgress, [0, 0.16], ["blur(0px)", "blur(12px)"]);
  const splatOpacity = useTransform(scrollYProgress, [0.04, 0.18], [0, 1]);
  const dissolve = useTransform(scrollYProgress, [0.02, 0.1, 0.2], [0, 0.7, 0]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section id="top" ref={ref} className="relative h-[230vh]">
      {/* parallax background */}
      <motion.div
        style={{ y: bgY }}
        className="dotgrid pointer-events-none absolute inset-0 opacity-60"
      />
      <div className="pointer-events-none absolute left-1/2 top-[12%] h-[520px] w-[520px] max-w-full -translate-x-1/2 rounded-full bg-violet/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-[12%] top-[40%] h-[380px] w-[380px] max-w-full rounded-full bg-cyan/15 blur-[120px]" />

      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-5 md:justify-start md:pt-[200px] md:pb-8">
        {/* headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 mb-7 max-w-3xl text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-white/70">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-cyan" />
            Photoreal 3D from a single phone video
          </div>
          <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            One video in.
            <br />
            A <span className="grad-text animate-shimmer">3D world</span> out.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-base">
            <b className="font-semibold text-white/80">Portal</b> turns a casual
            walk-through video of any space into an explorable, web-ready{" "}
            <span className="text-white/80">3D Gaussian Splat</span> — no rig, no
            LiDAR, no app. Scroll to watch it happen.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {BADGES.map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] text-white/55"
              >
                {b}
              </span>
            ))}
          </div>
        </motion.div>

        {/* morph stage — prominent player: 16:9 on mobile, a fixed ~44vh on desktop */}
        <div className="relative z-10 w-full max-w-4xl aspect-video md:aspect-auto md:min-h-[300px] md:flex-1">
          <div className="absolute inset-0 -m-px rounded-3xl bg-gradient-to-br from-violet/50 via-white/5 to-cyan/50 p-px">
            <div className="relative h-full w-full overflow-hidden rounded-3xl bg-black">
              {/* input video */}
              <motion.video
                style={{ opacity: inOpacity, scale: inScale, filter: inBlur }}
                className="absolute inset-0 h-full w-full object-cover"
                src="/media/input.mp4"
                poster="/media/input.jpg"
                autoPlay
                muted
                loop
                playsInline
              />
              {/* live 3D stage: point cloud -> gaussian splat (streams from R2) */}
              <motion.div
                style={{ opacity: splatOpacity }}
                className="absolute inset-0 h-full w-full"
              >
                <SplatViewer />
              </motion.div>
              {/* dissolve scrim during morph */}
              <motion.div
                style={{ opacity: dissolve }}
                className="dotgrid pointer-events-none absolute inset-0 mix-blend-screen"
              />
              <motion.div
                style={{ opacity: dissolve }}
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet/30 via-transparent to-cyan/30"
              />

              {/* input-video tag (fades as it hands off to the live 3D) */}
              <motion.div
                style={{ opacity: inOpacity }}
                className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium backdrop-blur"
              >
                📹 input video
              </motion.div>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <motion.div
          style={{ opacity: cueOpacity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-white/35"
        >
          scroll ↓
        </motion.div>
      </div>
    </section>
  );
}
