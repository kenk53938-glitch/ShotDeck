import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductionProjectPanel } from "@/components/ProductionProjectPanel";
import { pageShellWide } from "@/lib/styles";

export default async function ProductionProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { shots: { orderBy: { order: "asc" }, include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } } } } });
  if (!project) notFound();
  return <main className={`${pageShellWide} flex flex-col gap-8`}><header><Link href="/production" className="text-sm text-zinc-500 hover:text-zinc-900">← Production</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{project.title}</h1></header><ProductionProjectPanel project={project} /></main>;
}
