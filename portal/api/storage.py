"""Presigned S3/R2 URLs for the API (browser uploads video; worker reads it)."""
import os

import boto3

_BUCKET = os.environ["S3_BUCKET"]
_s3 = boto3.client(
    "s3",
    endpoint_url=os.environ.get("S3_ENDPOINT") or None,
    aws_access_key_id=os.environ["S3_KEY"],
    aws_secret_access_key=os.environ["S3_SECRET"],
    region_name=os.environ.get("S3_REGION", "auto"),
)


def presign_put(key: str, content_type: str = "video/mp4", expires: int = 3600) -> str:
    """URL the browser/CLI PUTs the raw video to."""
    return _s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": _BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def presign_get(key: str, expires: int = 3600) -> str:
    """URL the worker downloads the video from (GOTCHA G7: pass this, not base64)."""
    return _s3.generate_presigned_url(
        "get_object", Params={"Bucket": _BUCKET, "Key": key}, ExpiresIn=expires)
