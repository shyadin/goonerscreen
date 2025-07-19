import { deleteFile, getFile } from "../lib/s3Client";
import { FileMeta } from "../types";

import "dotenv/config";

async function main() {
  const { body } = await getFile("data.json");
  const data = JSON.parse(new TextDecoder().decode(body)) as FileMeta[];
  const mkvFiles = data.filter((file) => file.name.endsWith(".mkv"));

  for (const file of mkvFiles) {
    console.log(`Deleting: ${file.relativePath}`);
    await deleteFile(file.relativePath);
  }
  console.log(`Deleted ${mkvFiles.length} .mkv files.`);
}

main().catch((err) => {
  console.error("Error deleting mkv files:", err);
  process.exit(1);
});
