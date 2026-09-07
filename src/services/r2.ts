import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string
  }
});

const BUCKET = process.env.R2_BUCKET_NAME as string;

/**
 * Uploads a buffer to R2 and returns the object key it was stored under.
 * Key is prefixed with a UUID so two uploads with the same filename never collide.
 */
export async function uploadToR2(
  buffer: Buffer,
  originalFileName: string,
  mimeType: string
): Promise<string> {
  const key = `${uuidv4()}-${originalFileName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    })
  );

  return key;
}

/**
 * Downloads an object from R2 as a Buffer.
 * Used at verification time — we re-fetch the stored copy and re-hash it
 * to confirm it still matches what was recorded at intake.
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const result = await r2.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    })
  );

  const stream = result.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
