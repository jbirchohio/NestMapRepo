import { cn } from "@/lib/utils";

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
    </div>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-2/3"></div>
    </div>
  );
}

export function ActivityListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded dark:bg-gray-700 w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TemplateGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
          <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
          <div className="p-4">
            <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-2/3"></div>
            <div className="mt-4 flex justify-between items-center">
              <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-20"></div>
              <div className="h-8 bg-gray-200 rounded dark:bg-gray-700 w-24"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <div className="animate-pulse">
        {/* Header */}
        <div className="border-b">
          <div className="flex p-4 space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded dark:bg-gray-700 flex-1"></div>
            ))}
          </div>
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b">
            <div className="flex p-4 space-x-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 bg-gray-200 rounded dark:bg-gray-700 flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}