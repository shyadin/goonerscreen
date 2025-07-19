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
}

async function processVideo(
  inputPath: string,
  outputPath: string,
  relPath: string
) {
  // Ensure temp directory exists
  await ensureDir(TEMP_VIDEO_DIR);

  const outputFile = outputPath.replace(
    path.extname(outputPath),
    VIDEO_OUTPUT_EXTENSION
  );

  const doesOutputExist = await fs
    .stat(outputFile)
    .then(() => true)
    .catch(() => false);
  if (doesOutputExist) {
    return;
  }

  // Use unique temp names for input and output
  const tempInput = path.join(
    TEMP_VIDEO_DIR,
    `input-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(
      inputPath
    )}`
  );
  const tempOutput = sanitizePath(
    path.join(
      TEMP_VIDEO_DIR,
      `output-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}${VIDEO_OUTPUT_EXTENSION}`
    )
  );

  // Copy the source video to the temp directory
  await fs.copyFile(inputPath, tempInput);

  // Setup progress bar
  const bar = new cliProgress.SingleBar({
    format: `[Video] {filename} |{bar}| {percentage}% | {frames} frames | {time}`,
    barCompleteChar: "\u2588",
    barIncompleteChar: "-",
    hideCursor: true,
    clearOnComplete: true,
  });
  let lastPercent = 0;
  let lastFrames = 0;
  let lastTime = "0:00:00.00";

  // Start conversion with fluent-ffmpeg
  console.log(`[Video] Starting conversion: ${relPath}`);
  await new Promise<void>((resolve, reject) => {
    bar.start(100, 0, { filename: relPath, frames: 0, time: "0:00:00.00" });
    ffmpeg(tempInput)
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
      .on("progress", (progress) => {
        const percent = progress.percent
          ? Math.min(progress.percent, 100)
          : lastPercent;
        lastPercent = percent;
        lastFrames = progress.frames || lastFrames;
        lastTime = progress.timemark || lastTime;
        bar.update(percent, {
          filename: relPath,
          frames: lastFrames,
          time: lastTime,
        });
      })
      .on("end", () => {
        bar.update(100, {
          filename: relPath,
          frames: lastFrames,
          time: lastTime,
        });
        bar.stop();
        console.log(`\n[Video] Conversion finished: ${relPath}`);
        resolve();
      })
      .on("error", async (err) => {
        bar.stop();
        console.error(`\n[Video] ffmpeg error: ${relPath}`, err);
        try {
          await unlink(tempInput);
        } catch (e) {
          console.error("Failed to delete temp input file:", e);
        }
        reject(err);
      })
      .save(tempOutput);
  });

  // Delete the temp input file
  await unlink(tempInput);

  // Ensure output directory exists
  await ensureDir(path.dirname(outputFile));
  // Move the converted file to the final destination
  await fs.rename(tempOutput, outputFile);

  // Generate thumbnail
  const thumbnailPath = outputFile.replace(VIDEO_OUTPUT_EXTENSION, ".webp");
  try {
    await createVideoThumbnail(outputFile, thumbnailPath);
    console.log(`[Video] Thumbnail created: ${path.basename(thumbnailPath)}`);
  } catch (err) {
    console.error(`[Video] Failed to create thumbnail for ${relPath}:`, err);
  }

  const original = (await fs.stat(inputPath)).size;
  const converted = (await fs.stat(outputFile)).size;
  fileStats.push({
    original,
    converted,
    relPath: relPath.replace(path.extname(relPath), VIDEO_OUTPUT_EXTENSION),
  });
  // Realtime reporting
  const saved = original - converted;
  console.log(
    `[Video] ${relPath.replace(
      path.extname(relPath),
      VIDEO_OUTPUT_EXTENSION
    )}: ${formatSize(original)} -> ${formatSize(converted)} (saved ${formatSize(
      saved
    )})`
  );
}

async function createVideoThumbnail(videoPath: string, thumbnailPath: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      // Grab a frame at 2 seconds in, scale to width 400px
      .screenshots({
        timestamps: ["2"],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: "400x?",
      });
  });
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
