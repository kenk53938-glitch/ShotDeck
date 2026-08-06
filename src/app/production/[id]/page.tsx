import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductionProjectPanel } from "@/components/ProductionProjectPanel";
import { linkMuted, pageShellWide } from "@/lib/styles";

type ProductionProjectPageProps = { params: Promise<{ id: string }> };

export default async function ProductionProjectPage({ params }: ProductionProjectPageProps) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      shots: {
        orderBy: { order: "asc" },
        include: {
          jobs: { orderBy: { createdAt: "desc" }, take: 5 },
          takes: {
            where: { mediaKind: { in: ["PREVIEW", "FINAL"] } },
            orderBy: { versionNumber: "desc" },
            take: 8,
          },
        },
      },
    },
  });
  if (!project) notFound();
  const serialized = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    shots: project.shots.map((shot) => ({
      ...shot,
      createdAt: shot.createdAt.toISOString(),
      updatedAt: shot.updatedAt.toISOString(),
      jobs: shot.jobs.map((job) => ({
        ...job,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
        lastCheckedAt: job.lastCheckedAt?.toISOString() ?? null,
      })),
      takes: shot.takes.map((take) => ({
        ...take,
        createdAt: take.createdAt.toISOString(),
      })),
    })),
  };
  return <main className={`${pageShellWide} flex flex-col gap-8`}><header><Link href={`/projects/${id}`} className={linkMuted}>← {project.title}</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Production dashboard</h1><p className="mt-2 text-zinc-500 dark:text-zinc-400">Queue WAN previews, monitor local ComfyUI, approve motion, upscale finals, and organize delivery files.</p></header><ProductionProjectPanel project={serialized} /></main>;
}
