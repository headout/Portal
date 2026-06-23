import Reveal from "./Reveal";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[700px] max-w-full -translate-x-1/2 rounded-full bg-violet/15 blur-[120px]" />
      <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:py-28">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Capture once.{" "}
            <span className="grad-text">Experience anywhere.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-white/55">
            Portal is a video → splat service built for Headout — turning a phone
            walk-through into a photoreal world your customers can step into before
            they book.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#top"
              className="rounded-xl bg-white px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:bg-white/90"
            >
              Back to top
            </a>
            <a
              href="#pipeline"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-[14px] font-medium text-white/80 transition hover:bg-white/5"
            >
              Revisit the pipeline
            </a>
          </div>
        </Reveal>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 text-[12px] text-white/35 sm:flex-row">
          <span>
            <b className="font-semibold text-white/60">Portal</b> · video → 3D
            gaussian splat
          </span>
          <span>Built at the Headout hackathon · 2026</span>
        </div>
      </div>
    </footer>
  );
}
