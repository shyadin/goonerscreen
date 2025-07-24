# requirements: python-dotenv, pillow, tqdm
import os
import sys
import shutil
import subprocess
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from PIL import Image
from tqdm import tqdm
import threading
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
import mimetypes

# Load environment variables from .env
load_dotenv()

raw_content_input_dir = os.getenv("CONTENT_INPUT_DIR")
raw_compression_output_dir = os.getenv("COMPRESSION_OUTPUT_DIR")

if not raw_content_input_dir:
    raise ValueError("CONTENT_INPUT_DIR must be set in .env")
if not raw_compression_output_dir:
    raise ValueError("COMPRESSION_OUTPUT_DIR must be set in .env")

CONTENT_INPUT_DIR = os.path.expanduser(raw_content_input_dir)
COMPRESSION_OUTPUT_DIR = os.path.expanduser(raw_compression_output_dir)

SUPPORTED_IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".tiff",
    ".bmp",
    ".avif",
]
SUPPORTED_VIDEO_EXTENSIONS = [".mov", ".mp4"]
VIDEO_OUTPUT_EXTENSION = ".webm"

file_stats = []
file_stats_lock = threading.Lock()


def ensure_dir(dir_path):
    Path(dir_path).mkdir(parents=True, exist_ok=True)


def sanitize_path(file_path):
    return (
        str(file_path)
        .replace(r"+", "")
        .replace("?", "")
        .replace("<", "")
        .replace(">", "")
        .replace(":", "")
        .replace('"', "")
        .replace("|", "")
        .replace("*", "")
        .replace(" ", "_")
    )


def format_size(bytes):
    if bytes < 1024:
        return f"{bytes} B"
    if bytes < 1024 * 1024:
        return f"{bytes / 1024:.2f} KB"
    if bytes < 1024 * 1024 * 1024:
        return f"{bytes / (1024 * 1024):.2f} MB"
    return f"{bytes / (1024 * 1024 * 1024):.2f} GB"


def format_duration(ms):
    total_seconds = int(ms / 1000)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    ms_rem = ms % 1000
    parts = []
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0 or hours > 0:
        parts.append(f"{minutes}m")
    parts.append(f"{seconds}s")
    if hours == 0 and minutes == 0:
        parts[-1] += f" {ms_rem}ms"
    return " ".join(parts)


def collect_all_files(dir_path, rel_base=Path()):
    files = []
    for entry in Path(dir_path).iterdir():
        abs_path = entry
        rel_path = rel_base / entry.name
        if entry.is_dir():
            files.extend(collect_all_files(abs_path, rel_path))
        elif entry.is_file():
            files.append((abs_path, rel_path))
    return files


def process_image(input_path, output_path, rel_path):
    try:
        with Image.open(input_path) as img:
            width, height = img.size
            resize_width = min(width, 900)
            if width > 900:
                img = img.resize(
                    (resize_width, int(height * resize_width / width)),
                    Image.Resampling.LANCZOS,
                )
            output_file = sanitize_path(str(output_path.with_suffix(".webp")))
            if Path(output_file).exists():
                return
            img.save(output_file, "WEBP", quality=80)
        original = os.path.getsize(input_path)
        converted = os.path.getsize(output_file)
        with file_stats_lock:
            file_stats.append(
                {
                    "original": original,
                    "converted": converted,
                    "relPath": str(rel_path.with_suffix(".webp")),
                }
            )
        saved = original - converted
        tqdm.write(
            f"[Image] {rel_path.with_suffix('.webp')}: {format_size(original)} -> {format_size(converted)} (saved {format_size(saved)})"
        )
    except Exception as err:
        tqdm.write(f"[Image] Failed to process image: {rel_path} {err}")


def process_video(input_path, output_path, rel_path):
    ensure_dir(output_path.parent)
    output_file = output_path.with_suffix(VIDEO_OUTPUT_EXTENSION)
    if not output_file.exists():
        try:
            tqdm.write(f"[Video] Starting conversion: {rel_path}")
            # Get video duration for progress
            try:
                ffprobe_cmd = [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    str(input_path),
                ]
                duration_str = subprocess.check_output(ffprobe_cmd).decode().strip()
                duration = float(duration_str) if duration_str else 0
            except Exception:
                duration = 0
            if not duration or duration <= 0:
                duration = 1
            # ffmpeg progress bar (optional: could be removed for thread clarity)
            ffmpeg_cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(input_path),
                "-vf",
                "scale=900:-2",
                "-c:v",
                "libsvtav1",
                "-crf",
                "45",
                "-b:v",
                "0",
                "-cpu-used",
                "8",
                "-threads",
                str(os.cpu_count()),
                "-row-mt",
                "1",
                "-strict",
                "experimental",
                "-c:a",
                "libopus",
                "-b:a",
                "64k",
                str(output_file),
            ]
            process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1,
            )
            process.communicate()
            if process.returncode != 0:
                tqdm.write(f"[Video] ffmpeg error: {rel_path}")
                return
            tqdm.write(f"[Video] Conversion finished: {rel_path}")
            original = os.path.getsize(input_path)
            converted = os.path.getsize(output_file)
            with file_stats_lock:
                file_stats.append(
                    {
                        "original": original,
                        "converted": converted,
                        "relPath": str(rel_path.with_suffix(VIDEO_OUTPUT_EXTENSION)),
                    }
                )
            saved = original - converted
            tqdm.write(
                f"[Video] {rel_path.with_suffix(VIDEO_OUTPUT_EXTENSION)}: {format_size(original)} -> {format_size(converted)} (saved {format_size(saved)})"
            )
        except Exception as err:
            tqdm.write(f"[Video] Failed to convert video: {rel_path} {err}")
            return
    # Generate thumbnail
    thumbnail_path = output_file.with_suffix(".webp")
    if not thumbnail_path.exists():
        try:
            create_video_thumbnail(input_path, thumbnail_path)
            tqdm.write(f"[Video] Thumbnail created: {thumbnail_path.name}")
        except Exception as err:
            tqdm.write(f"[Video] Failed to create thumbnail for {rel_path}: {err}")


