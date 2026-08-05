import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
import { resolveStoragePath } from "@/lib/storage";

function contentType(path: string) {
  switch (extname(path).toLowerCase()) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".mp4": return "video/mp4";
    case ".webm": return "video/webm";
    case ".csv": return "text/csv; charset=utf-8";
    default: return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const relativePath = join(...path.map(decodeURIComponent));
    const fullPath = resolveStoragePath(relativePath);
    const details = await stat(fullPath);
    if (!details.isFile()) return new NextResponse("Not found", { status: 404 });
    const data = await readFile(fullPath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType(fullPath),
        "Content-Length": String(data.byteLength),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
