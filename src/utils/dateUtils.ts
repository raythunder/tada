// src/utils/dateUtils.ts
import {
    format,
    isToday as isTodayFns,
    isAfter,
    isBefore,
    startOfDay,
    endOfDay,
    addDays,
    parseISO, // Use if dates might come as ISO strings
    fromUnixTime, // Use if dates are stored as Unix timestamps
    isValid
} from 'date-fns';
import { zhCN } from 'date-fns/locale'; // Import locales if needed

// Choose locale (e.g., Chinese)
const currentLocale = zhCN;

export const safeParseDate = (dateInput: Date | number | string | null | undefined): Date | null => {
    if (!dateInput) return null;

    let date: Date;
    if (typeof dateInput === 'number') {
        date = fromUnixTime(dateInput / 1000); // Assuming timestamp is in ms
    } else if (typeof dateInput === 'string') {
        date = parseISO(dateInput);
    } else {
        date = dateInput;
    }

    return isValid(date) ? date : null;
};


export const formatDate = (dateInput: Date | number | null | undefined, formatString: string = 'P'): string => {
    const date = safeParseDate(dateInput);
    if (!date) return '';
    try {
        return format(date, formatString, { locale: currentLocale });
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Invalid Date";
    }
};

export const formatDateTime = (dateInput: Date | number | null | undefined): string => {
    return formatDate(dateInput, 'Pp'); // e.g., 09/13/2018, 12:00:00 AM
}

export const formatRelativeDate = (dateInput: Date | number | null | undefined): string => {
    const date = safeParseDate(dateInput);
    if (!date) return '';

    // const today = startOfDay(new Date());
    const inputDay = startOfDay(date);

    if (isTodayFns(inputDay)) return 'Today';
    if (isTodayFns(addDays(inputDay, 1))) return 'Yesterday';
    if (isTodayFns(addDays(inputDay, -1))) return 'Tomorrow';

    return formatDate(date, 'MMM d'); // e.g., Sep 13
};

export const isToday = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    return date ? isTodayFns(date) : false;
};

export const isWithinNext7Days = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;
    const today = startOfDay(new Date());
    const nextWeek = endOfDay(addDays(today, 6)); // Include today + next 6 days

    return isAfter(date, addDays(today, -1)) && isBefore(date, addDays(nextWeek, 1));
};

export const isOverdue = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;
    const today = startOfDay(new Date());
    return isBefore(startOfDay(date), today);
};