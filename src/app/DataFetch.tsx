import { getFile } from "~/lib/s3Client";
import { FileMeta } from "~/types";
import FileGrid from "./FileGrid";

export const dynamic = "force-dynamic";

export default async function DataFetch() {
  const { body } = await getFile("data.json");
  // Convert Uint8Array to string, then parse as JSON
  const data = JSON.parse(new TextDecoder().decode(body)) as FileMeta[];

  return <FileGrid files={data} />;
}
