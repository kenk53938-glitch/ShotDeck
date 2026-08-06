"use client";

import { useState } from "react";

export function TakeMedia({
  take,
  className,
  controls = true,
}: {
  take: {
    fileUrl: string | null;
    mediaKind: string | null;
    originalFileName: string | null;
  };
  className?: string;
  controls?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const isVideo = take.mediaKind === "PREVIEW" || take.mediaKind === "FINAL";
  const base = className ?? "h-full w-full object-cover";

  if (!take.fileUrl || broken) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 text-center text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 ${base}`}
      >
        {take.fileUrl ? "File not found" : "No file attached"}
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={take.fileUrl}
        controls={controls}
        muted={!controls}
        preload="metadata"
        className={base}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={take.fileUrl}
      alt={take.originalFileName ?? "Take preview"}
      className={base}
      onError={() => setBroken(true)}
    />
  );
}
