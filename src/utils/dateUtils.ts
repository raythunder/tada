// src/utils/dateUtils.ts
import {
    format as formatFns, isToday as isTodayFns, isBefore, startOfDay, endOfDay,
    addDays, parseISO, isValid, differenceInCalendarDays, endOfWeek, startOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths,
    startOfMonth, endOfMonth, subWeeks, // Added subWeeks for SummaryView
} from 'date-fns';
import { enUS } from 'date-fns/locale';

const currentLocale = enUS;

export const safeParseDate = (dateInput: Date | number | string | null | undefined): Date | null => {
    if (dateInput === null || typeof dateInput === 'undefined') return null;
    let date: Date;
    if (dateInput instanceof Date) date = dateInput;
    else if (typeof dateInput === 'number') date = new Date(dateInput);
    else if (typeof dateInput === 'string') {
        date = parseISO(dateInput);
        if (!isValid(date)) date = new Date(dateInput);
    } else return null;
    return isValid(date) ? date : null;
};

export const formatDate = (dateInput: Date | number | null | undefined, formatString: string = 'MMM d, yyyy'): string => {
    const date = safeParseDate(dateInput);
    if (!date) return '';
    try { return formatFns(date, formatString, { locale: currentLocale }); }
    catch (e) { console.error("Error formatting date:", dateInput, e); return "Invalid Date"; }
};

export const formatDateTime = (dateInput: Date | number | null | undefined): string => {
    return formatDate(dateInput, 'MMM d, yyyy, h:mm a');
}

export const formatRelativeDate = (dateInput: Date | number | null | undefined): string => {
    const date = safeParseDate(dateInput);
    if (!date) return '';
    const today = startOfDay(new Date());
    const inputDay = startOfDay(date);
    const diffDays = differenceInCalendarDays(inputDay, today);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    const currentYear = today.getFullYear();
    const inputYear = inputDay.getFullYear();
    if (inputYear !== currentYear) return formatDate(date, 'MMM d, yyyy');
    return formatDate(date, 'MMM d');
};

export const isToday = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    return date ? isTodayFns(date) : false;
};

export const isWithinNext7Days = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;
    const today = startOfDay(new Date());
    const nextWeekEnd = endOfDay(addDays(today, 6));
    // Check: Date is >= Today AND <= End of 7th day
    return !isBefore(startOfDay(date), today) && !isBefore(nextWeekEnd, startOfDay(date));
};

export const isOverdue = (dateInput: Date | number | null | undefined): boolean => {
    const date = safeParseDate(dateInput);
    if (!date) return false;
    const today = startOfDay(new Date());
    return isBefore(startOfDay(date), today);
};

// Re-export needed functions
export {
    formatFns as format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, getDay,
    startOfDay, endOfDay, isBefore, isValid, subWeeks
};
export { enUS };