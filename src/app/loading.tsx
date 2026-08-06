import { Skeleton } from "@/components/Skeleton";
import { pageShell } from "@/lib/styles";

export default function Loading() {
  return (
    <div className={`${pageShell} flex flex-col gap-10`}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
