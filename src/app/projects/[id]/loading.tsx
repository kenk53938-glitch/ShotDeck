import { Skeleton } from "@/components/Skeleton";
import { pageShellWide } from "@/lib/styles";

export default function Loading() {
  return (
    <div className={`${pageShellWide} gap-8`}>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-zinc-100/60 p-3 dark:bg-zinc-900/40">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
