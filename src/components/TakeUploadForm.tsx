"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonPrimary, buttonSecondary, fieldBase, fieldLabel, selectCompact } from "@/lib/styles";

type MediaKind = "STILL" | "PREVIEW" | "FINAL";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-matroska";

export function TakeUploadForm({ shotId }: { shotId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaKind, setMediaKind] = useState<MediaKind>("STILL");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isVideo = mediaKind !== "STILL";

  function acceptFile(list: FileList | null) {
    const picked = list?.[0];
    if (!picked) return;
    setFile(picked);
    setError(null);
  }

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (file) formData.set("file", file);
      const response = await fetch(`/api/shots/${shotId}/takes`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Could not add the take.");
      setMessage(data.selected ? "Take added and selected." : "Take added.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the take.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      <label className={fieldLabel}>
        Take type
        <select
          name="mediaKind"
          value={mediaKind}
          onChange={(event) => {
            setMediaKind(event.target.value as MediaKind);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className={`mt-1.5 w-fit ${selectCompact}`}
        >
          <option value="STILL">Still image</option>
          <option value="PREVIEW">Preview video (animation stage)</option>
          <option value="FINAL">Final upscaled video</option>
        </select>
      </label>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          acceptFile(event.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <label className={`inline-flex cursor-pointer ${buttonSecondary}`}>
          Choose {isVideo ? "video" : "image"}
          <input
            ref={fileInputRef}
            type="file"
            accept={isVideo ? VIDEO_ACCEPT : IMAGE_ACCEPT}
            onChange={(event) => acceptFile(event.target.files)}
            className="sr-only"
          />
        </label>
        <p className="mt-2 text-xs text-zinc-400">or drag and drop a file here</p>
        {file && (
          <p className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {file.name}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowUrlFallback((current) => !current)}
        className="w-fit text-xs text-zinc-500 underline transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {showUrlFallback
          ? "Hide advanced option"
          : "Already have a file organized elsewhere? Paste a path instead."}
      </button>
      {showUrlFallback && (
        <label className={fieldLabel}>
          File URL / path (advanced fallback)
          <input
            name="fileUrl"
            placeholder="e.g. E:\renders\shot01.png"
            className={`${fieldBase} mt-1.5`}
          />
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={fieldLabel}>
          Model
          <input name="model" placeholder="e.g. ChatGPT Image" className={`${fieldBase} mt-1.5`} />
        </label>
        <label className={fieldLabel}>
          Seed
          <input name="seed" className={`${fieldBase} mt-1.5`} />
        </label>
        <label className={fieldLabel}>
          Notes
          <input name="notes" className={`${fieldBase} mt-1.5`} />
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}

      <button type="submit" disabled={pending} className={`w-fit ${buttonPrimary}`}>
        {pending ? "Adding…" : "Add take"}
      </button>
    </form>
  );
}
