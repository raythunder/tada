// src/hooks/useClickAway.ts
import {RefObject, useEffect} from 'react';

/**
 * Custom hook to detect clicks outside a specified element (or multiple elements).
 * @param refs RefObject(s) of the element(s) to monitor. Can be a single ref or an array of refs.
 * @param handler Callback function to execute when a click outside occurs.
 */
function useClickAway(
    refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[], // Accept null refs
    handler: (event: MouseEvent | TouchEvent) => void
) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            const refsArray = Array.isArray(refs) ? refs : [refs];

            // Check if the click is inside any of the provided refs or an element marked to be ignored
            const isInside = refsArray.some(ref => {
                const el = ref?.current; // Safely access current
                // Do nothing if clicking ref's element or descendent elements
                // Also check if the target or its ancestor has the ignore class
                return el && (el.contains(target) || (target instanceof Element && !!target.closest('.ignore-click-away')));
            });

            // If the click is not inside any ref element or ignored element, call the handler
            if (!isInside) {
                handler(event);
            }
        };

        // Use a small timeout to prevent the handler from firing immediately
        // if the click that opened the element is also considered "outside".
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', listener);
            document.addEventListener('touchstart', listener);
        }, 0);


        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
        // Ensure refs array itself is stable or properly included in dependencies if it can change identity
        // Using JSON.stringify is a quick way but might have performance implications if refs change often.
        // If refs array identity is stable, just [handler] might be enough, or explicitly list stable refs if possible.
        // For simplicity here, assuming refs array identity is stable or changes infrequently.
    }, [refs, handler]);
}

export default useClickAway;