import React, { ReactNode } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  emptyMessage?: ReactNode;
  className?: string;
  loadingMessage?: ReactNode;
}

/**
 * A reusable component for displaying lists with infinite scroll functionality
 */
export function InfiniteScrollList<T>({
  items,
  renderItem,
  loadMore,
  hasMore,
  isLoading,
  emptyMessage = 'No items found',
  className = '',
  loadingMessage = 'Loading more items...',
}: InfiniteScrollListProps<T>) {
  const { loadMoreRef } = useInfiniteScroll(loadMore, hasMore, isLoading);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        {typeof emptyMessage === 'string' ? (
          <p className="text-muted-foreground">{emptyMessage}</p>
        ) : (
          emptyMessage
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>
      ))}
      
      {/* Sentinel element for infinite scrolling */}
      <div ref={loadMoreRef} className="h-1" />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          {typeof loadingMessage === 'string' ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-muted-foreground">{loadingMessage}</p>
            </div>
          ) : (
            loadingMessage
          )}
        </div>
      )}
    </div>
  );
}

export default InfiniteScrollList;
