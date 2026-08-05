"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buttonPrimary, buttonSecondary, card, cardPadded, sectionLabel } from "@/lib/styles";

type Take = { id: string; versionNumber: number; fileUrl: string | null; localPath: string | null; originalFileName: string | null; status: string; isSelected: boolean; createdAt: string };
type Shot = { id: string; order: number; title: string | null; status: string; sourceImagePath: string | null; takes: Take[] };
type UploadReport = { matched: { fileName: string; shotOrder: number; shotTitle: string | null }[]; missing: { shotOrder: number; shotTitle: string | null }[]; duplicates: { shotOrder: number; files: string[] }[]; unmatched: { fileName: string; reason: string }[]; errors: { fileName: string; error: string }[] };

export function ReviewBoard({ projectId, shots }: { projectId: string; shots: Shot[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<UploadReport | null>(null);
  const allSelected = shots.length > 0 && selected.size === shots.length;
  const selectedCount = selected.size;

  const selectedShots = useMemo(() => shots.filter((shot) => selected.has(shot.id)), [selected, shots]);
  function setChosenFiles(list: FileList | File[]) { setFiles(Array.from(list).filter((file) => /^image\//.test(file.type) || /\.(png|jpe?g|webp|gif)$/i.test(file.name))); setReport(null); setMessage(null); setError(null); }
  function toggle(shotId: string) { setSelected((current) => { const next = new Set(current); if (next.has(shotId)) next.delete(shotId); else next.add(shotId); return next; }); }

  async function upload() {
    if (!files.length) { setError("Choose or drop one or more images first."); return; }
    setBusy("upload"); setError(null); setMessage(null);
    try {
      const formData = new FormData(); files.forEach((file) => formData.append("files", file));
      const response = await fetch(`/api/projects/${projectId}/images`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Upload failed.");
      setReport(data.report); setMessage(`Processed ${files.length} image(s). Review the matching report below.`); setFiles([]); if (inputRef.current) inputRef.current.value = "";
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed."); }
    finally { setBusy(null); }
  }

  async function bulkReview(action: "approve" | "rework") {
    if (!selectedCount) { setError("Select at least one shot."); return; }
    setBusy(action); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/review`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, shotIds: [...selected] }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Review update failed.");
      setMessage(`${data.updated} shot(s) marked ${action === "approve" ? "Approved" : "Needs Rework"}.`); setSelected(new Set()); window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Review update failed."); setBusy(null); }
  }

  async function selectTake(takeId: string, shotId: string) {
    setBusy(`take:${takeId}`); setError(null);
    try {
      const response = await fetch(`/api/takes/${takeId}/select`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shotId }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Could not select this take.");
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not select this take."); setBusy(null); }
  }

  return <div className="flex flex-col gap-8">
    <section className={cardPadded}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className={sectionLabel}>Bulk still-image intake</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Drop all ChatGPT stills together. Names such as shot_01.png, shot01_s1.png, and shot1,s2.png are matched automatically.</p></div><button type="button" disabled={busy !== null || !files.length} onClick={upload} className={buttonPrimary}>{busy === "upload" ? "Uploading…" : `Upload ${files.length || ""} image${files.length === 1 ? "" : "s"}`}</button></div>
      <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); setChosenFiles(event.dataTransfer.files); }} className={`mt-4 rounded-xl border-2 border-dashed p-7 text-center transition ${dragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-zinc-300 dark:border-zinc-700"}`}><input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => event.target.files && setChosenFiles(event.target.files)} className="mx-auto block text-sm text-zinc-600 dark:text-zinc-400" /><p className="mt-2 text-xs text-zinc-400">Choose multiple files or drag a folder selection from Explorer/Finder.</p>{files.length > 0 && <p className="mt-3 text-sm font-medium text-indigo-600">{files.length} image(s) ready</p>}</div>
      {message && <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}{error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {report && <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950"><h3 className="font-medium text-emerald-800 dark:text-emerald-300">Matched ({report.matched.length})</h3><ul className="mt-2 max-h-40 overflow-auto text-xs text-emerald-700 dark:text-emerald-400">{report.matched.map((item, index) => <li key={`${item.fileName}-${index}`}>Shot {item.shotOrder}: {item.fileName}</li>)}</ul></div><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950"><h3 className="font-medium text-amber-800 dark:text-amber-300">Missing ({report.missing.length})</h3><ul className="mt-2 max-h-40 overflow-auto text-xs text-amber-700 dark:text-amber-400">{report.missing.map((item) => <li key={item.shotOrder}>Shot {item.shotOrder}: {item.shotTitle ?? "Untitled"}</li>)}</ul></div><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950"><h3 className="font-medium text-blue-800 dark:text-blue-300">Duplicate matches ({report.duplicates.length})</h3><ul className="mt-2 max-h-40 overflow-auto text-xs text-blue-700 dark:text-blue-400">{report.duplicates.map((item) => <li key={item.shotOrder}>Shot {item.shotOrder}: {item.files.join(", ")}</li>)}</ul></div><div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"><h3 className="font-medium text-red-800 dark:text-red-300">Unmatched / errors ({report.unmatched.length + report.errors.length})</h3><ul className="mt-2 max-h-40 overflow-auto text-xs text-red-700 dark:text-red-400">{report.unmatched.map((item) => <li key={item.fileName}>{item.fileName}: {item.reason}</li>)}{report.errors.map((item) => <li key={item.fileName}>{item.fileName}: {item.error}</li>)}</ul></div></div>}
    </section>

    <section><div className="sticky top-14 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(shots.map((shot) => shot.id)))} /> Select all {shots.length}</label><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-zinc-500">{selectedCount} selected{selectedShots.length > 0 ? ` · ${selectedShots.filter((shot) => shot.sourceImagePath).length} with images` : ""}</span><button type="button" disabled={busy !== null || !selectedCount} onClick={() => bulkReview("approve")} className={buttonPrimary}>{busy === "approve" ? "Approving…" : "Approve selected"}</button><button type="button" disabled={busy !== null || !selectedCount} onClick={() => bulkReview("rework")} className={buttonSecondary}>{busy === "rework" ? "Updating…" : "Needs rework"}</button></div></div>
      {shots.length === 0 ? <div className={cardPadded}><p className="text-sm text-zinc-500">No shots yet. Return to the project and import your script first.</p></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shots.map((shot) => { const selectedTake = shot.takes.find((take) => take.isSelected) ?? shot.takes[0]; const source = selectedTake?.fileUrl ?? shot.sourceImagePath; return <article key={shot.id} className={`${card} overflow-hidden`}><div className="relative flex aspect-video items-center justify-center bg-zinc-100 dark:bg-zinc-950">{source ? <img src={source} alt={shot.title ?? `Shot ${shot.order}`} className="h-full w-full object-contain" /> : <div className="text-sm text-zinc-400">No still uploaded</div>}<label className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 shadow dark:bg-zinc-900/90"><input type="checkbox" checked={selected.has(shot.id)} onChange={() => toggle(shot.id)} aria-label={`Select shot ${shot.order}`} /></label><span className="absolute right-3 top-3 rounded-full bg-zinc-950/75 px-2 py-1 text-xs text-white">{shot.status.replaceAll("_", " ")}</span></div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-medium text-zinc-900 dark:text-zinc-50">{String(shot.order).padStart(2, "0")} · {shot.title ?? "Untitled"}</h3><p className="mt-1 text-xs text-zinc-500">{shot.takes.length} still take(s)</p></div><Link href={`/projects/${projectId}/shots/${shot.id}`} className="text-xs text-indigo-600 hover:underline">Open</Link></div>{shot.takes.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{shot.takes.map((take) => <button key={take.id} type="button" disabled={busy !== null} onClick={() => selectTake(take.id, shot.id)} className={`shrink-0 rounded-lg border p-1 ${take.isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-zinc-200 dark:border-zinc-700"}`} title={`Select take ${take.versionNumber}`}><img src={take.fileUrl ?? ""} alt={`Take ${take.versionNumber}`} className="h-14 w-20 rounded object-cover" /><span className="block pt-1 text-[10px]">Take {take.versionNumber}</span></button>)}</div>}</div></article>; })}</div>}
    </section>
  </div>;
}
