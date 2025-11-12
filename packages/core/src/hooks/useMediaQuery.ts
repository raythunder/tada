import { useState, useEffect } from 'react';

/**
 * A custom React hook for tracking the state of a CSS media query.
 *
 * @param {string} query The CSS media query string to watch (e.g., '(min-width: 768px)').
 * @returns {boolean} `true` if the media query matches, otherwise `false`.
 */
const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);
        const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

        // Set the initial state
        setMatches(mediaQueryList.matches);

        // Add the listener for changes
        // Using addEventListener for modern browsers, with a fallback to addListener.
        if (mediaQueryList.addEventListener) {
            mediaQueryList.addEventListener('change', listener);
        } else {
            mediaQueryList.addListener(listener);
        }

        // Cleanup: remove the listener when the component unmounts or the query changes.
        return () => {
            if (mediaQueryList.removeEventListener) {
                mediaQueryList.removeEventListener('change', listener);
            } else {
                mediaQueryList.removeListener(listener);
            }
        };
    }, [query]); // Re-run the effect if the query string changes.

    return matches;
};

export default useMediaQuery;