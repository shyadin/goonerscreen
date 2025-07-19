import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import "dotenv/config";

export const s3Client = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function fileExistsInBucket(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: "goonerscreen",
        Key: key,
      })
    );
    return true;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "$metadata" in err &&
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 404
    ) {
      return false;
    }
    // If it's another error, rethrow
    throw err;
  }
}

export async function getFile(
  key: string
): Promise<{ body: Uint8Array; mimeType: string }> {
  const { Body, ContentType } = await s3Client.send(
    new GetObjectCommand({
      Bucket: "goonerscreen",
      Key: key,
    })
  );

  if (!Body || !ContentType) {
    throw new Error("File not found");
  }

  const body = await Body.transformToByteArray();

  return { body, mimeType: ContentType };
}

export async function uploadFileIfNotExists(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const exists = await fileExistsInBucket(key);
  if (exists) return;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: "goonerscreen",
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
}

export async function deleteFile(key: string) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: "goonerscreen",
      Key: key,
    })
  );
}
