#!/usr/bin/env python3
"""
Turn a video OR a folder of photos into a 3D Gaussian Splat via the KIRI Engine API.

Pipeline (same for both inputs):
  1. Upload   POST /api/v1/open/3dgs/video  (a video file)
              POST /api/v1/open/3dgs/image  (a folder of images)  -> serialize (task id)
  2. Poll     GET  /api/v1/open/model/getStatus   -> status == 2 (success)
  3. Link     GET  /api/v1/open/model/getModelZip -> modelUrl (zip, valid 60 min)
  4. Download + unzip

The input is auto-detected: a directory -> image scan, a file -> video scan.

Zero external dependencies — uses only the Python standard library.
Docs: https://docs.kiriengine.app/

Usage:
  export KIRI_API_KEY="kiri_xxx"
  python3 kiri_3dgs.py meeting_room.mp4 --out ./room_splat       # video
  python3 kiri_3dgs.py images/meetingRoom --out ./room_splat     # photos (folder)

Constraints (KIRI):  video <=1920x1080 & <=3 min;  images 20-300 per scan.
Both a video and an image batch cost exactly 1 credit.
"""

import argparse
import json
import mimetypes
import os
import sys
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
import zipfile

API_BASE = "https://api.kiriengine.app/api/v1/open"

STATUS = {
    -1: "uploading",
    0: "processing",
    1: "failed",
    2: "successful",
    3: "queuing",
    4: "expired",
}
DONE_OK = 2
DONE_BAD = {1, 4}  # failed / expired -> stop polling


# --------------------------------------------------------------------------- #
# Low-level HTTP helpers (stdlib only)
# --------------------------------------------------------------------------- #
def _send(req):
    """Send a urllib request and return the parsed JSON `data` block."""
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        sys.exit(f"HTTP {e.code} from {req.full_url}\n{detail}")
    except urllib.error.URLError as e:
        sys.exit(f"Network error talking to KIRI: {e.reason}")

    # Success signal is `ok: true`. Note: the live API returns code 200 on
    # success (the docs example shows 0), so don't gate on a specific code.
    if not body.get("ok", False):
        sys.exit(f"KIRI API error: {json.dumps(body, indent=2)}")
    return body["data"]


def _multipart(fields, files):
    """Build a multipart/form-data body. `files` is a list of (field, path) tuples
    (repeat the same field name to send several files). Returns (content_type, body)."""
    boundary = uuid.uuid4().hex
    crlf = b"\r\n"
    buf = bytearray()

    for name, value in fields.items():
        buf += b"--" + boundary.encode() + crlf
        buf += f'Content-Disposition: form-data; name="{name}"'.encode() + crlf + crlf
        buf += str(value).encode() + crlf

    for field, path in files:
        filename = os.path.basename(path)
        ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        with open(path, "rb") as fh:
            file_bytes = fh.read()
        buf += b"--" + boundary.encode() + crlf
        buf += (
            f'Content-Disposition: form-data; name="{field}"; filename="{filename}"'
        ).encode() + crlf
        buf += f"Content-Type: {ctype}".encode() + crlf + crlf
        buf += file_bytes + crlf

    buf += b"--" + boundary.encode() + b"--" + crlf
    return f"multipart/form-data; boundary={boundary}", bytes(buf)


# --------------------------------------------------------------------------- #
# KIRI API calls
# --------------------------------------------------------------------------- #
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".heic")
MIN_IMAGES, MAX_IMAGES = 20, 300


def _upload(endpoint, fields, files, api_key, what):
    content_type, body = _multipart(fields, files)
    req = urllib.request.Request(
        f"{API_BASE}/{endpoint}",
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": content_type},
    )
    print(f"-> Uploading {what} ({len(body) / 1_048_576:.1f} MB) ...", flush=True)
    serialize = _send(req)["serialize"]
    print(f"   Accepted. task serialize = {serialize}")
    return serialize


def _scan_fields(is_mesh, is_mask, file_format):
    fields = {"isMesh": is_mesh, "isMask": is_mask}
    if is_mesh and file_format:
        fields["fileFormat"] = file_format
    return fields


def upload_video(video_path, api_key, is_mesh=0, is_mask=0, file_format=None):
    """Upload a video for 3DGS processing. Returns the task `serialize` id."""
    return _upload(
        "3dgs/video", _scan_fields(is_mesh, is_mask, file_format),
        [("videoFile", video_path)], api_key, os.path.basename(video_path),
    )


def gather_images(folder):
    """Return sorted image paths in `folder`, validating KIRI's 20-300 count."""
    if not os.path.isdir(folder):
        sys.exit(f"Not a folder: {folder}")
    paths = [os.path.join(folder, n) for n in sorted(os.listdir(folder))
             if n.lower().endswith(IMAGE_EXTS)]
    if len(paths) < MIN_IMAGES:
        sys.exit(f"Found {len(paths)} images in {folder}; KIRI needs at least "
                 f"{MIN_IMAGES}.")
    if len(paths) > MAX_IMAGES:
        sys.exit(f"Found {len(paths)} images; KIRI allows at most {MAX_IMAGES}. "
                 f"Trim the folder and retry.")
    return paths


