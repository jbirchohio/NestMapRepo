import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { preloadRoute } from '@/config/routes';
/**
 * Preloads route components when links are hovered or focused
 */
export const useRoutePreloading = () => {
    useEffect(() => {
        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const link = target.closest('a[href^="/"]') as HTMLAnchorElement | null;
            if (link) {
                const url = new URL(link.href);
                if (url.origin === window.location.origin) {
                    preloadRoute(url.pathname);
                }
            }
        };
        // Also preload on focus for keyboard navigation
        const handleFocus = (event: FocusEvent) => {
            const target = event.target as HTMLElement;
            const link = target.closest('a[href^="/"]') as HTMLAnchorElement | null;
            if (link) {
                const url = new URL(link.href);
                if (url.origin === window.location.origin) {
                    preloadRoute(url.pathname);
                }
            }
        };
        // Add event listeners
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('focusin', handleFocus);
        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('focusin', handleFocus);
        };
    }, []);
};
/**
 * Preloads a specific route
 */
export const preloadRouteComponent = (path: string) => {
    return preloadRoute(path);
};
