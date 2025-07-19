import path from "path";
import fs from "fs/promises";
import mime from "mime";
import { uploadFileIfNotExists } from "~/lib/s3Client";
import { FileMeta } from "~/types";

const SOURCE_DIR = path.resolve(
  process.env.HOME || "~",
  "Downloads/Converted Content"
);
const DATA_JSON = path.join(SOURCE_DIR, "data.json");

async function walkDir(dir: string, baseDir: string): Promise<FileMeta[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files: FileMeta[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      files = files.concat(await walkDir(fullPath, baseDir));
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      files.push({
        name: entry.name,
        relativePath: relPath.replace(/\\/g, "/"),
        fullPath,
        size: stat.size,
        mtime: stat.mtime,
        mimeType: mime.getType(fullPath) || "application/octet-stream",
      });
    }
  }
  return files;
}

async function main() {
  const files = await walkDir(SOURCE_DIR, SOURCE_DIR);
  console.log(`Found ${files.length} files.`);

  for (const file of files) {
    const buffer = await fs.readFile(file.fullPath);
    await uploadFileIfNotExists(file.relativePath, buffer, file.mimeType);
    console.log(`Uploaded: ${file.relativePath}`);
  }

  // Write data.json
  const data = files.map(({ fullPath, ...rest }) => rest);
  await fs.writeFile(DATA_JSON, JSON.stringify(data, null, 2));
  console.log(`Wrote data.json with ${data.length} entries.`);

  // Upload data.json to R2
  const dataBuffer = await fs.readFile(DATA_JSON);
  await uploadFileIfNotExists("data.json", dataBuffer, "application/json");
  console.log("Uploaded data.json to R2.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
