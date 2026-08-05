import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReviewBoard } from "@/components/ReviewBoard";
import { linkMuted, pageShellWide } from "@/lib/styles";

export default async function ProjectReviewPage({ params }: PageProps<"/projects/[id]/review">) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      shots: {
        orderBy: { order: "asc" },
        include: {
          takes: {
            where: { OR: [{ mediaKind: "STILL" }, { mediaKind: null }] },
            orderBy: [{ isSelected: "desc" }, { versionNumber: "desc" }],
          },
        },
      },
    },
  });
  if (!project) notFound();
  const serialized = project.shots.map((shot) => ({ ...shot, takes: shot.takes.map((take) => ({ ...take, createdAt: take.createdAt.toISOString() })) }));
  return <div className={`${pageShellWide} gap-8`}><header><Link href={`/projects/${id}`} className={linkMuted}>← {project.title}</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Still image review</h1><p className="mt-2 text-zinc-500 dark:text-zinc-400">Upload, match, compare, select, and approve still images before WAN animation.</p></header><ReviewBoard projectId={id} shots={serialized} /></div>;
}
