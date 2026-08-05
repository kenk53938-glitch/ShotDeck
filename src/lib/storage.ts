import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

export const STORAGE_ROOT = resolve(process.cwd(), "storage");
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

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

export async function saveImageFile(
  file: File,
  directoryParts: string[],
  preferredName?: string,
) {
  if (file.size <= 0) throw new Error("The uploaded image is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 25 MB or smaller.");

  const safeName = sanitizeFileName(preferredName || file.name);
  if (!IMAGE_EXTENSIONS.has(extname(safeName).toLowerCase())) {
    throw new Error("Supported image formats: PNG, JPG, JPEG, WEBP, and GIF.");
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

export async function removeStorageFile(relativePath: string | null | undefined) {
  if (!relativePath || !relativePath.replaceAll("\\", "/").startsWith("storage/")) return;
  await rm(resolveStoragePath(relativePath), { force: true });
}
