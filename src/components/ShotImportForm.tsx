"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonPrimary, card, chip, fieldBase, sectionLabel } from "@/lib/styles";

type ImportReport = {
  parser: "ai" | "rule-based";
  fellBack: boolean;
  successes: { shotLabel: string; title: string; shotId: string; order: number }[];
  failures: { shotLabel: string; reason: string }[];
  warnings: string[];
};

export function ShotImportForm({ projectId, aiEnabled }: { projectId: string; aiEnabled: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className={sectionLabel}>Import shots</h2><span className={chip}>Rule-based by default</span></div>
    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">Paste or upload the documented <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Shot XX:</code> / <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Prompt:</code> format. Enable AI parsing only for messier input. Every created and rejected shot is reported below.</p>
    <form ref={formRef} onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setError(null); setReport(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/import-shots`, { method: "POST", body: new FormData(event.currentTarget) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error ?? "Import failed.");
        setReport(data);
        if (data.successes.length > 0) {
          formRef.current?.reset();
          router.refresh();
        }
      } catch (caught) { setError(caught instanceof Error ? caught.message : "Import failed."); }
      finally { setPending(false); }
    }} className="flex flex-col gap-3">
      <textarea name="text" rows={7} placeholder={"Shot 01: Opening reaction\nDuration: 3\nPrompt: A gender-neutral chibi bear mascot looks toward a glowing photo...\nNegative Prompt: no hair, no extra characters"} className={`${fieldBase} font-mono`} />
      <div className="flex flex-wrap items-center gap-4"><input type="file" name="file" accept=".txt,.md,text/plain,text/markdown" className="text-sm text-zinc-600 dark:text-zinc-400" />{aiEnabled ? <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><input type="checkbox" name="useAi" value="true" /> Use AI-assisted parsing</label> : <p className="text-xs text-zinc-500">For messy scripts, configure a provider in <Link href="/settings" className="underline">Settings</Link>.</p>}<button disabled={pending} className={buttonPrimary}>{pending ? "Importing…" : "Import shots"}</button></div>
    </form>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
    {report && <div className="grid gap-3 md:grid-cols-2"><div className={`${card} p-4`}><h3 className="font-medium text-emerald-700 dark:text-emerald-400">Created ({report.successes.length})</h3>{report.successes.length ? <ul className="mt-2 max-h-56 overflow-auto text-xs text-zinc-600 dark:text-zinc-400">{report.successes.map((item) => <li key={item.shotId}>#{item.order} · {item.title}</li>)}</ul> : <p className="mt-2 text-xs text-zinc-500">No shots were created.</p>}</div><div className={`${card} p-4`}><h3 className="font-medium text-red-700 dark:text-red-400">Rejected / warnings ({report.failures.length + report.warnings.length})</h3>{report.failures.length + report.warnings.length ? <ul className="mt-2 max-h-56 overflow-auto text-xs text-zinc-600 dark:text-zinc-400">{report.failures.map((item, index) => <li key={`failure-${index}`}><strong>Shot {item.shotLabel}:</strong> {item.reason}</li>)}{report.warnings.map((warning, index) => <li key={`warning-${index}`}>{warning}</li>)}</ul> : <p className="mt-2 text-xs text-zinc-500">No rejected shots or parser warnings.</p>}</div><p className="text-xs text-zinc-500 md:col-span-2">Parser used: {report.parser}{report.fellBack ? " (AI failed; rule-based fallback succeeded)" : ""}.</p></div>}
  </div>;
}
