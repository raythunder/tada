// src/utils/dateUtils.ts
import {
    format as formatFns, // Alias to avoid conflict
    isToday as isTodayFns,
    isAfter,
    isBefore,
    startOfDay,
    endOfDay,
    addDays,
    parseISO,
    // fromUnixTime, // Converts seconds to Date
    isValid,
    differenceInCalendarDays // Useful for relative checks
} from 'date-fns';
import { enUS } from 'date-fns/locale'; // Default to English US, adjust if needed

// Consistent locale
const currentLocale = enUS;

/** Safely parses various date inputs into a Date object */
export const safeParseDate = (dateInput: Date | number | string | null | undefined): Date | null => {
    if (dateInput === null || typeof dateInput === 'undefined') return null;

    let date: Date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'number') {
        // Assuming the number is a timestamp in milliseconds
        date = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
        date = parseISO(dateInput); // Handles ISO 8601 format
        // Could add more parsing logic here if needed (e.g., for MM/DD/YYYY)
    } else {
        return null; // Unsupported type
    }

    return isValid(date) ? date : null;
};

/** Formats a date using a specified format string */
export const formatDate = (dateInput: Date | number | null | undefined, formatString: string = 'MMM d, yyyy'): string => {
    const date = safeParseDate(dateInput);
    if (!date) return '';
    try {
        return formatFns(date, formatString, { locale: currentLocale });
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Invalid Date";
    }
};

/** Formats a date and time */
export const formatDateTime = (dateInput: Date | number | null | undefined): string => {
    return formatDate(dateInput, 'MMM d, yyyy, h:mm a'); // e.g., Sep 13, 2024, 2:30 PM
}

/** Formats a date relative to today (Today, Tomorrow, Yesterday, or specific date) */
export const formatRelativeDate = (dateInput: Date | number | null | undefined): string => {
    const date = safeParseDate(dateInput);
    if (!date) return '';

    const today = startOfDay(new Date());
    const inputDay = startOfDay(date);
    const diffDays = differenceInCalendarDays(inputDay, today);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    // Add more relative terms if needed (e.g., "In 2 days")
    // if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

    // Default to standard format for other dates
    return formatDate(date, 'MMM d'); // e.g., Sep 13
};

/** Checks if a date is today */
export const isToday = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    return date ? isTodayFns(date) : false;
};

/** Checks if a date is within the next 7 days (including today) */
export const isWithinNext7Days = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;
    const today = startOfDay(new Date());
    const nextWeekEnd = endOfDay(addDays(today, 6)); // End of the 7th day from today

    // Check if the date is after yesterday and before the end of the 7th day
    return isAfter(date, addDays(today, -1)) && isBefore(date, addDays(nextWeekEnd, 1));
};

/** Checks if a date is before today (overdue) */
export const isOverdue = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;
    const today = startOfDay(new Date());
    // Compare the start of the input date with the start of today
    return isBefore(startOfDay(date), today);
};