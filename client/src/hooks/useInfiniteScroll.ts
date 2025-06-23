import { useEffect, useRef, useState } from 'react';
interface UseInfiniteScrollOptions {
    threshold?: number;
    initialPage?: number;
}
/**
 * A custom hook for implementing infinite scroll functionality
 *
 * @param loadMore Function to call when more items should be loaded
 * @param hasMore Boolean indicating if there are more items to load
 * @param isLoading Boolean indicating if items are currently being loaded
 * @param options Configuration options
 * @returns Object containing ref to attach to the scroll container
 */
export function useInfiniteScroll(loadMore: () => void, hasMore: boolean, isLoading: boolean, options: UseInfiniteScrollOptions = {}) {
    const { threshold = 100, initialPage = 1 } = options;
    const [page, setPage] = useState(initialPage);
    const observer = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        // Disconnect previous observer if it exists
        if (observer.current) {
            observer.current.disconnect();
        }
        // Skip if we're already loading or there are no more items
        if (isLoading || !hasMore)
            return;
        observer.current = new IntersectionObserver((entries) => {
            // If the sentinel element is visible and we have more items to load
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                setPage((prevPage) => prevPage + 1);
                loadMore();
            }
        }, {
            rootMargin: `0px 0px ${threshold}px 0px`, // Load more when sentinel is within threshold pixels of viewport
        });
        // Observe the sentinel element
        if (loadMoreRef.current) {
            observer.current.observe(loadMoreRef.current);
        }
        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [loadMore, hasMore, isLoading, threshold]);
    return {
        loadMoreRef,
        page,
        setPage,
    };
}
