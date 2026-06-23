"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-driven 3D stage for the hero. One fetch powers two renderers:
 *
 *   page top ─ video (Hero) ─► scroll down
 *   ├─ COLOR POINT CLOUD  (point size grows while orbiting clockwise)
 *   └─ at full size ─► GAUSSIAN SPLAT view
 *   scroll up reverses everything → splat → shrinking points → video at top.
 *
 * One download: fetch the .ksplat/.ply once (with % loader) → decode it for the
 * colorful point cloud, and feed the SAME bytes to the splat renderer via a blob URL.
 * Camera framing + point size auto-derive from the scene's own scale.
 */

const R2_SPLAT_URL =
  process.env.NEXT_PUBLIC_SPLAT_URL ||
  "https://pub-03f293c33a1b468087c7cd43d5a45c35.r2.dev/models/splat_vs.ksplat";

const SCENE_UP: [number, number, number] = [0, -1, 0]; // splat "up" (flip to [0,1,0] if inverted)
const ROT_TURNS = 0.75; // turns the point cloud makes before it becomes a splat
const DIRECTION = -1; // flip if clockwise/anticlockwise feels reversed
const POINT_MIN_FRAC = 0.0009; // point size = fraction of scene radius (start)
const POINT_MAX_FRAC = 0.009; // ...grown to, then swap to splat. ~10x growth.

// scroll-progress breakpoints (0 = page top, 1 = end of hero scroll)
const P_CLOUD_IN = 0.05; // points start appearing
const P_GROW_0 = 0.12; // size + rotation start
const P_GROW_1 = 0.42; // size reaches max (0.01) AND rotation completes here
const HOLD_PX = 120; // then HOLD at max size (frozen) for ~this many px of scroll, then -> splat
const TRANSITION_MS = 500; // splat dolly-to-centre / back duration
const CENTER_DOLLY = 0.9; // gentle move-in — kept high so we don't end up INSIDE the splat (washed out)

// The "perfect" settled splat view. Find it live at ?debug (drag to orbit, scroll to zoom,
// press C to copy), then paste the two arrays here to lock that exact framing.
// null = fall back to the CENTER_DOLLY framing.
const SETTLED_POS: [number, number, number] | null = [1.483, -0.195, -0.008];
const SETTLED_TARGET: [number, number, number] | null = [0.177, 0.284, 0.017];

const SH_C0 = 0.28209479177387814;

async function fetchWithProgress(url: string, onPct: (n: number) => void) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let recv = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    recv += value.length;
    if (total) onPct(Math.min(99, Math.round((recv / total) * 100)));
  }
  onPct(100);
  const out = new Uint8Array(recv);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out.buffer;
}

// Parse a binary 3DGS .ply -> {positions, colors}
function parsePly(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
  const marker = "end_header\n";
  const mi = head.indexOf(marker);
  if (mi < 0) throw new Error("PLY header not found");
  const dataOffset = mi + marker.length;
  let count = 0;
  const props: string[] = [];
  for (const raw of head.slice(0, mi).split("\n")) {
    const t = raw.trim();
    if (t.startsWith("element vertex")) count = parseInt(t.split(/\s+/)[2], 10);
    else if (t.startsWith("property")) props.push(t.split(/\s+/).pop() as string);
  }
  const stride = props.length * 4;
  const at = (n: string) => props.indexOf(n);
  const [ix, iy, iz, ir, ig, ib] = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2"].map(at);
  const dv = new DataView(buf, dataOffset);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  for (let i = 0; i < count; i++) {
    const b = i * stride;
    positions[i * 3] = dv.getFloat32(b + ix * 4, true);
    positions[i * 3 + 1] = dv.getFloat32(b + iy * 4, true);
    positions[i * 3 + 2] = dv.getFloat32(b + iz * 4, true);
    colors[i * 3] = cl(0.5 + SH_C0 * dv.getFloat32(b + ir * 4, true));
    colors[i * 3 + 1] = cl(0.5 + SH_C0 * dv.getFloat32(b + ig * 4, true));
    colors[i * 3 + 2] = cl(0.5 + SH_C0 * dv.getFloat32(b + ib * 4, true));
  }
  return { positions, colors, count };
}

// Decode a .ksplat via mkkellogg's SplatBuffer -> {positions, colors}
function decodeKsplat(buf: ArrayBuffer, GS: any, THREE: any) {
  const sb = new GS.SplatBuffer(buf);
  const count = sb.getSplatCount();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Vector3();
  const col = new THREE.Vector4();
  for (let i = 0; i < count; i++) {
    sb.getSplatCenter(i, c);
    positions[i * 3] = c.x;
    positions[i * 3 + 1] = c.y;
    positions[i * 3 + 2] = c.z;
    sb.getSplatColor(i, col);
    colors[i * 3] = col.x / 255;
    colors[i * 3 + 1] = col.y / 255;
    colors[i * 3 + 2] = col.z / 255;
  }
  return { positions, colors, count };
}

