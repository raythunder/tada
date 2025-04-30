// src/components/common/CustomDateRangePickerPopover.tsx
import React, {useCallback, useMemo, useState} from 'react';
import {twMerge} from 'tailwind-merge';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    isToday,
    isValid,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths
} from '@/utils/dateUtils';
import Button from './Button';
import {Popover, PopoverClose, PopoverContent, PopoverTrigger} from './CustomDatePickerPopover'; // Reuse styled parts

// --- Date Range Picker Internal Logic Component ---
interface CustomDateRangePickerInternalProps {
    initialStartDate: Date | undefined;
    initialEndDate: Date | undefined;
    onApplyRange: (startDate: Date, endDate: Date) => void;
    closePopover: () => void; // Function passed down to close the Radix Popover
}

const CustomDateRangePickerInternal: React.FC<CustomDateRangePickerInternalProps> = React.memo(({
                                                                                                    initialStartDate,
                                                                                                    initialEndDate,
                                                                                                    onApplyRange,
                                                                                                    closePopover,
                                                                                                }) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const [viewDate, setViewDate] = useState(initialStartDate && isValid(initialStartDate) ? startOfDay(initialStartDate) : today);
    const [startDate, setStartDate] = useState<Date | undefined>(initialStartDate && isValid(initialStartDate) ? startOfDay(initialStartDate) : undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate && isValid(initialEndDate) ? startOfDay(initialEndDate) : undefined);
    const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined);

    const {calendarDays} = useMemo(() => {
        const mStart = startOfMonth(viewDate);
        const mEnd = endOfMonth(viewDate);
        const cStart = startOfWeek(mStart);
        const cEnd = endOfWeek(mEnd);
        const days = eachDayOfInterval({start: cStart, end: cEnd});
        return {calendarDays: days};
    }, [viewDate]);

    const prevMonth = useCallback(() => setViewDate(v => subMonths(v, 1)), []);
    const nextMonth = useCallback(() => setViewDate(v => addMonths(v, 1)), []);
    const goToToday = useCallback(() => setViewDate(today), [today]);

    const handleSelectDate = useCallback((date: Date) => {
        const dateStart = startOfDay(date);
        if (!startDate || (startDate && endDate)) {
            // Start new selection or restart after full range selected
            setStartDate(dateStart);
            setEndDate(undefined);
            setHoveredDate(undefined); // Clear hover
        } else if (startDate && !endDate) {
            // Selecting the end date
            if (isBefore(dateStart, startDate)) {
                // If clicked date is before start date, make it the new start date
                setEndDate(startDate);
                setStartDate(dateStart);
            } else {
                // Otherwise, set it as the end date
                setEndDate(dateStart);
            }
            setHoveredDate(undefined); // Clear hover after selection
        }
    }, [startDate, endDate]);

    const handleClear = useCallback(() => {
        setStartDate(undefined);
        setEndDate(undefined);
        setHoveredDate(undefined);
        // Optionally call onApplyRange with undefined if needed, or just clear internal state
    }, []);

    const handleApply = useCallback(() => {
        if (startDate && endDate) {
            onApplyRange(startDate, endDate);
            closePopover();
        } else if (startDate && !endDate) {
            // Apply single day range if only start date is selected
            onApplyRange(startDate, startDate);
            closePopover();
        }
        // Do nothing if no start date is selected
    }, [startDate, endDate, onApplyRange, closePopover]);

    const handleMouseEnterDay = (date: Date) => {
        if (startDate && !endDate) {
            setHoveredDate(startOfDay(date));
        }
    };

    const handleMouseLeaveGrid = () => {
        setHoveredDate(undefined);
    };

    const weekDays = useMemo(() => ['S', 'M', 'T', 'W', 'T', 'F', 'S'], []);
    const isApplyDisabled = !startDate; // Apply button enabled if at least start date is selected

    return (
        // Added ignore-click-away to prevent closing when interacting inside
        <div className="date-range-picker-internal-content ignore-click-away w-[320px]">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 text-center tabular-nums">
                    {format(viewDate, 'MMMM yyyy')}
                </div>
                <div className="flex items-center space-x-0.5">
                    <Button onClick={prevMonth} variant="ghost" size="icon" icon="chevron-left"
                            className="w-7 h-7 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10"
                            aria-label="Previous month"/>
                    <Button onClick={goToToday} variant="ghost" size="icon" className="w-7 h-7"
                            aria-label="Go to current month">
                        <div
                            className={twMerge("w-1.5 h-1.5 rounded-full", isSameMonth(viewDate, today) ? "bg-primary" : "bg-gray-400 dark:bg-gray-600")}></div>
                    </Button>
                    <Button onClick={nextMonth} variant="ghost" size="icon" icon="chevron-right"
                            className="w-7 h-7 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10"
                            aria-label="Next month"/>
                </div>
            </div>

            {/* Selected Range Display */}
            <div className="text-center text-xs text-muted-foreground dark:text-neutral-400 mb-3 min-h-[16px] px-2">
                {!startDate && !endDate && 'Select start date'}
                {startDate && !endDate && `Start: ${format(startDate, 'MMM d, yyyy')}`}
                {startDate && endDate && `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`}
            </div>

            {/* Calendar Grid */}
            <div className="mb-3" onMouseLeave={handleMouseLeaveGrid}>
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-1">
                    {weekDays.map((day, i) => (
                        <div key={i}
                             className="text-center text-[11px] text-gray-500 dark:text-gray-400 h-8 flex items-center justify-center font-medium">
                            {day}
                        </div>
                    ))}
                </div>
                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((day, i) => {
                        const dayStart = startOfDay(day);
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        const isDayToday = isToday(day);
                        const isSelectedStart = startDate && isSameDay(dayStart, startDate);
                        const isSelectedEnd = endDate && isSameDay(dayStart, endDate);
                        const potentialEndDate = hoveredDate ?? endDate; // Use hovered date if no end date selected

                        // Determine if the day is within the selection range (including hover preview)
                        const isInRange = startDate && potentialEndDate &&
                            !isSelectedStart && !isSelectedEnd &&
                            isAfter(dayStart, startDate) && isBefore(dayStart, potentialEndDate);

                        // Determine if the day is being hovered over as a potential end date
                        const isHoveringInRange = startDate && !endDate && hoveredDate &&
                            !isSelectedStart && !isSameDay(dayStart, hoveredDate) &&
                            isAfter(dayStart, startDate) && isBefore(dayStart, hoveredDate);

                        // Determine if the day is part of the final range (excluding hover)
                        const isInFinalRange = startDate && endDate &&
                            !isSelectedStart && !isSelectedEnd &&
                            isAfter(dayStart, startDate) && isBefore(dayStart, endDate);

                        return (
                            <button
                                key={i}
                                onClick={() => handleSelectDate(day)}
                                onMouseEnter={() => handleMouseEnterDay(day)}
                                className={twMerge(
                                    // Base styles
                                    "h-8 w-8 flex items-center justify-center text-sm transition-colors duration-100 ease-linear mx-auto relative",
                                    "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:z-10 rounded-full", // Always round for simplicity
                                    // Default state for current month days
                                    isCurrentMonth && !isSelectedStart && !isSelectedEnd && !(isInRange || isInFinalRange) && "text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10",
                                    // Today's date marker (if not selected)
                                    isDayToday && !isSelectedStart && !isSelectedEnd && "font-semibold ring-1 ring-inset ring-primary/30",
                                    // Start/End selected states
                                    (isSelectedStart || isSelectedEnd) && "bg-primary text-primary-foreground font-semibold hover:bg-primary-dark z-[5]",
                                    // In-range background (final selection or hover preview)
                                    (isInRange || isInFinalRange) && isCurrentMonth && "bg-primary/10 dark:bg-primary/20 text-gray-700 dark:text-gray-200 hover:bg-primary/20 dark:hover:bg-primary/30",
                                    // Hovering in range specific style (can override in-range if needed)
                                    isHoveringInRange && "bg-primary/15 dark:bg-primary/25",
                                    // Out-of-month / disabled state
                                    !isCurrentMonth && "text-gray-400/60 dark:text-gray-600 pointer-events-none opacity-50"
                                )}
                                aria-label={format(day, 'MMMM d, yyyy')}
                                aria-pressed={isSelectedStart || isSelectedEnd}
                                disabled={!isCurrentMonth}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-2 border-t border-black/10 dark:border-white/10 pt-3">
                <Button variant="outline" size="md" className="flex-1 justify-center" onClick={handleClear}>
                    Clear
                </Button>
                {/* Use PopoverClose for Cancel */}
                <PopoverClose asChild>
                    <Button variant="secondary" size="md" className="flex-1 justify-center">
                        Cancel
                    </Button>
                </PopoverClose>
                {/* Apply button closes via its own handler */}
                <Button variant="primary" size="md" className="flex-1 justify-center" onClick={handleApply}
                        disabled={isApplyDisabled}>
                    Apply
                </Button>
            </div>
        </div>
    );
});
CustomDateRangePickerInternal.displayName = 'CustomDateRangePickerInternal';


// --- Main Exported Component: Wraps Radix Popover ---
interface CustomDateRangePickerPopoverProps {
    initialStartDate: Date | undefined;
    initialEndDate: Date | undefined;
    onApplyRange: (startDate: Date, endDate: Date) => void;
    children: React.ReactNode; // The trigger element(s)
    align?: PopoverPrimitive.PopoverContentProps['align'];
    side?: PopoverPrimitive.PopoverContentProps['side'];
    sideOffset?: PopoverPrimitive.PopoverContentProps['sideOffset'];
}

const CustomDateRangePickerPopover: React.FC<CustomDateRangePickerPopoverProps> = ({
                                                                                       initialStartDate,
                                                                                       initialEndDate,
                                                                                       onApplyRange,
                                                                                       children,
                                                                                       align = 'center',
                                                                                       side = 'bottom',
                                                                                       sideOffset = 5,
                                                                                   }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleApplyAndClose = useCallback((startDate: Date, endDate: Date) => {
        onApplyRange(startDate, endDate);
        setIsOpen(false); // Close popover after applying
    }, [onApplyRange]);

    const handlePopoverClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            {/* Use the standard styled PopoverContent */}
            <PopoverContent align={align} side={side} sideOffset={sideOffset} className="w-auto p-4">
                <CustomDateRangePickerInternal
                    initialStartDate={initialStartDate}
                    initialEndDate={initialEndDate}
                    onApplyRange={handleApplyAndClose} // Use wrapper handler
                    closePopover={handlePopoverClose} // Pass close function
                />
            </PopoverContent>
        </Popover>
    );
};
CustomDateRangePickerPopover.displayName = 'CustomDateRangePickerPopover';
export default CustomDateRangePickerPopover;