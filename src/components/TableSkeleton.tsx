import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 p-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={c === 0 ? "h-4 w-40" : "h-4 flex-1"} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TreeSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${(i % 3) * 20}px` }}>
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6, height = "h-40" }: { count?: number; height?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full rounded-[var(--radius-card)]`} />
      ))}
    </div>
  );
}
