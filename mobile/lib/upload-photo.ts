import {
  getApiBaseUrl,
  getApiTunnelMisconfigMessage,
  getPhysicalDeviceApiMisconfigMessage,
  parseApiResponseBody,
} from "./api-base";
import { getToken } from "./auth-storage";
import { shopDevLog, shopDevSummarizeUrl } from "./shop-profile-debug";

function normalizeImageMime(hint: string | null | undefined): string | null {
  if (!hint || typeof hint !== "string") {
    return null;
  }
  const m = hint.trim().toLowerCase();
  if (!m.startsWith("image/")) {
    return null;
  }
  if (m === "image/jpg") {
    return "image/jpeg";
  }
  return m;
}

function mimeFromUri(uri: string): string | null {
  const lower = uri.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function resolveUploadMime(uri: string, mimeTypeHint: string | null | undefined): string {
  return (
    normalizeImageMime(mimeTypeHint) ??
    mimeFromUri(uri) ??
    "image/jpeg"
  );
}

function fileNameForMime(mime: string): string {
  if (mime === "image/png") return "photo.png";
  if (mime === "image/webp") return "photo.webp";
  if (mime === "image/heic" || mime === "image/heif") return "photo.heic";
  return "photo.jpg";
}

export type UploadPhotoUriOptions = {
  mimeType?: string | null;
};

/**
 * Uploads a local image URI to POST /api/v1/uploads/photo. Returns public URL.
 * Pass `mimeType` from ImagePicker when available so the server sees the real type
 * (Android/iOS often return PNG/WebP/HEIC while the URI has no file extension).
 */
export async function uploadPhotoUri(
  uri: string,
  options?: UploadPhotoUriOptions,
): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error("Not logged in");
  }
  const base = getApiBaseUrl();
  const physicalMsg = getPhysicalDeviceApiMisconfigMessage(base);
  if (physicalMsg) {
    throw new Error(physicalMsg);
  }
  const tunnelMsg = getApiTunnelMisconfigMessage(base);
  if (tunnelMsg) {
    throw new Error(tunnelMsg);
  }
  const uploadUrl = `${base}/api/v1/uploads/photo`;
  const mime = resolveUploadMime(uri, options?.mimeType);
  shopDevLog("uploadPhoto start", {
    mime,
    pickerMimeHint: options?.mimeType ?? "(none)",
    uriTail: uri.length > 48 ? `…${uri.slice(-48)}` : uri,
  });
  const form = new FormData();
  form.append("photo", {
    uri,
    name: fileNameForMime(mime),
    type: mime,
  } as unknown as Blob);
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  const data = (parseApiResponseBody(text, uploadUrl) ?? {}) as {
    url?: string;
    error?: string;
  };
  shopDevLog("uploadPhoto response", {
    httpStatus: res.status,
    ok: res.ok,
    bodySnippet: text.slice(0, 200),
  });
  if (!res.ok) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  if (!data.url) {
    throw new Error("No url in upload response");
  }
  shopDevLog("uploadPhoto success", { publicUrl: shopDevSummarizeUrl(data.url) });
  return data.url;
}
