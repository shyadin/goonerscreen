import { NextRequest } from "next/server";
import { fileExistsInBucket, getFile } from "~/lib/s3Client";

export async function GET(request: NextRequest) {
  console.log(request.nextUrl.pathname);

  const filename = decodeURIComponent(request.nextUrl.pathname).replace(
    "/asset/",
    ""
  );
  if (!filename) {
    console.log("No filename provided");
    return new Response("No filename provided", { status: 400 });
  }

  const fileExists = await fileExistsInBucket(filename);
  if (!fileExists) {
    console.log("File not found", filename);
    return new Response("File not found", { status: 404 });
  }

  const file = await getFile(filename);

  const buffer = Buffer.from(file.body);

  console.log(file.mimeType);

  return new Response(buffer, {
    headers: { "Content-Type": file.mimeType },
  });
}
