import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

// Card skeleton for grid views
export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn(
    "bg-card border border-border rounded-xl overflow-hidden animate-pulse",
    className
  )}>
    {/* Image placeholder with aspect ratio */}
    <div className="relative aspect-[3/4] bg-muted">
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10" />
    </div>
    
    {/* Content */}
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex justify-between items-end pt-2">
        <div className="space-y-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ columns = 7 }: { columns?: number }) => (
  <tr className="border-b border-border/50 animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton className={cn(
          "h-4",
          i === 0 ? "w-8" : // Rank
          i === 1 ? "w-40" : // Name
          i === 2 ? "w-20" : // Price
          "w-16"
        )} />
      </td>
    ))}
  </tr>
);

// Chart skeleton
export const ChartSkeleton = ({ className }: { className?: string }) => (
  <div className={cn(
    "relative h-48 bg-muted/30 rounded-lg overflow-hidden animate-pulse",
    className
  )}>
    <div className="absolute inset-0 flex items-end justify-around gap-1 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={i}
          className="bg-muted rounded-t w-full"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
    <div className="absolute top-4 left-4 space-y-2">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

// List item skeleton
export const ListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 animate-pulse">
    <Skeleton className="w-12 h-12 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-5 w-16" />
  </div>
);

// Grid of card skeletons
export const CardGridSkeleton = ({ 
  count = 8, 
  className 
}: { 
  count?: number; 
  className?: string;
}) => (
  <div className={cn(
    "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
    className
  )}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Table skeleton
export const TableSkeleton = ({ 
  rows = 10, 
  columns = 7 
}: { 
  rows?: number; 
  columns?: number;
}) => (
  <div className="rounded-lg border border-border overflow-hidden">
    {/* Header */}
    <div className="bg-secondary/30 px-4 py-3 border-b border-border flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-16" />
      ))}
    </div>
    {/* Rows */}
    <div className="divide-y divide-border/50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className={cn(
              "h-4",
              j === 0 ? "w-8" : j === 1 ? "w-40" : "w-16"
            )} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Stats skeleton
export const StatsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-4 rounded-lg bg-card border border-border animate-pulse">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-8 w-24" />
      </div>
    ))}
  </div>
);
