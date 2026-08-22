export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={[
        'rounded-lg bg-slate-200 dark:bg-slate-700',
        'motion-safe:animate-pulse-soft',
        className,
      ].join(' ')}
    />
  );
}

export function TableRowSkeleton({
  columns = 4,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 px-5"
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={
                columnIndex === 0
                  ? 'h-4 w-[200px]'
                  : columnIndex === columns - 1
                    ? 'h-4 w-[80px]'
                    : 'h-4 w-[120px]'
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="
        rounded-xl
        border border-slate-200
        bg-white
        p-5
        dark:border-slate-700
        dark:bg-slate-800
      "
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>

        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="space-y-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({
  columns = 4,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="space-y-6"
    >
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        <Skeleton className="h-10 w-32" />
      </div>

      <Skeleton className="h-10 w-full" />

      <div
        className="
          rounded-xl
          border border-slate-200
          bg-white
          p-4
          dark:border-slate-700
          dark:bg-slate-800
        "
      >
        <TableRowSkeleton
          columns={columns}
          rows={rows}
        />
      </div>
    </div>
  );
}