def create_video_thumbnail(video_path, thumbnail_path):
    # Get duration
    try:
        ffprobe_cmd = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ]
        duration_str = subprocess.check_output(ffprobe_cmd).decode().strip()
        duration = float(duration_str) if duration_str else 0
    except Exception:
        duration = 0
    # Try multiple fallback timestamps
    fallback_timestamps = [2, 1, 0.5, 0]
    if duration > 0 and duration < 2:
        fallback_timestamps = [duration / 2, 0]
    temp_jpg = str(thumbnail_path.with_suffix(".jpg"))
    for ts in fallback_timestamps:
        timestamp_str = f"{ts:.2f}".rstrip("0").rstrip(".")
        try:
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(video_path),
                    "-ss",
                    timestamp_str,
                    "-vframes",
                    "1",
                    "-vf",
                    "scale=400:-1",
                    temp_jpg,
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            # Convert to webp
            with Image.open(temp_jpg) as img:
                img.save(thumbnail_path, "WEBP", quality=80)
            os.remove(temp_jpg)
            return  # Success!
        except subprocess.CalledProcessError as err:
            tqdm.write(
                f"[Video] ffmpeg thumbnail error for {video_path} at {timestamp_str}s"
            )
            if os.path.exists(temp_jpg):
                os.remove(temp_jpg)
        except Exception as err:
            if os.path.exists(temp_jpg):
                os.remove(temp_jpg)
            tqdm.write(
                f"[Video] Exception for thumbnail {video_path} at {timestamp_str}s"
            )
    # If all attempts fail, raise the last error
    tqdm.write(
        f"[Video] Failed to create thumbnail for {video_path} at all fallback timestamps."
    )


def copy_file(input_path, output_path):
    shutil.copy2(input_path, output_path)


def process_file_wrapper(args):
    abs_path, rel_path = args
    ext = abs_path.suffix.lower()
    output_path = Path(sanitize_path(str(Path(COMPRESSION_OUTPUT_DIR) / rel_path)))
    ensure_dir(output_path.parent)
    if ext in SUPPORTED_IMAGE_EXTENSIONS:
        process_image(abs_path, output_path, rel_path)
    elif ext in SUPPORTED_VIDEO_EXTENSIONS:
        process_video(abs_path, output_path, rel_path)
    else:
        copy_file(abs_path, output_path)


def print_report(total_time_ms=None):
    total_original = 0
    total_converted = 0
    print("\nConversion Report:")
    for stat in file_stats:
        saved = stat["original"] - stat["converted"]
        total_original += stat["original"]
        total_converted += stat["converted"]
        print(
            f"{stat['relPath']}: {format_size(stat['original'])} -> {format_size(stat['converted'])} (saved {format_size(saved)})"
        )
    print(
        f"\nTotal: {format_size(total_original)} -> {format_size(total_converted)} (saved {format_size(total_original - total_converted)})"
    )
    if total_time_ms is not None:
        print(f"Total time: {format_duration(total_time_ms)}")


def main():
    import time

    ensure_dir(COMPRESSION_OUTPUT_DIR)
    start_time = time.time()
    # all_files = collect_all_files(CONTENT_INPUT_DIR)
    # max_workers = os.cpu_count() or 4
    # with ThreadPoolExecutor(max_workers=max_workers) as executor:
    #     with tqdm(
    #         total=len(all_files), desc="Overall Progress", unit="file"
    #     ) as overall_bar:
    #         futures = [
    #             executor.submit(process_file_wrapper, args) for args in all_files
    #         ]
    #         for _ in as_completed(futures):
    #             overall_bar.update(1)
    # end_time = time.time()
    # print_report(int((end_time - start_time) * 1000))

    output_files = collect_all_files(sanitize_path(COMPRESSION_OUTPUT_DIR))
    # Write content.csv
    content_csv_path = os.path.join(
        sanitize_path(COMPRESSION_OUTPUT_DIR), "content.csv"
    )
    rows = []
    for abs_path, rel_path in output_files:
        stat = abs_path.stat()
        mime_type, _ = mimetypes.guess_type(str(abs_path))
        rel_path_str = rel_path.as_posix()

        if rel_path_str.endswith("content.csv"):
            continue

        set_name = rel_path_str.split("/")[0] if "/" in rel_path_str else rel_path_str

        set_name = set_name.replace("_", " ")

        rows.append(
            {
                "name": abs_path.stem,
                "key": rel_path_str,
                "set": set_name,
                "size": stat.st_size,
                "mimeType": mime_type or "application/octet-stream",
                "date": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "tags": "",
            }
        )
    with open(content_csv_path, "w", newline="") as csvfile:
        writer = csv.DictWriter(
            csvfile,
            fieldnames=["name", "key", "set", "size", "mimeType", "date", "tags"],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    tqdm.write(f"Wrote content.csv with {len(rows)} entries.")


if __name__ == "__main__":
    main()
