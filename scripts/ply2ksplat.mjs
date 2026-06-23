#!/usr/bin/env node
/**
 * Convert a 3DGS .ply (or .splat) -> .ksplat using mkkellogg's own parser + buffer
 * generator (the same code the viewer uses). No external CLI / service needed.
 *
 * Depends on @mkkellogg/gaussian-splats-3d, which is installed in ../portal-fe/node_modules
 * (run `npm install` in portal-fe once). The import below is resolved relative to THIS file,
 * so you can run the script from anywhere:
 *
 *   node --max-old-space-size=8192 scripts/ply2ksplat.mjs <in.ply> <out.ksplat> [compression] [shDegree] [alpha]
 *
 *   compression : 0 = lossless float32 (~big) · 1 = 16-bit, near-lossless (default) · 2 = smaller, mild loss
 *   shDegree    : spherical-harmonics degree to KEEP — 0 flat / 1 / 2 (default) / 3.
 *                 Match your .ply (45 f_rest props = 3, 24 = 2, 9 = 1, 0 = 0) to preserve
 *                 view-dependent color. Lowering it drops sheen/reflections.
 *   alpha       : remove splats with opacity <= this (default 1; prunes near-invisible/dead ones).
 *
 * Example (what produced our 156 MB -> 55 MB hero splat):
 *   node --max-old-space-size=8192 scripts/ply2ksplat.mjs splat_vs.ply splat_vs.ksplat 1 2
 *
 * The big --max-old-space-size matters: a 150 MB+ .ply parses into a larger in-memory array.
 */
import * as GS from "../portal-fe/node_modules/@mkkellogg/gaussian-splats-3d/build/gaussian-splats-3d.module.js";
import * as fs from "fs";
import * as path from "path";

const [, , input, output, compArg, shArg, alphaArg] = process.argv;
if (!input || !output) {
  console.error(
    "Usage: node --max-old-space-size=8192 scripts/ply2ksplat.mjs <in.ply> <out.ksplat> [compression=1] [shDegree=2] [alpha=1]"
  );
  process.exit(1);
}

const compressionLevel = compArg !== undefined ? parseInt(compArg) : 1;
const shDegree = shArg !== undefined ? parseInt(shArg) : 2;
const alphaRemovalThreshold = alphaArg !== undefined ? parseInt(alphaArg) : 1;
const sectionSize = 0; // 0 = single section (whole scene)

console.log(
  `in=${input}  out=${output}  compression=${compressionLevel}  SH=${shDegree}  alpha=${alphaRemovalThreshold}`
);
const t0 = Date.now();

const fileData = fs.readFileSync(input);
const ab = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);

const fmt = GS.LoaderUtils.sceneFormatFromPath(input.toLowerCase());
let splatArray;
if (fmt === GS.SceneFormat.Ply) {
  splatArray = GS.PlyParser.parseToUncompressedSplatArray(ab, shDegree);
} else if (fmt === GS.SceneFormat.Splat) {
  splatArray = GS.SplatParser.parseStandardSplatToUncompressedSplatArray(ab);
} else {
  console.error(`Unsupported input format for ${input} (use .ply or .splat).`);
  process.exit(1);
}

const count = splatArray.splatCount ?? splatArray.splats?.length ?? "?";
console.log(`parsed ${count} splats (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

const gen = GS.SplatBufferGenerator.getStandardGenerator(
  alphaRemovalThreshold,
  compressionLevel,
  sectionSize,
  undefined, // sceneCenter
  undefined, // blockSize
  undefined  // bucketSize
);
const splatBuffer = gen.generateFromUncompressedSplatArray(splatArray);

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, Buffer.from(splatBuffer.bufferData));

const sz = fs.statSync(output).size;
console.log(
  `WROTE ${output}  ${(sz / 1048576).toFixed(1)} MB  (${((Date.now() - t0) / 1000).toFixed(1)}s total)`
);
