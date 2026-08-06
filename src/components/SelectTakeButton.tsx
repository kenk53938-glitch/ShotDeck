"use client";

import { useState } from "react";
import { buttonSecondarySm } from "@/lib/styles";

export function SelectTakeButton({ takeId, shotId }: { takeId: string; shotId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="flex flex-col items-end gap-1"><button type="button" disabled={pending} onClick={async () => {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/takes/${takeId}/select`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shotId }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Selection failed.");
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Selection failed."); setPending(false); }
  }} className={buttonSecondarySm}>{pending ? "Selecting…" : "Select"}</button>{error && <span className="max-w-48 text-right text-[10px] text-red-600">{error}</span>}</div>;
}
