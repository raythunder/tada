// src/hooks/useClickAway.ts
import { useEffect, RefObject } from 'react';

/**
 * Custom hook to detect clicks outside a specified element.
 * @param ref RefObject of the element to monitor.
 * @param handler Callback function to execute when a click outside occurs.
 */
function useClickAway(ref: RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current;
            // Do nothing if clicking ref's element or descendent elements
            // Also ignore clicks inside elements specifically marked to be ignored (e.g., popovers)
            if (!el || el.contains(event.target as Node) || (event.target as Element).closest('.ignore-click-away')) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]); // Re-run if ref or handler changes
}

export default useClickAway;