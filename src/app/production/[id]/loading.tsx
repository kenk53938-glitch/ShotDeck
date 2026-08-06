import { Skeleton } from "@/components/Skeleton";
import { pageShellWide } from "@/lib/styles";

export default function Loading() {
  return (
    <div className={`${pageShellWide} flex flex-col gap-8`}>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
