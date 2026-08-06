"use client";

import { useState } from "react";
import { buttonSecondarySm, selectCompact } from "@/lib/styles";

export function TakeRatingControl({
  takeId,
  shotId,
  initialRating,
}: {
  takeId: string;
  shotId: string;
  initialRating: number | null;
}) {
  const [rating, setRating] = useState(initialRating == null ? "" : String(initialRating));
  const [savedRating, setSavedRating] = useState(rating);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = rating !== savedRating;

  async function save() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/takes/${takeId}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId, rating }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Could not save the rating.");
      const next = data.rating == null ? "" : String(data.rating);
      setRating(next);
      setSavedRating(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the rating.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-zinc-500 dark:text-zinc-400">
        Rating
        <select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          disabled={pending}
          className={`ml-2 ${selectCompact}`}
          aria-label={`Rating for take ${takeId}`}
        >
          <option value="">—</option>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>{value}/10</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={save} disabled={pending || !dirty} className={buttonSecondarySm}>
        {pending ? "Saving…" : "Save rating"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
