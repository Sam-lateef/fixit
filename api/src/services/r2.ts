import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

function extFromMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic" || mimeType === "image/heif") return "heic";
  return "jpg";
}

function getClient(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const key = process.env.R2_ACCESS_KEY_ID?.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !key || !secret) return null;
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId: key, secretAccessKey: secret },
    forcePathStyle: true,
  });
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim() &&
      process.env.R2_PUBLIC_URL?.trim(),
  );
}

/**
 * Confirms the object is readable at the public URL (catches private bucket / wrong R2_PUBLIC_URL).
 */
export async function verifyPublicImageUrl(url: string): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (res.ok) return;
    if (res.status === 405) {
      res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: ctrl.signal,
        redirect: "follow",
      });
      if (res.ok || res.status === 206) return;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Photo uploaded but the public URL is not readable (403). In Cloudflare: R2 → your bucket → Settings → Public access — enable the r2.dev subdomain or a custom domain. Set R2_PUBLIC_URL to that HTTPS base (no trailing slash).",
      );
    }
    throw new Error(
      `Photo uploaded but public URL check failed (${res.status}). Verify R2_PUBLIC_URL and bucket public access.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchR2ObjectBuffer(
  key: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const client = getClient();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!client || !bucket || !isR2Configured()) {
    throw new Error("R2 not configured");
  }
  const out = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!out.Body) {
    throw new Error("Empty object body");
  }
  const buffer = Buffer.from(await out.Body.transformToByteArray());
  const contentType = out.ContentType ?? "application/octet-stream";
  return { buffer, contentType };
}

export type UploadPhotoOptions = {
  /** Used for LOCAL_UPLOAD_DIR URLs so phones get e.g. http://192.168.x.x:3000/uploads/… not localhost. */
  publicBaseUrl?: string;
};

export async function uploadPhoto(
  buffer: Buffer,
  mimeType: string,
  options?: UploadPhotoOptions,
): Promise<string> {
  const client = getClient();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (client && bucket && publicUrl) {
    const ext = extFromMime(mimeType);
    const objectKey = `posts/${randomUUID()}.${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    // Always use the direct R2 public URL — routing through API_URL (which may be
    // localhost:3000 in dev) would produce an unreachable URL on physical devices.
    const direct = `${publicUrl.replace(/\/$/, "")}/${objectKey}`;
    await verifyPublicImageUrl(direct);
    return direct;
  }

  const localDir = process.env.LOCAL_UPLOAD_DIR?.trim();
  if (!localDir) {
    throw new Error(
      "Upload storage is not configured. Set all R2_* variables (see api/.env.example) or LOCAL_UPLOAD_DIR.",
    );
  }
  const { mkdir, writeFile } = await import("fs/promises");
  const { join } = await import("path");
  await mkdir(localDir, { recursive: true });
  const ext = extFromMime(mimeType);
  const fileName = `${randomUUID()}.${ext}`;
  const full = join(localDir, fileName);
  await writeFile(full, buffer);
  const base =
    options?.publicBaseUrl?.trim().replace(/\/$/, "") ||
    process.env.API_PUBLIC_URL?.trim().replace(/\/$/, "") ||
    process.env.API_URL?.trim().replace(/\/$/, "") ||
    "";
  if (base.length === 0) {
    throw new Error(
      "LOCAL_UPLOAD_DIR is set but no public base URL: set API_PUBLIC_URL or API_URL, or ensure requests include a Host header.",
    );
  }
  return `${base}/uploads/${fileName}`;
}
