import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

export const STORAGE_ROOT = resolve(process.cwd(), "storage");
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".mkv"]);

export type MediaKind = "image" | "video";

export function sanitizeFileName(name: string) {
  const extension = extname(name).toLowerCase();
  const stem = name
    .slice(0, name.length - extension.length)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "file";
  return `${stem}${extension}`;
}

export function storageRelativePath(...parts: string[]) {
  return join("storage", ...parts).replaceAll("\\", "/");
}

export function mediaUrl(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
  return `/api/media/${normalized.split("/").map(encodeURIComponent).join("/")}`;
}

export function resolveStoragePath(relativePath: string) {
  const fullPath = resolve(process.cwd(), relativePath.replace(/^\/+/, ""));
  const rootWithSeparator = `${STORAGE_ROOT}${sep}`;
  if (fullPath !== STORAGE_ROOT && !fullPath.startsWith(rootWithSeparator)) {
    throw new Error("Invalid storage path.");
  }
  return fullPath;
}

export async function saveMediaFile(
  file: File,
  directoryParts: string[],
  preferredName?: string,
  kind: MediaKind = "image",
) {
  const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const allowedExtensions = kind === "video" ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
  const label = kind === "video" ? "video" : "image";

  if (file.size <= 0) throw new Error(`The uploaded ${label} is empty.`);
  if (file.size > maxBytes) {
    throw new Error(
      `${label === "video" ? "Videos" : "Images"} must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`,
    );
  }

  const safeName = sanitizeFileName(preferredName || file.name);
  if (!allowedExtensions.has(extname(safeName).toLowerCase())) {
    const formats =
      kind === "video"
        ? "MP4, WEBM, MOV, and MKV"
        : "PNG, JPG, JPEG, WEBP, and GIF";
    throw new Error(`Supported ${label} formats: ${formats}.`);
  }

  const directory = resolve(STORAGE_ROOT, ...directoryParts);
  if (!directory.startsWith(STORAGE_ROOT)) throw new Error("Invalid upload directory.");
  await mkdir(directory, { recursive: true });

  const uniqueName = `${Date.now()}_${safeName}`;
  const fullPath = join(directory, uniqueName);
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));
  const relativePath = relative(process.cwd(), fullPath).replaceAll("\\", "/");
  return { fullPath, relativePath, url: mediaUrl(relativePath), fileName: uniqueName };
}

/** @deprecated Use saveMediaFile(file, dir, name, "image") — kept for existing callers. */
export async function saveImageFile(
  file: File,
  directoryParts: string[],
  preferredName?: string,
) {
  return saveMediaFile(file, directoryParts, preferredName, "image");
}

export async function removeStorageFile(relativePath: string | null | undefined) {
  if (!relativePath || !relativePath.replaceAll("\\", "/").startsWith("storage/")) return;
  await rm(resolveStoragePath(relativePath), { force: true });
}
