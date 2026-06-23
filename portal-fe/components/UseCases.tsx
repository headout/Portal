"use client";

import Reveal from "./Reveal";

const CASES = [
  {
    tag: "Seat selection",
    title: "See the view from your seat",
    video: "/media/seat.mp4",
    poster: "/media/seat.jpg",
    body: "One splat per venue. Render the stage from every seat's exact position and eye-height, so a buyer previews the view from row J before they pay for it.",
    fit: "Constrained POV · seat→camera coordinates baked in",
    accent: "from-violet/30",
  },
  {
    tag: "Objects & monuments",
    title: "Inspect it from every angle",
    video: "/media/object.mp4",
    poster: "/media/object.jpg",
    body: "An object-centric splat of a sculpture, statue, exhibit or landmark detail. Customers orbit, zoom and study it — the artifact, not a flat photo gallery.",
    fit: "Orbit viewer · turntable presets",
    accent: "from-cyan/30",
  },
  {
    tag: "Walkthrough tours",
    title: "Step inside before you go",
    video: "/media/walk.mp4",
    poster: "/media/walk.jpg",
    body: "Street-view-style POV movement along a guided route through a palace, ruin or gallery. The whole attraction, explorable on a bounded path.",
    fit: "Routed navigation · head-movement POV",
    accent: "from-pink-500/30",
  },
];

export default function UseCases() {
  return (
    <section id="usecases" className="relative mx-auto max-w-6xl px-5 py-24 sm:py-28">
      <Reveal>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-cyan/80">
          At Headout
        </p>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Three experiences, <span className="grad-text">one engine</span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">
          Every Headout listing is a place or a thing someone is deciding to book.
          Portal lets them <b className="text-white/80">experience it first</b> —
          from the same simple phone capture.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {CASES.map((c, i) => (
          <Reveal key={c.tag} delay={i * 0.08}>
            <div className="glass h-full rounded-3xl p-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                {c.tag}
              </span>
              <h3 className="mt-4 text-[18px] font-semibold tracking-tight text-white">
                {c.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">
                {c.body}
              </p>
              <p className="mt-4 flex items-center gap-2 text-[11.5px] text-cyan/80">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                {c.fit}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* fit banner */}
      <Reveal>
        <div className="glass glow-violet mt-8 rounded-3xl p-6 sm:p-8">
          <div className="grid items-center gap-6 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-white">
                One phone video → a splat for any of them.
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/60">
                Portal is the connective tissue across Headout&apos;s catalog:
                no rig, no LiDAR, no specialist. The same engine outputs a
                seat-POV theatre, an orbitable monument, or a walkthrough tour —
                each web-native and tuned for{" "}
                <b className="text-white/85">constrained, decision-driving viewing</b>,
                not a raw scan dump.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                ["1", "video in"],
                ["3", "experience types"],
                ["0", "rigs / LiDAR"],
                ["∞", "seats / angles"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="grad-text text-2xl font-semibold">{v}</div>
                  <div className="text-[11px] text-white/50">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
