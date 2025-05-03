// src/hooks/useClickAway.ts
import {RefObject, useEffect} from 'react';

type Event = MouseEvent | TouchEvent;

/**
 * Custom hook to detect clicks outside a specified element (or multiple elements).
 * Handles nested elements marked with 'ignore-click-away'.
 * @param refs RefObject(s) of the element(s) to monitor.
 * @param handler Callback function to execute when a click outside occurs.
 */
function useClickAway(
    refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
    handler: (event: Event) => void
): void {
    useEffect(() => {
        const listener = (event: Event) => {
            const target = event.target as Node;

            // Ensure refs is always an array
            const refsArray = Array.isArray(refs) ? refs : [refs];

            // Check if the click target is inside any of the refs or a designated ignored element
            const isInside = refsArray.some(ref => {
                const element = ref.current;
                // Check if the element exists and contains the target
                // OR if the target or any of its parents has the 'ignore-click-away' class
                return element && (element.contains(target) || (target instanceof Element && !!target.closest('.ignore-click-away')));
            });

            if (!isInside) {
                handler(event);
            }
        };

        // Use a small timeout to ensure the listener is added after the event that might have triggered the element to open
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', listener);
            document.addEventListener('touchstart', listener);
        }, 0);

        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [refs, handler]); // Re-run effect if refs or handler changes
}

export default useClickAway;