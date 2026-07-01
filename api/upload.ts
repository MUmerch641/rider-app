import axios from "axios";
import { API_BASE_URL } from "./config";
import { ENDPOINTS } from "./endpoints";
import { tokenStorage } from "@/utils/storage";
import type { Envelope, UploadResponse } from "./types";

// Uploads take longer than the default 15s API timeout.
const UPLOAD_TIMEOUT_MS = 30_000;

/** Map a file extension to an image mime type (best-effort). */
const mimeFromName = (filename: string): string => {
  const match = /\.(\w+)$/.exec(filename);
  if (!match) return "image/jpeg";
  const ext = match[1].toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/jpeg";
  return `image/${ext}`;
};

export type UploadAssetMeta = {
  fileName?: string | null;
  mimeType?: string | null;
};

function buildUploadPart(
  fileUri: string,
  asset?: UploadAssetMeta,
): { uri: string; name: string; type: string } {
  const rawName = asset?.fileName?.trim() || fileUri.split("/").pop() || "upload.jpg";
  const name = rawName.includes(".") ? rawName : `${rawName}.jpg`;
  const type = asset?.mimeType?.startsWith("image/")
    ? asset.mimeType === "image/heic" || asset.mimeType === "image/heif"
      ? "image/jpeg"
      : asset.mimeType
    : mimeFromName(name);
  return { uri: fileUri, name, type };
}

export const uploadApi = {
  /**
   * Upload a local file to POST /api/v1/driver/upload (multipart/form-data →
   * MinIO) and return the public URL. `type` is the storage folder.
   *
   * Uses a bare axios call (not `apiClient`) because the shared instance
   * defaults to `Content-Type: application/json`.
   */
  async uploadFile(
    fileUri: string,
    type: "avatars" | "general" | "support" = "general",
    asset?: UploadAssetMeta,
  ): Promise<UploadResponse> {
    const token = await tokenStorage.getAccessToken();
    const part = buildUploadPart(fileUri, asset);

    const formData = new FormData();
    // React Native FormData file part — not a web File, hence the cast.
    formData.append("file", part as unknown as Blob);
    formData.append("type", type);

    const res = await axios.post<Envelope<UploadResponse>>(
      `${API_BASE_URL}${ENDPOINTS.upload}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: UPLOAD_TIMEOUT_MS,
      },
    );

    const env = res.data;
    if (!env?.success || !env.data?.url) {
      throw new Error(env?.message ?? "Upload failed");
    }
    return env.data;
  },
};
