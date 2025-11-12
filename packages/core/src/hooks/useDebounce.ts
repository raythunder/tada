import {useEffect, useState} from 'react';

/**
 * A custom React hook that debounces a value.
 *
 * @template T The type of the value to debounce.
 * @param {T} value The value to be debounced.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {T} The debounced value, which updates only after the specified delay has passed
 * without the original value changing.
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set a timeout to update the debounced value after the specified delay.
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timeout if the value changes or the component unmounts.
        // This prevents the debounced value from updating if the value changes again
        // within the delay period.
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Re-run the effect only if the value or delay changes.

    return debouncedValue;
}

export default useDebounce;