// centroid + robust (85th-percentile) radius so the camera auto-frames any scene scale
function framing(positions: Float32Array, count: number) {
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < count; i++) {
    sx += positions[i * 3];
    sy += positions[i * 3 + 1];
    sz += positions[i * 3 + 2];
  }
  const center: [number, number, number] = [sx / count, sy / count, sz / count];
  const step = Math.max(1, Math.floor(count / 20000));
  const d: number[] = [];
  for (let i = 0; i < count; i += step) {
    const dx = positions[i * 3] - center[0];
    const dy = positions[i * 3 + 1] - center[1];
    const dz = positions[i * 3 + 2] - center[2];
    d.push(Math.hypot(dx, dy, dz));
  }
  d.sort((a, b) => a - b);
  const radius = d[Math.floor(d.length * 0.85)] || 3;
  return { center, radius };
}

export default function SplatViewer({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"cloud" | "splat">("cloud");

  useEffect(() => {
    if (!hostRef.current) return;
    if (R2_SPLAT_URL.includes("REPLACE_WITH_YOUR_R2_URL")) {
      setError("Set NEXT_PUBLIC_SPLAT_URL.");
      return;
    }

    let viewer: any;
    let points: any;
    let raf = 0;
    let disposed = false;
    let keyHandler: ((e: KeyboardEvent) => void) | null = null;
    const debug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
    const scroll = { target: 0, cur: 0 };
    const span = () => Math.max(1, window.innerHeight * 1.3);
    const onScroll = () => {
      scroll.target = Math.min(1, Math.max(0, window.scrollY / span()));
    };

    (async () => {
      const GS: any = await import("@mkkellogg/gaussian-splats-3d");
      const THREE: any = await import("three");
      if (disposed || !hostRef.current) return;

      const buf = await fetchWithProgress(R2_SPLAT_URL, setProgress);
      if (disposed) return;

      const isKsplat = R2_SPLAT_URL.toLowerCase().includes(".ksplat");
      const { positions, colors, count } = isKsplat
        ? decodeKsplat(buf, GS, THREE)
        : parsePly(buf);
      const { center, radius } = framing(positions, count);
      const blobUrl = URL.createObjectURL(new Blob([buf]));

      const ORBIT_RADIUS = radius * 2.4;
      const ORBIT_HEIGHT = radius * 0.18;
      const FLY_IN_FROM = radius * 6;
      const PT_MIN = radius * POINT_MIN_FRAC;
      const PT_MAX = radius * POINT_MAX_FRAC;

      viewer = new GS.Viewer({
        rootElement: hostRef.current,
        sharedMemoryForWorkers: false,
        selfDrivenMode: debug, // debug -> mkkellogg's own loop + orbit controls (free-look)
        useBuiltInControls: debug,
        dynamicScene: false,
        cameraUp: SCENE_UP,
        initialCameraLookAt: center,
        initialCameraPosition: [center[0], center[1] + ORBIT_HEIGHT, center[2] + ORBIT_RADIUS],
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: PT_MIN, sizeAttenuation: true, vertexColors: true });
      points = new THREE.Points(geo, mat);
      (viewer.threeScene || viewer.scene)?.add(points);

      try {
        await viewer.addSplatScene(blobUrl, {
          format: isKsplat ? GS.SceneFormat.KSplat : GS.SceneFormat.Ply,
          showLoadingUI: false,
          progressiveLoad: false,
        });
      } catch (e: any) {
        if (!disposed) setError(e?.message || "Splat failed to load.");
        return;
      }
      if (disposed) return;
      if (viewer.splatMesh) viewer.splatMesh.visible = false;

      const cam = viewer.camera;
      cam.up.set(SCENE_UP[0], SCENE_UP[1], SCENE_UP[2]);

      if (debug) {
        // free-look: orbit/zoom to the perfect view, press C to copy its coords
        if (points) points.visible = false;
        if (viewer.splatMesh) viewer.splatMesh.visible = true;
        try {
          viewer.start?.();
        } catch {
          /* noop */
        }
        keyHandler = (e: KeyboardEvent) => {
          if (e.key.toLowerCase() !== "c") return;
          const p = cam.position;
          const t = viewer.controls?.target ?? { x: center[0], y: center[1], z: center[2] };
          const snip =
            `const SETTLED_POS: [number, number, number] | null = [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}];\n` +
            `const SETTLED_TARGET: [number, number, number] | null = [${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)}];`;
          console.log("[Portal] perfect view — paste into SplatViewer.tsx:\n" + snip);
          navigator.clipboard?.writeText(snip).catch(() => {});
        };
        window.addEventListener("keydown", keyHandler);
        console.log("[Portal] debug free-look: drag to orbit, scroll to zoom, press C to copy camera coords.");
        setReady(true);
        return;
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      setReady(true);

      const lin = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
      type V3 = [number, number, number];

      // rotation completes by P_GROW_1 (when size maxes), then the orbit freezes for the hold
      const angleFor = (p: number) => DIRECTION * Math.min(p / P_GROW_1, 1) * ROT_TURNS * Math.PI * 2;
      const orbitPos = (p: number): V3 => {
        const a = angleFor(p);
        return [center[0] + ORBIT_RADIUS * Math.cos(a), center[1] + ORBIT_HEIGHT, center[2] + ORBIT_RADIUS * Math.sin(a)];
      };
      const aT = angleFor(P_GROW_1); // frozen viewing angle during the hold
      // convert to splat only after a ~HOLD_PX dwell past full size (HOLD_PX is real scroll pixels)
      const pSplat = () => Math.min(0.96, P_GROW_1 + HOLD_PX / span());
      const settledPos: V3 = SETTLED_POS ?? [
        center[0] + ORBIT_RADIUS * CENTER_DOLLY * Math.cos(aT),
        center[1] + ORBIT_HEIGHT * CENTER_DOLLY,
        center[2] + ORBIT_RADIUS * CENTER_DOLLY * Math.sin(aT),
      ];
      const settledTarget: V3 = SETTLED_TARGET ?? center;

      const setVis = (cloud: boolean) => {
        if (points) points.visible = cloud;
        if (viewer.splatMesh) viewer.splatMesh.visible = !cloud;
      };
      const camArr = (): V3 => [cam.position.x, cam.position.y, cam.position.z];

      let baseMode: "cloud" | "splat" = "cloud";
      let lastMode: "cloud" | "splat" = "cloud";
      let trans: { dir: "toSplat" | "toCloud"; t0: number; from: V3; to: V3 } | null = null;

      const animate = () => {
        raf = requestAnimationFrame(animate);
        scroll.cur += (scroll.target - scroll.cur) * 0.1;
        const p = scroll.cur;
        const target: "cloud" | "splat" = p >= pSplat() ? "splat" : "cloud";
        const destOf = trans ? (trans.dir === "toSplat" ? "splat" : "cloud") : baseMode;

        // start (or reverse) a 500ms transition; the SPLAT animates during it
        if (target !== destOf) {
          trans = {
            dir: target === "splat" ? "toSplat" : "toCloud",
            t0: performance.now(),
            from: camArr(),
            to: target === "splat" ? settledPos : orbitPos(P_GROW_1),
          };
          setVis(false);
        }

        if (trans) {
          const e = (performance.now() - trans.t0) / TRANSITION_MS;
          if (e >= 1) {
            cam.position.set(trans.to[0], trans.to[1], trans.to[2]);
            baseMode = trans.dir === "toSplat" ? "splat" : "cloud";
            trans = null;
            setVis(baseMode === "cloud");
          } else {
            const k = ease(e);
            cam.position.set(
              trans.from[0] + (trans.to[0] - trans.from[0]) * k,
              trans.from[1] + (trans.to[1] - trans.from[1]) * k,
              trans.from[2] + (trans.to[2] - trans.from[2]) * k
            );
          }
        } else if (baseMode === "cloud") {
          const op = orbitPos(p); // rotate + grow while scrolling
          cam.position.set(op[0], op[1], op[2]);
          mat.size = PT_MIN + (PT_MAX - PT_MIN) * lin(p, P_GROW_0, P_GROW_1);
          if (points) points.visible = p >= P_CLOUD_IN;
          if (viewer.splatMesh) viewer.splatMesh.visible = false;
        } else {
          cam.position.set(settledPos[0], settledPos[1], settledPos[2]); // splat settled, no rotation
        }

        const lt = !trans && baseMode === "splat" ? settledTarget : center;
        cam.lookAt(lt[0], lt[1], lt[2]);

        const display = trans ? (trans.dir === "toSplat" ? "splat" : "cloud") : baseMode;
        if (display !== lastMode) {
          lastMode = display;
          setMode(display);
        }

        viewer.update();
        viewer.render();
      };
      animate();
    })().catch((e: any) => {
      if (!disposed) setError(e?.message || "Viewer init failed.");
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      if (keyHandler) window.removeEventListener("keydown", keyHandler);
      try {
        viewer?.dispose?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />

      {ready && !error && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium backdrop-blur">
          {mode === "cloud" ? (
            <span className="text-white/70">● point cloud</span>
          ) : (
            <span className="grad-text font-semibold">✦ gaussian splat</span>
          )}
        </div>
      )}

      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
          <div className="relative h-14 w-14">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="url(#pg)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 24}
                strokeDashoffset={2 * Math.PI * 24 * (1 - progress / 100)}
                style={{ transition: "stroke-dashoffset .2s linear" }}
              />
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold tabular-nums text-white">
              {progress}%
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">loading splat</p>
        </div>
      )}

      {error && (
        <div className="dotgrid absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
          <p className="text-[12px] text-white/55">live splat unavailable</p>
          <p className="font-mono text-[10px] text-white/30">{error}</p>
        </div>
      )}
    </div>
  );
}