def upload_images(image_paths, api_key, is_mesh=0, is_mask=0, file_format=None):
    """Upload a batch of images for 3DGS processing. Returns the task `serialize` id."""
    return _upload(
        "3dgs/image", _scan_fields(is_mesh, is_mask, file_format),
        [("imagesFiles", p) for p in image_paths], api_key,
        f"{len(image_paths)} images",
    )


def get_status(serialize, api_key):
    q = urllib.parse.urlencode({"serialize": serialize})
    req = urllib.request.Request(
        f"{API_BASE}/model/getStatus?{q}",
        method="GET",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    return _send(req)["status"]


def get_zip_url(serialize, api_key):
    q = urllib.parse.urlencode({"serialize": serialize})
    req = urllib.request.Request(
        f"{API_BASE}/model/getModelZip?{q}",
        method="GET",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    return _send(req)["modelUrl"]


def poll_until_done(serialize, api_key, interval, timeout):
    print(f"-> Polling status every {interval}s (timeout {timeout}s) ...")
    print("   (processing a room takes ~10-30 min; a steady 'processing' is normal)")
    waited = 0
    while waited <= timeout:
        status = get_status(serialize, api_key)
        # Heartbeat every poll so a long 'processing' phase never looks frozen.
        print(f"   [{waited:>4}s] status={status} ({STATUS.get(status, '?')})", flush=True)
        if status == DONE_OK:
            return
        if status in DONE_BAD:
            sys.exit(f"Processing ended with status={status} ({STATUS.get(status)}).")
        time.sleep(interval)
        waited += interval
    sys.exit(f"Timed out after {timeout}s. Task {serialize} still not finished.")


def download_and_extract(url, out_dir, serialize):
    os.makedirs(out_dir, exist_ok=True)
    zip_path = os.path.join(out_dir, f"{serialize}.zip")
    print(f"-> Downloading model zip -> {zip_path}")
    with urllib.request.urlopen(url, timeout=600) as resp, open(zip_path, "wb") as f:
        f.write(resp.read())

    extract_dir = os.path.join(out_dir, serialize)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(extract_dir)
    print(f"-> Extracted to {extract_dir}")
    for root, _, files in os.walk(extract_dir):
        for name in sorted(files):
            print(f"     {os.path.relpath(os.path.join(root, name), out_dir)}")
    return extract_dir


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def main():
    p = argparse.ArgumentParser(description="Video or photo folder -> 3D Gaussian Splat via KIRI Engine")
    p.add_argument("source", help="A video file, OR a folder of 20-300 images")
    p.add_argument("--api-key", default=os.environ.get("KIRI_API_KEY"),
                   help="KIRI API key (or set env KIRI_API_KEY)")
    p.add_argument("--out", default="./output", help="Output directory")
    p.add_argument("--poll", type=int, default=20, help="Status poll interval (s)")
    p.add_argument("--timeout", type=int, default=3600, help="Max wait for processing (s)")
    p.add_argument("--mesh", action="store_true",
                   help="Also convert the splat to a mesh (default: splat only)")
    p.add_argument("--mask", action="store_true",
                   help="Auto-mask a single object (use for objects, NOT room scenes)")
    p.add_argument("--format", default="glb",
                   choices=["obj", "fbx", "stl", "ply", "glb", "gltf", "usdz", "xyz"],
                   help="Mesh output format (only used with --mesh)")
    p.add_argument("--serialize", help="Skip upload; resume from an existing task id")
    args = p.parse_args()

    if not args.api_key:
        sys.exit("No API key. Pass --api-key or set KIRI_API_KEY.")

    mesh = 1 if args.mesh else 0
    mask = 1 if args.mask else 0

    if args.serialize:
        serialize = args.serialize
        print(f"-> Resuming existing task {serialize}")
    elif os.path.isdir(args.source):
        images = gather_images(args.source)
        print(f"-> Image scan: {len(images)} photos from {args.source}")
        serialize = upload_images(images, args.api_key, mesh, mask, args.format)
    elif os.path.isfile(args.source):
        print("NOTE: KIRI limits video to 1920x1080 and 3 min. "
              "Re-encode first if your clip exceeds these.")
        serialize = upload_video(args.source, args.api_key, mesh, mask, args.format)
    else:
        sys.exit(f"Source not found: {args.source}")

    poll_until_done(serialize, args.api_key, args.poll, args.timeout)
    url = get_zip_url(serialize, args.api_key)
    out = download_and_extract(url, args.out, serialize)

    print("\nDone. Your 3D Gaussian Splat is in:")
    print(f"  {out}")
    print("Load the .ply / .splat in a viewer (SuperSplat, PlayCanvas, gsplat, "
          "three.js) and place a camera at each seat to render the stage POV.")


if __name__ == "__main__":
    main()
