import { Skeleton } from "@/components/Skeleton";
import { pageShellNarrow } from "@/lib/styles";

export default function Loading() {
  return (
    <div className={`${pageShellNarrow} flex flex-col gap-8`}>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
