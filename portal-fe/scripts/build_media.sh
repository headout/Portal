#!/usr/bin/env bash
# Transcode the heavy source captures into small, web-ready clips + posters.
# Sources live one level above portal-fe (the 3dgs working dir).
# Usage:  FFMPEG=ffmpeg ./scripts/build_media.sh
set -uo pipefail

FF="${FFMPEG:-ffmpeg}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$HERE/../.." && pwd)"          # /…/3dgs
OUT="$(cd "$HERE/.." && pwd)/public/media"
mkdir -p "$OUT"

# auto-detect HDR (bt2020 / HLG / PQ); pick the right filter up front, then ONE encode.
enc () {  # $1 src  $2 trim-args  $3 scale  $4 out
  local src="$SRC/$1" out="$OUT/$4" info vf
  # capture probe separately: `ffmpeg -i` exits non-zero (no output file), which
  # would poison `set -o pipefail` and make the grep test always read false.
  info="$("$FF" -i "$src" 2>&1 || true)"
  if echo "$info" | grep -qE "bt2020|arib-std-b67|smpte2084"; then
    echo "  [hdr->sdr] $1 -> $4"
    vf="zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,scale=$3"
  else
    echo "  [sdr] $1 -> $4"
    vf="scale=$3,format=yuv420p"
  fi
  "$FF" -y $2 -i "$src" -vf "$vf" \
    -an -c:v libx264 -crf 30 -preset veryfast -movflags +faststart "$out"
}

poster () { "$FF" -y -ss 1 -i "$OUT/$1" -frames:v 1 -q:v 3 "$OUT/$2" 2>/dev/null; }

echo "Encoding clips -> $OUT"
# NOTE: the hero splat is now a live WebGL viewer (SplatViewer.tsx) streaming the
# .ply/.ksplat from R2 — no splat.mp4 needed.
enc "final.mov"        "-t 14"        "1280:-2" "input.mp4"
enc "audi_demo.MOV"    "-t 14"        "-2:900"  "seat.mp4"
enc "sculpture.mov"    "-t 16"        "-2:900"  "object.mp4"
enc "lane.mov"         "-ss 2 -t 16"  "-2:900"  "walk.mp4"

echo "Posters"
poster input.mp4  input.jpg
poster seat.mp4   seat.jpg
poster object.mp4 object.jpg
poster walk.mp4   walk.jpg
# portal.jpg = a still from our splat render (used in the KIRI comparison)
"$FF" -y -ss 1 -i "$SRC/traj_29999.mp4" -frames:v 1 -q:v 3 "$OUT/portal.jpg" 2>/dev/null

echo "Done. Sizes:"; ls -lah "$OUT" | awk '{print "  "$5"  "$9}'
