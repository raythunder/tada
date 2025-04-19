// src/utils/dateUtils.ts
import {
    format as formatFns,
    isToday as isTodayFns,
    isBefore,
    isAfter, // Import isAfter
    startOfDay,
    endOfDay,
    addDays,
    subDays, // Import subDays
    parseISO,
    isValid,
    differenceInCalendarDays,
    endOfWeek,
    startOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    getDay,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    addWeeks,
    subWeeks,
} from 'date-fns';
import { enUS } from 'date-fns/locale'; // Use English locale

// Consistent locale for formatting
const currentLocale = enUS;

/**
 * Safely parses various date inputs (Date object, timestamp number, string) into a Date object.
 * Returns null if the input is invalid or cannot be parsed.
 */
export const safeParseDate = (dateInput: Date | number | string | null | undefined): Date | null => {
    if (dateInput === null || typeof dateInput === 'undefined') return null;

    let date: Date;
    if (dateInput instanceof Date) {
        date = dateInput; // Already a Date object
    } else if (typeof dateInput === 'number') {
        date = new Date(dateInput); // Assume timestamp
    } else if (typeof dateInput === 'string') {
        // Try parsing ISO format first, then fallback to Date constructor
        date = parseISO(dateInput);
        if (!isValid(date)) {
            date = new Date(dateInput); // Fallback parsing
        }
    } else {
        return null; // Unsupported type
    }

    // Return the date only if it's valid
    return isValid(date) ? date : null;
};

/**
 * Formats a date using a specified format string (defaults to 'MMM d, yyyy').
 * Returns an empty string or 'Invalid Date' if the input is invalid.
 */
export const formatDate = (dateInput: Date | number | null | undefined, formatString: string = 'MMM d, yyyy'): string => {
    const date = safeParseDate(dateInput);
    if (!date) return ''; // Return empty for null/invalid input

    try {
        return formatFns(date, formatString, { locale: currentLocale });
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return "Invalid Date"; // Error fallback
    }
};

/** Formats a date and time (e.g., 'Jul 20, 2024, 3:05 PM') */
export const formatDateTime = (dateInput: Date | number | null | undefined): string => {
    return formatDate(dateInput, 'MMM d, yyyy, h:mm a');
};

/**
 * Formats a date relative to today (e.g., 'Today', 'Tomorrow', 'Yesterday', 'Jul 20', 'Jul 20, 2023').
 */
export const formatRelativeDate = (dateInput: Date | number | null | undefined): string => {
    const date = safeParseDate(dateInput);
    if (!date) return '';

    const today = startOfDay(new Date());
    const inputDay = startOfDay(date);
    const diffDays = differenceInCalendarDays(inputDay, today);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    // Show year if it's not the current year
    const currentYear = today.getFullYear();
    const inputYear = inputDay.getFullYear();
    if (inputYear !== currentYear) {
        return formatDate(date, 'MMM d, yyyy');
    }
    // Otherwise, just show month and day
    return formatDate(date, 'MMM d');
};

/** Checks if a date is today. */
export const isToday = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    return date ? isTodayFns(date) : false;
};

/** Checks if a date is within the next 7 days (inclusive of today, up to 6 days from now). */
export const isWithinNext7Days = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;

    const today = startOfDay(new Date());
    const dateOnly = startOfDay(date);
    const sevenDaysFromTodayEnd = endOfDay(addDays(today, 6)); // End of the 7th day period

    // Check if the date is on or after today AND on or before the end of the 7-day period
    return !isBefore(dateOnly, today) && !isAfter(dateOnly, sevenDaysFromTodayEnd);
};

/** Checks if a date is before today (overdue). Compares based on the start of the day. */
export const isOverdue = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;

    const today = startOfDay(new Date());
    const dateStart = startOfDay(date); // Compare start of days
    return isBefore(dateStart, today);
};

// Re-export necessary date-fns functions for use in components
export {
    formatFns as format, // Re-export format under its original name
    startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
    addMonths, subMonths, isSameMonth, isSameDay, getDay,
    startOfDay, endOfDay, isBefore, isAfter, isValid, addDays, subDays, addWeeks, subWeeks,
    differenceInCalendarDays,
};
export { enUS }; // Export locale if needed elsewhere