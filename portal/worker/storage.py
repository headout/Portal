"""S3 / Cloudflare R2 helpers for the worker (download input, upload outputs).

Configured via env (set on the RunPod endpoint):
    S3_ENDPOINT   e.g. https://<account>.r2.cloudflarestorage.com  (omit for AWS S3)
    S3_BUCKET, S3_KEY, S3_SECRET, S3_REGION (default 'auto')
    S3_PUBLIC_BASE  optional public base URL for returned links (R2 public bucket / CDN)
"""
import mimetypes
import os
import urllib.request

import boto3

_BUCKET = os.environ["S3_BUCKET"]
_PUBLIC_BASE = os.environ.get("S3_PUBLIC_BASE", "").rstrip("/")

_s3 = boto3.client(
    "s3",
    endpoint_url=os.environ.get("S3_ENDPOINT") or None,
    aws_access_key_id=os.environ["S3_KEY"],
    aws_secret_access_key=os.environ["S3_SECRET"],
    region_name=os.environ.get("S3_REGION", "auto"),
)


def download_to(url, dest_path):
    """Download a (presigned) URL to a local file."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with urllib.request.urlopen(url, timeout=600) as r, open(dest_path, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    return dest_path


def _url_for(key):
    if _PUBLIC_BASE:
        return f"{_PUBLIC_BASE}/{key}"
    # otherwise hand back a presigned GET (7 days)
    return _s3.generate_presigned_url(
        "get_object", Params={"Bucket": _BUCKET, "Key": key}, ExpiresIn=7 * 24 * 3600)


def upload_file(local_path, key):
    ctype = mimetypes.guess_type(key)[0] or "application/octet-stream"
    _s3.upload_file(local_path, _BUCKET, key, ExtraArgs={"ContentType": ctype})
    return _url_for(key)


def upload_dir(local_dir, key_prefix):
    """Upload every file under local_dir; return the URL of meta.json (SOG entrypoint)."""
    meta_key = None
    for root, _, files in os.walk(local_dir):
        for name in files:
            local = os.path.join(root, name)
            rel = os.path.relpath(local, local_dir)
            key = f"{key_prefix}/{rel}"
            upload_file(local, key)
            if name == "meta.json":
                meta_key = key
    return _url_for(meta_key) if meta_key else _url_for(key_prefix)
