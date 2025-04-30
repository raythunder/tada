// src/components/common/CustomDatePickerPopover.tsx
import React, {useCallback, useMemo, useState} from 'react';
import {twMerge} from 'tailwind-merge';
import {Tooltip} from 'react-tooltip';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
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
import Icon from './Icon';

// Re-export Popover parts for convenience
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

// Styled Popover Content
export const PopoverContent = React.forwardRef<
    React.ElementRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({className, align = 'center', sideOffset = 4, ...props}, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={twMerge(
                // Base Radix preset styling
                "z-50 w-72 rounded-lg border border-black/10 bg-glass-100 backdrop-blur-xl p-4 shadow-strong outline-none data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                // Customizations
                className
            )}
            {...props}
        />
    </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;


// --- Date Picker Internal Logic Component ---
interface CustomDatePickerInternalProps {
    initialDate: Date | undefined;
    onSelect: (date: Date | undefined) => void;
    closePopover: () => void; // Function passed down to close the Radix Popover
}

const CustomDatePickerInternal: React.FC<CustomDatePickerInternalProps> = React.memo(({
                                                                                          initialDate,
                                                                                          onSelect,
                                                                                          closePopover,
                                                                                      }) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const [viewDate, setViewDate] = useState(initialDate && isValid(initialDate) ? startOfDay(initialDate) : today);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate && isValid(initialDate) ? startOfDay(initialDate) : undefined);

    const {calendarDays} = useMemo(() => {
        const mStart = startOfMonth(viewDate);
        const mEnd = endOfMonth(viewDate);
        const cStart = startOfWeek(mStart);
        const cEnd = endOfWeek(mEnd);
        const days = eachDayOfInterval({start: cStart, end: cEnd});
        return {calendarDays: days};
    }, [viewDate]);

    const tooltipIdPrefix = useMemo(() => `date-picker-tooltip-${Math.random().toString(36).substring(7)}`, []);

    const prevMonth = useCallback(() => setViewDate(v => subMonths(v, 1)), []);
    const nextMonth = useCallback(() => setViewDate(v => addMonths(v, 1)), []);
    const goToToday = useCallback(() => {
        const todayDate = startOfDay(new Date());
        setViewDate(todayDate);
        if (!selectedDate || !isSameDay(selectedDate, todayDate)) {
            setSelectedDate(todayDate);
        }
    }, [selectedDate]);

    const createQuickSelectHandler = useCallback((dateFn: () => Date) => () => {
        const date = startOfDay(dateFn());
        setSelectedDate(date); // Select internally
        setViewDate(date);     // Update view
        onSelect(date);      // Trigger external onSelect
        closePopover();      // Close the Radix popover
    }, [onSelect, closePopover]);

    const selectToday = useMemo(() => createQuickSelectHandler(() => new Date()), [createQuickSelectHandler]);
    const selectTomorrow = useMemo(() => createQuickSelectHandler(() => addDays(new Date(), 1)), [createQuickSelectHandler]);
    const selectNextWeek = useMemo(() => createQuickSelectHandler(() => addDays(new Date(), 7)), [createQuickSelectHandler]);
    const selectNextMonth = useMemo(() => createQuickSelectHandler(() => addMonths(new Date(), 1)), [createQuickSelectHandler]);

    const handleSelectDate = useCallback((date: Date) => {
        const dateStart = startOfDay(date);
        const isCurrentlySelected = selectedDate && isSameDay(dateStart, selectedDate);
        const newDate = isCurrentlySelected ? undefined : dateStart;
        setSelectedDate(newDate);
        // Don't call onSelect or close here, wait for OK button
    }, [selectedDate]);

    const handleClearDate = useCallback(() => {
        setSelectedDate(undefined);
        onSelect(undefined); // Call external handler
        closePopover();      // Close popover
    }, [onSelect, closePopover]);

    const handleConfirm = useCallback(() => {
        onSelect(selectedDate); // Call external handler with the finally selected date
        closePopover();       // Close popover
    }, [selectedDate, onSelect, closePopover]);

    const weekDays = useMemo(() => ['S', 'M', 'T', 'W', 'T', 'F', 'S'], []);

    return (
        // Removed the outer wrapper div (bg-glass, etc.) as that's now handled by PopoverContent
        // Added ignore-click-away to prevent closing when interacting inside
        <div className="date-picker-internal-content ignore-click-away w-[300px]">
            {/* Quick Date Selection Icons */}
            <div className="flex justify-between mb-4 px-2">
                <button
                    onClick={selectToday}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 dark:hover:bg-white/10 transition-colors duration-150 ease-apple"
                    data-tooltip-id={`${tooltipIdPrefix}today`} data-tooltip-content="Today"
                    aria-label="Select Today"
                >
                    <Icon name="sun" size={20} className="text-gray-500 dark:text-gray-400"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}today`} place="top" className="!z-[60]"/>

                <button
                    onClick={selectTomorrow}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 dark:hover:bg-white/10 transition-colors duration-150 ease-apple"
                    data-tooltip-id={`${tooltipIdPrefix}tomorrow`} data-tooltip-content="Tomorrow"
                    aria-label="Select Tomorrow"
                >
                    <Icon name="sunset" size={20} className="text-gray-500 dark:text-gray-400"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}tomorrow`} place="top" className="!z-[60]"/>

                <button
                    onClick={selectNextWeek}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 dark:hover:bg-white/10 transition-colors duration-150 ease-apple"
                    data-tooltip-id={`${tooltipIdPrefix}next-week`} data-tooltip-content="+7 Days"
                    aria-label="Select 7 days from now"
                >
                    <div className="relative">
                        <Icon name="calendar" size={20} className="text-gray-500 dark:text-gray-400"/>
                        <div
                            className="absolute top-0 right-0 -mt-1 -mr-1 bg-gray-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            +7
                        </div>
                    </div>
                </button>
                <Tooltip id={`${tooltipIdPrefix}next-week`} place="top" className="!z-[60]"/>

                <button
                    onClick={selectNextMonth}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 dark:hover:bg-white/10 transition-colors duration-150 ease-apple"
                    data-tooltip-id={`${tooltipIdPrefix}next-month`} data-tooltip-content="Next Month"
                    aria-label="Select next month"
                >
                    <Icon name="moon" size={20} className="text-gray-500 dark:text-gray-400"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}next-month`} place="top" className="!z-[60]"/>
            </div>

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

            {/* Calendar Grid */}
            <div className="mb-4">
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
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        const isDaySelected = selectedDate && isSameDay(day, selectedDate);
                        const isDayToday = isToday(day);

                        return (
                            <button
                                key={i}
                                onClick={() => handleSelectDate(day)}
                                className={twMerge(
                                    "h-8 w-8 flex items-center justify-center rounded-full text-sm transition-colors duration-100 ease-apple mx-auto",
                                    "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 relative z-0", // Base focus
                                    !isCurrentMonth && "text-gray-400/60 dark:text-gray-600 hover:bg-transparent",
                                    isCurrentMonth && "hover:bg-black/10 dark:hover:bg-white/10",
                                    isDayToday && !isDaySelected && "font-semibold text-primary border border-primary/40",
                                    !isDayToday && isCurrentMonth && !isDaySelected && "text-gray-700 dark:text-gray-200",
                                    isDaySelected && "bg-primary text-primary-foreground font-semibold hover:bg-primary-dark z-10", // Selected state on top
                                    !isCurrentMonth && "pointer-events-none opacity-50" // Disabled state
                                )}
                                aria-label={format(day, 'MMMM d, yyyy')}
                                aria-pressed={isDaySelected}
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
                <Button
                    variant="outline"
                    size="md" // Use consistent size
                    className="flex-1 justify-center"
                    onClick={handleClearDate}
                >
                    Clear
                </Button>
                {/* Use PopoverClose for the OK button to semantically close */}
                <PopoverClose asChild>
                    <Button
                        variant="primary"
                        size="md" // Use consistent size
                        className="flex-1 justify-center"
                        onClick={handleConfirm}
                    >
                        OK
                    </Button>
                </PopoverClose>
            </div>
        </div>
    );
});
CustomDatePickerInternal.displayName = 'CustomDatePickerInternal';

// --- Main Exported Component: Wraps Radix Popover ---
interface CustomDatePickerPopoverProps {
    initialDate: Date | undefined;
    onSelect: (date: Date | undefined) => void;
    children: React.ReactNode; // The trigger element(s)
    align?: PopoverPrimitive.PopoverContentProps['align'];
    side?: PopoverPrimitive.PopoverContentProps['side'];
    sideOffset?: PopoverPrimitive.PopoverContentProps['sideOffset'];
}

const CustomDatePickerPopover: React.FC<CustomDatePickerPopoverProps> = ({
                                                                             initialDate,
                                                                             onSelect,
                                                                             children,
                                                                             align = 'center',
                                                                             side = 'bottom',
                                                                             sideOffset = 5,
                                                                         }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelectAndClose = useCallback((date: Date | undefined) => {
        onSelect(date);
        setIsOpen(false); // Close popover after selection or action
    }, [onSelect]);

    const handlePopoverClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            {/* Use the styled PopoverContent */}
            <PopoverContent align={align} side={side} sideOffset={sideOffset}
                            className="w-auto p-0 border-none bg-transparent shadow-none">
                {/* Pass down props and the specific close handler */}
                <CustomDatePickerInternal
                    initialDate={initialDate}
                    onSelect={handleSelectAndClose} // Use the wrapper handler
                    closePopover={handlePopoverClose} // Pass the function to close the popover
                />
            </PopoverContent>
        </Popover>
    );
};
CustomDatePickerPopover.displayName = 'CustomDatePickerPopover';
export default CustomDatePickerPopover;