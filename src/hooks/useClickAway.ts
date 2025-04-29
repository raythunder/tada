// src/hooks/useClickAway.ts
import { useEffect, RefObject } from 'react';

function useClickAway(
    refs: RefObject<HTMLElement> | RefObject<HTMLElement>[],
    handler: (event: MouseEvent | TouchEvent) => void
) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            const refsArray = Array.isArray(refs) ? refs : [refs];
            const isInside = refsArray.some(ref => {
                const el = ref.current;
                return el && (el.contains(target) || (target instanceof Element && target.closest('.ignore-click-away')));
            });
            if (!isInside) {
                handler(event);
            }
        };
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', listener);
            document.addEventListener('touchstart', listener);
        }, 0);
        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [refs, handler]);
}
export default useClickAway;