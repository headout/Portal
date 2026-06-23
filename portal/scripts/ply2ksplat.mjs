#!/usr/bin/env node
/**
 * Convert a 3DGS .ply (or .splat) -> .ksplat for browser streaming.
 *
 *   npm install                              # in portal/scripts/ (installs the splat lib)
 *   node --max-old-space-size=8192 ply2ksplat.mjs <in.ply> <out.ksplat> [compression] [shDegree] [alpha]
 *
 *   compression : 0 lossless float32 · 1 16-bit near-lossless (default) · 2 smaller, mild loss
 *   shDegree    : SH degree to keep (match your .ply: 45 f_rest=3, 24=2, 9=1, 0=flat) · default 2
 *   alpha       : drop splats with opacity <= this (default 1; prunes near-invisible ones)
 */
import * as GS from "@mkkellogg/gaussian-splats-3d";
import * as fs from "fs";
import * as path from "path";

const [, , input, output, compArg, shArg, alphaArg] = process.argv;
if (!input || !output) {
  console.error("Usage: node ply2ksplat.mjs <in.ply> <out.ksplat> [compression=1] [shDegree=2] [alpha=1]");
  process.exit(1);
}
const compressionLevel = compArg !== undefined ? parseInt(compArg) : 1;
const shDegree = shArg !== undefined ? parseInt(shArg) : 2;
const alphaRemovalThreshold = alphaArg !== undefined ? parseInt(alphaArg) : 1;

const t0 = Date.now();
const fileData = fs.readFileSync(input);
const ab = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);

const fmt = GS.LoaderUtils.sceneFormatFromPath(input.toLowerCase());
let splatArray;
if (fmt === GS.SceneFormat.Ply) splatArray = GS.PlyParser.parseToUncompressedSplatArray(ab, shDegree);
else if (fmt === GS.SceneFormat.Splat) splatArray = GS.SplatParser.parseStandardSplatToUncompressedSplatArray(ab);
else { console.error(`Unsupported input ${input} (use .ply or .splat)`); process.exit(1); }

const gen = GS.SplatBufferGenerator.getStandardGenerator(alphaRemovalThreshold, compressionLevel, 0);
const splatBuffer = gen.generateFromUncompressedSplatArray(splatArray);
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, Buffer.from(splatBuffer.bufferData));
console.log(`WROTE ${output}  ${(fs.statSync(output).size / 1048576).toFixed(1)} MB  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
