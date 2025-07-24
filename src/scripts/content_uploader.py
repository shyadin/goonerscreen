# requirements: boto3, python-dotenv, tqdm
import os
import mimetypes
from pathlib import Path
from dotenv import load_dotenv
import boto3  # type: ignore  # Ensure boto3 is installed: pip install boto3
from tqdm import tqdm

# Load environment variables from .env
load_dotenv()

OUTPUT_DIR = os.getenv("COMPRESSION_OUTPUT_DIR")
R2_BUCKET = os.getenv("R2_BUCKET")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_DEFAULT_REGION = os.getenv("R2_DEFAULT_REGION")

if not OUTPUT_DIR:
    raise ValueError("COMPRESSION_OUTPUT_DIR must be set in .env")
if not R2_BUCKET:
    raise ValueError("R2_BUCKET must be set in .env")

# R2 client
s3 = boto3.client(
    "s3",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name=R2_DEFAULT_REGION,
)

CONTENT_CSV = os.path.join(OUTPUT_DIR, "content.csv")


# Walk directory and collect file metadata
def walk_dir(base_dir):
    files = []
    for path in Path(base_dir).rglob("*"):
        if path.is_file() and path.name != "content.csv":
            rel_path = path.relative_to(base_dir).as_posix()
            stat = path.stat()
            mime_type, _ = mimetypes.guess_type(str(path))
            files.append(
                {
                    "key": rel_path,
                    "size": stat.st_size,
                    "mimeType": mime_type or "application/octet-stream",
                }
            )
    return files


class TqdmUploadCallback:
    def __init__(self, t):
        self.t = t
        self.last = 0

    def __call__(self, bytes_amount):
        self.t.update(bytes_amount - self.last)
        self.last = bytes_amount


def upload_file_if_not_exists(key, file_path, mime_type, file_size):
    try:
        s3.head_object(Bucket=R2_BUCKET, Key=key)
        print(f"Exists, skipping: {key}")
    except s3.exceptions.ClientError:
        with tqdm(
            total=file_size, unit="B", unit_scale=True, desc=key, leave=False
        ) as file_bar:
            s3.upload_file(
                str(file_path),
                R2_BUCKET,
                key,
                ExtraArgs={"ContentType": mime_type},
                Callback=file_bar.update,
            )
        print(f"Uploaded: {key}")


def main():
    assert OUTPUT_DIR is not None, "OUTPUT_DIR must not be None in main()"
    files = walk_dir(OUTPUT_DIR)
    print(f"Found {len(files)} files.")

    with tqdm(
        total=len(files), desc="Overall Upload Progress", unit="file"
    ) as overall_bar:
        for file in files:
            file_path = os.path.join(OUTPUT_DIR, file["key"])
            upload_file_if_not_exists(
                file["key"], file_path, file["mimeType"], file["size"]
            )
            overall_bar.update(1)

    # Upload content.csv to R2 with progress bar
    csv_size = os.path.getsize(CONTENT_CSV)
    with tqdm(
        total=csv_size, unit="B", unit_scale=True, desc="content.csv", leave=False
    ) as csv_bar:
        s3.upload_file(
            CONTENT_CSV,
            R2_BUCKET,
            "content.csv",
            ExtraArgs={"ContentType": "text/csv"},
            Callback=csv_bar.update,
        )
    print("Uploaded content.csv to R2.")


if __name__ == "__main__":
    main()
