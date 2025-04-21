// src/components/common/CustomDatePickerPopover.tsx
import React, {useState, useMemo, useCallback} from 'react';
import {twMerge} from 'tailwind-merge';
import {Tooltip} from 'react-tooltip';
import {
    addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek,
    format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth,
    startOfWeek, subMonths, isValid
} from '@/utils/dateUtils';
import Button from './Button';
import Icon from './Icon';
import {motion, AnimatePresence} from 'framer-motion'; // Keep AnimatePresence for popover animation

interface CustomDatePickerPopoverProps {
    initialDate: Date | undefined; // Expect Date or undefined
    onSelect: (date: Date | undefined) => void; // Callback with Date or undefined
    close: () => void; // Function to close the popover
    // Requirement 2: Add optional trigger ref for positioning
    triggerElement?: HTMLElement | null;
}

// Performance: Use React.memo for the popover content
const CustomDatePickerPopoverContent: React.FC<CustomDatePickerPopoverProps> = React.memo(({
                                                                                               initialDate,
                                                                                               onSelect,
                                                                                               close,
                                                                                               // triggerElement // Prop not directly used in content, but passed down
                                                                                           }) => {
    // Convert undefined to current date for display purposes, memoize today
    const today = useMemo(() => startOfDay(new Date()), []);
    const [viewDate, setViewDate] = useState(initialDate && isValid(initialDate) ? startOfDay(initialDate) : today);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate && isValid(initialDate) ? startOfDay(initialDate) : undefined);

    // Memoize calendar data generation
    const { calendarDays } = useMemo(() => {
    // const { monthStart, monthEnd, calendarStart, calendarEnd, calendarDays } = useMemo(() => {
        const mStart = startOfMonth(viewDate);
        const mEnd = endOfMonth(viewDate);
        const cStart = startOfWeek(mStart);
        const cEnd = endOfWeek(mEnd);
        const days = eachDayOfInterval({ start: cStart, end: cEnd });
        return { monthStart: mStart, monthEnd: mEnd, calendarStart: cStart, calendarEnd: cEnd, calendarDays: days };
    }, [viewDate]);

    const tooltipIdPrefix = 'date-picker-tooltip-';

    // Performance: Memoize navigation handlers
    const prevMonth = useCallback(() => setViewDate(v => subMonths(v, 1)), []);
    const nextMonth = useCallback(() => setViewDate(v => addMonths(v, 1)), []);
    const goToToday = useCallback(() => setViewDate(today), [today]);

    // Performance: Memoize quick selection handlers
    const createQuickSelectHandler = useCallback((dateFn: () => Date) => () => {
        const date = startOfDay(dateFn());
        setSelectedDate(date);
        setViewDate(date); // Update view to show the selected month
        onSelect(date);
        close();
    }, [onSelect, close]);

    const selectToday = useMemo(() => createQuickSelectHandler(() => new Date()), [createQuickSelectHandler]);
    const selectTomorrow = useMemo(() => createQuickSelectHandler(() => addDays(new Date(), 1)), [createQuickSelectHandler]);
    const selectNextWeek = useMemo(() => createQuickSelectHandler(() => addDays(new Date(), 7)), [createQuickSelectHandler]);
    const selectNextMonth = useMemo(() => createQuickSelectHandler(() => addMonths(new Date(), 1)), [createQuickSelectHandler]);

    // Select date handler
    const handleSelectDate = useCallback((date: Date) => {
        const dateStart = startOfDay(date); // Ensure we use start of day
        const isCurrentlySelected = selectedDate && isSameDay(dateStart, selectedDate);
        const newDate = isCurrentlySelected ? undefined : dateStart; // Toggle selection

        setSelectedDate(newDate);
        // Don't automatically close on selection to allow time/reminder setting
        // onSelect(newDate); // Defer onSelect call to OK button or quick actions
    }, [selectedDate]); // Removed onSelect dependency here

    // Clear date handler
    const handleClearDate = useCallback(() => {
        setSelectedDate(undefined);
        // onSelect(undefined); // Defer onSelect call
        // close(); // Keep open maybe? Or close? Let's close on clear.
        onSelect(undefined);
        close();
    }, [onSelect, close]);

    // Confirm selection and close
    const handleConfirm = useCallback(() => {
        onSelect(selectedDate); // Call onSelect with the final chosen date
        close();
    }, [selectedDate, onSelect, close]);

    // Memoize weekdays array
    const weekDays = useMemo(() => ['S', 'M', 'T', 'W', 'T', 'F', 'S'], []);

    return (
        <div
            className="date-picker-content bg-glass-100 backdrop-blur-xl rounded-lg shadow-strong border border-black/10 p-4 w-[320px]"
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside popover
        >
            {/* Quick Date Selection Icons */}
            <div className="flex justify-between mb-4 px-4">
                <button
                    onClick={selectToday}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}today`} data-tooltip-content="Today"
                >
                    <Icon name="sun" size={20} className="text-gray-500"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}today`} place="top" className="z-50"/>

                <button
                    onClick={selectTomorrow}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}tomorrow`} data-tooltip-content="Tomorrow"
                >
                    <Icon name="sunset" size={20} className="text-gray-500"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}tomorrow`} place="top" className="z-50"/>

                <button
                    onClick={selectNextWeek}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}next-week`} data-tooltip-content="+7 Days"
                >
                    <div className="relative">
                        <Icon name="calendar" size={20} className="text-gray-500"/>
                        <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-gray-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            +7
                        </div>
                    </div>
                </button>
                <Tooltip id={`${tooltipIdPrefix}next-week`} place="top" className="z-50"/>

                <button
                    onClick={selectNextMonth}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}next-month`} data-tooltip-content="Next Month"
                >
                    <Icon name="moon" size={20} className="text-gray-500"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}next-month`} place="top" className="z-50"/>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <div className="text-base font-medium text-gray-800"> {/* Adjusted size */}
                    {format(viewDate, 'MMMM yyyy')}
                </div>
                <div className="flex items-center space-x-1"> {/* Reduced space */}
                    <Button onClick={prevMonth} variant="ghost" size="icon" icon="chevron-left" className="w-7 h-7 text-gray-500 hover:bg-black/10" aria-label="Previous month"/>
                    <Button onClick={goToToday} variant="ghost" size="icon" className="w-7 h-7" aria-label="Go to current month">
                        <div className={twMerge("w-1.5 h-1.5 rounded-full", isSameMonth(viewDate, today) ? "bg-primary" : "bg-gray-300")}></div>
                    </Button>
                    <Button onClick={nextMonth} variant="ghost" size="icon" icon="chevron-right" className="w-7 h-7 text-gray-500 hover:bg-black/10" aria-label="Next month"/>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="mb-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-1">
                    {weekDays.map((day, i) => (
                        <div key={i} className="text-center text-xs text-gray-500 h-8 flex items-center justify-center font-medium"> {/* Adjusted size */}
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-0">
                    {calendarDays.map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        const isDaySelected = selectedDate && isSameDay(day, selectedDate);
                        const isDayToday = isToday(day);

                        return (
                            <button
                                key={i}
                                onClick={() => handleSelectDate(day)}
                                className={twMerge(
                                    "h-9 w-9 flex items-center justify-center rounded-full text-sm transition-colors mx-auto", // Base size
                                    !isCurrentMonth && "text-gray-400/70 hover:bg-transparent", // Non-month days
                                    isCurrentMonth && "hover:bg-black/10", // Hover for month days
                                    isDayToday && !isDaySelected && "font-semibold text-primary border border-primary/50", // Today style
                                    !isDayToday && isCurrentMonth && !isDaySelected && "text-gray-800", // Regular day
                                    isDaySelected && "bg-primary text-white font-semibold hover:bg-primary-dark", // Selected style
                                    !isCurrentMonth && "pointer-events-none" // Disable clicking outside month
                                )}
                                aria-label={format(day, 'MMMM d, yyyy')}
                                aria-selected={isDaySelected}
                                disabled={!isCurrentMonth} // Disable button for non-month days
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Additional Options Placeholder */}
            {/* <div className="space-y-1 border-t border-black/10 pt-3 mt-3">
                 Add Time/Reminder/Repeat buttons here if needed later
            </div> */}

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4 border-t border-black/10 pt-3">
                <Button
                    variant="outline"
                    size="md"
                    className="flex-1 justify-center"
                    onClick={handleClearDate}
                >
                    Clear
                </Button>
                <Button
                    variant="primary"
                    size="md"
                    className="flex-1 justify-center" // Removed blue override, use theme primary
                    onClick={handleConfirm} // Confirm the selected date
                >
                    OK
                </Button>
            </div>
        </div>
    );
});
CustomDatePickerPopoverContent.displayName = 'CustomDatePickerPopoverContent';


// Main Popover component using Framer Motion for animation
const CustomDatePickerPopover: React.FC<CustomDatePickerPopoverProps> = (props) => {
    // AnimatePresence handles the mounting/unmounting animation
    return (
        <AnimatePresence>
            <motion.div
                className="date-picker-popover z-30" // Ensure popover appears above other elements
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5, transition: { duration: 0.1 } }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
            >
                <CustomDatePickerPopoverContent {...props} />
            </motion.div>
        </AnimatePresence>
    );
};


export default CustomDatePickerPopover; // Export the animated wrapper