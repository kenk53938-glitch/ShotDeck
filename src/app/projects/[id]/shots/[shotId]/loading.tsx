import { Skeleton } from "@/components/Skeleton";
import { pageShellNarrow } from "@/lib/styles";

export default function Loading() {
  return (
    <div className={`${pageShellNarrow} flex flex-col gap-8`}>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-72" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
