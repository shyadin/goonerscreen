import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { mkdirSync, existsSync } from "fs";
import { unlink } from "fs/promises";
import cliProgress from "cli-progress";
import os from "os";

const CONTENT_DIR = path.resolve(process.env.HOME || "", "Downloads/Content");
const OUTPUT_DIR = path.resolve(
  process.env.HOME || "",
  "Downloads/Converted Content"
);
const TEMP_VIDEO_DIR = path.resolve(process.env.HOME || "", "Downloads/videos");

const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".tiff",
  ".bmp",
  ".avif",
];
const SUPPORTED_VIDEO_EXTENSIONS = [".mov", ".mp4"];
const VIDEO_OUTPUT_EXTENSION = ".webm";

interface FileStat {
  original: number;
  converted: number;
  relPath: string;
}

const fileStats: FileStat[] = [];

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(sanitizePath(dir), { recursive: true });
  }
}

// Sanitize output file paths for ffmpeg/sharp compatibility
function sanitizePath(filePath: string): string {
  // Replace problematic characters and spaces with underscores
  return filePath.replace(/[+?<>:"|*]/g, "");
}

async function processImage(
  inputPath: string,
  outputPath: string,
  relPath: string
) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const resizeWidth = width > 900 ? 900 : width;
    const outputFile = sanitizePath(
      outputPath.replace(path.extname(outputPath), ".webp")
    );

    const doesOutputExist = await fs
      .stat(outputFile)
      .then(() => true)
      .catch(() => false);
    if (doesOutputExist) {
      return;
    }

    await sharp(inputPath)
      .resize({ width: resizeWidth })
      .webp({ quality: 80 })
      .toFile(outputFile);

    const original = (await fs.stat(inputPath)).size;
    const converted = (await fs.stat(outputFile)).size;
    fileStats.push({
      original,
      converted,
      relPath: relPath.replace(path.extname(relPath), ".webp"),
    });
    // Realtime reporting
    const saved = original - converted;
    console.log(
      `[Image] ${relPath.replace(path.extname(relPath), ".webp")}: ${formatSize(
        original
      )} -> ${formatSize(converted)} (saved ${formatSize(saved)})`
    );
  } catch (err) {
    console.error(`[Image] Failed to process image: ${relPath}`, err);
  }
}

// A simpler, more robust version of processVideo that avoids temp files and progress bars for debugging.
// This version just converts the video and generates a thumbnail, with clear error reporting.

async function processVideo(
  inputPath: string,
  outputPath: string,
  relPath: string
) {
  // Ensure output directory exists
  await ensureDir(path.dirname(outputPath));

  const outputFile = outputPath.replace(
    path.extname(outputPath),
    VIDEO_OUTPUT_EXTENSION
  );

  // If output already exists, skip conversion
  const doesOutputVideoExist = await fs
    .stat(outputFile)
    .then(() => true)
    .catch(() => false);

  if (!doesOutputVideoExist) {
    try {
      console.log(`[Video] Starting conversion: ${relPath}`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
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
            os.cpus().length.toString(),
            "-row-mt",
            "1",
            "-strict",
            "experimental",
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
          ])
          .on("start", (commandLine) => {
            console.log(`[Video] ffmpeg started: ${commandLine}`);
          })
          .on("error", (err) => {
            console.error(`[Video] ffmpeg error: ${relPath}`, err);
            reject(err);
          })
          .on("end", () => {
            console.log(`[Video] Conversion finished: ${relPath}`);
            resolve();
          })
          .save(outputFile);
      });

      const original = (await fs.stat(inputPath)).size;
      const converted = (await fs.stat(outputFile)).size;
      fileStats.push({
        original,
        converted,
        relPath: relPath.replace(path.extname(relPath), VIDEO_OUTPUT_EXTENSION),
      });
      const saved = original - converted;
      console.log(
        `[Video] ${relPath.replace(
          path.extname(relPath),
          VIDEO_OUTPUT_EXTENSION
        )}: ${formatSize(original)} -> ${formatSize(
          converted
        )} (saved ${formatSize(saved)})`
      );
    } catch (err) {
      console.error(`[Video] Failed to convert video: ${relPath}`, err);
      return;
    }
  }

  // Generate thumbnail
  const thumbnailPath = outputFile.replace(path.extname(outputFile), ".webp");
  const doesThumbnailExist = await fs
    .stat(thumbnailPath)
    .then(() => true)
    .catch(() => false);
  if (!doesThumbnailExist) {
    try {
      await createVideoThumbnail(inputPath, thumbnailPath);
      console.log(`[Video] Thumbnail created: ${path.basename(thumbnailPath)}`);
    } catch (err) {
      console.error(`[Video] Failed to create thumbnail for ${relPath}:`, err);
    }
  }
}

