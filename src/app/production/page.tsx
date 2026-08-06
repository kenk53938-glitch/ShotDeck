import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cardPadded, pageShell, sectionLabel } from "@/lib/styles";

export default async function ProductionHome() {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { shots: true } } } });
  return <main className={`${pageShell} flex flex-col gap-8`}><header><h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Production pipeline</h1><p className="mt-2 text-zinc-500 dark:text-zinc-400">Generate prompts, export approved shots, and queue WAN/ComfyUI jobs.</p></header><section className="flex flex-col gap-3"><h2 className={sectionLabel}>Projects</h2>{projects.map((project) => <Link key={project.id} href={`/production/${project.id}`} className={`${cardPadded} flex items-center justify-between hover:shadow-md`}><div><div className="font-medium text-zinc-900 dark:text-zinc-50">{project.title}</div><div className="text-sm text-zinc-500">{project._count.shots} shots</div></div><span className="text-sm text-indigo-600 dark:text-indigo-400">Open →</span></Link>)}</section></main>;
}
