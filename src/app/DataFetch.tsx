import { getFile } from "~/lib/s3Client";
import { AccessList, FileMeta } from "~/types";
import FileGrid from "./FileGrid";
import Papa from "papaparse";
import { auth } from "~/server/auth/config";

export const dynamic = "force-dynamic";

export default async function DataFetch() {
  const session = await auth();
  const { body: content } = await getFile("content.csv");
  const { body: access } = await getFile("access.csv");
  // Convert Uint8Array to string, then parse as JSON
  const data = Papa.parse(new TextDecoder().decode(content), {
    header: true,
  });

  const accessList = Papa.parse(new TextDecoder().decode(access), {
    header: true,
  });

  const userAccess = (accessList.data as AccessList[]).find(
    (v) => v.email === session?.user?.email
  );

  const sets = (userAccess?.["available sets"].split(",") ?? []).map((v) =>
    v.trim()
  );

  const files = (data.data as FileMeta[]).filter((v) => sets.includes(v.set));

  return <FileGrid files={files} />;
}