async function createVideoThumbnail(videoPath: string, thumbnailPath: string) {
  // We want to grab a frame at 2 seconds, but ensure the video is at least that long.
  // If not, use the midpoint (or 0 if very short).
  const getDuration = async (): Promise<number> => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(err);
        if (
          !metadata ||
          !metadata.format ||
          typeof metadata.format.duration !== "number"
        ) {
          return resolve(0);
        }
        resolve(metadata.format.duration);
      });
    });
  };

  const duration = await getDuration();
  let timestamp = 2;
  if (duration <= 0) {
    timestamp = 0;
  } else if (duration < 2) {
    // Use the midpoint if video is shorter than 2s
    timestamp = duration / 2;
  }
  // Format timestamp as string, with up to 2 decimal places
  const timestampStr = timestamp.toFixed(2).replace(/\.?0+$/, "");

  // Try at desired timestamp, then fallback to 0 if it fails
  const extractAndConvert = async (timestampValue: string) => {
    // ffmpeg will output a jpg/png, so we need to convert to webp after
    const tempJpg = thumbnailPath.replace(/\.webp$/, ".jpg");
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .screenshots({
          timestamps: [timestampValue],
          filename: path.basename(tempJpg),
          folder: path.dirname(tempJpg),
          size: "400x?",
        });
    });
    // Convert to webp
    await sharp(tempJpg).webp({ quality: 80 }).toFile(thumbnailPath);
    // Remove temp jpg
    await fs.unlink(tempJpg).catch(() => {});
  };

  try {
    await extractAndConvert(timestampStr);
  } catch (err) {
    if (timestamp !== 0) {
      try {
        await extractAndConvert("0");
      } catch (err2) {
        throw err2;
      }
    } else {
      throw err;
    }
  }
}

async function copyFile(inputPath: string, outputPath: string) {
  await fs.copyFile(inputPath, outputPath);
}

async function processFile(inputPath: string, relPath: string) {
  const ext = path.extname(inputPath).toLowerCase();
  const outputPath = sanitizePath(path.join(OUTPUT_DIR, relPath));
  await ensureDir(path.dirname(outputPath));

  if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
    await processImage(inputPath, outputPath, relPath);
  } else if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) {
    await processVideo(inputPath, outputPath, relPath);
  } else {
    await copyFile(inputPath, outputPath);
  }
}

async function walkDir(dir: string, relBase = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    const relPath = path.join(relBase, entry.name);
    if (entry.isDirectory()) {
      await walkDir(absPath, relPath);
    } else if (entry.isFile()) {
      await processFile(absPath, relPath);
    }
  }
}

function printReport(totalTimeMs?: number) {
  let totalOriginal = 0;
  let totalConverted = 0;
  console.log("\nConversion Report:");
  for (const stat of fileStats) {
    const saved = stat.original - stat.converted;
    totalOriginal += stat.original;
    totalConverted += stat.converted;
    console.log(
      `${stat.relPath}: ${formatSize(stat.original)} -> ${formatSize(
        stat.converted
      )} (saved ${formatSize(saved)})`
    );
  }
  console.log(
    `\nTotal: ${formatSize(totalOriginal)} -> ${formatSize(
      totalConverted
    )} (saved ${formatSize(totalOriginal - totalConverted)})`
  );
  if (typeof totalTimeMs === "number") {
    console.log(`Total time: ${formatDuration(totalTimeMs)}`);
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const msRemainder = ms % 1000;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  if (hours === 0 && minutes === 0)
    parts[parts.length - 1] += ` ${msRemainder}ms`;
  return parts.join(" ");
}

async function main() {
  const startTime = Date.now();
  await ensureDir(OUTPUT_DIR);
  await walkDir(CONTENT_DIR);
  const endTime = Date.now();
  printReport(endTime - startTime);
}

main().catch((err) => {
  console.error("Error during conversion:", err);
  process.exit(1);
});
