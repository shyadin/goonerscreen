import { NextRequest } from "next/server";
import { fileExistsInBucket, getFile } from "~/lib/s3Client";

export async function GET(request: NextRequest) {
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

  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": file.body.length.toString(),
      "Content-Disposition": `inline; filename="${filename}"`,
      "Accept-Ranges": "bytes",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
