import os
import boto3
from botocore.config import Config

STORAGE_TYPE = os.getenv("STORAGE_TYPE", "minio")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin")
S3_BUCKET_MUSIC = os.getenv("S3_BUCKET_MUSIC", "music-files")
S3_BUCKET_IMAGES = os.getenv("S3_BUCKET_IMAGES", "music-images")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
PUBLIC_MINIO_URL = os.getenv("PUBLIC_MINIO_URL", "http://localhost:9000")


def get_s3_client():
    kwargs = dict(
        region_name=S3_REGION,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )
    if STORAGE_TYPE == "minio":
        kwargs["endpoint_url"] = S3_ENDPOINT_URL
        kwargs["config"] = Config(signature_version="s3v4")
    return boto3.client("s3", **kwargs)


def get_public_url(bucket: str, key: str) -> str:
    if STORAGE_TYPE == "minio":
        return f"{PUBLIC_MINIO_URL}/{bucket}/{key}"
    return f"https://{bucket}.s3.{S3_REGION}.amazonaws.com/{key}"


def upload_file(file_bytes: bytes, key: str, bucket: str, content_type: str = "application/octet-stream") -> str:
    client = get_s3_client()
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return key


def delete_file(key: str, bucket: str) -> None:
    client = get_s3_client()
    client.delete_object(Bucket=bucket, Key=key)


def generate_presigned_url(key: str, bucket: str, expiration: int = 3600) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expiration,
    )
