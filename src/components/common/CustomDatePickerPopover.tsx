// src/components/common/CustomDatePickerPopover.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { addDays, addMonths, isSameDay, startOfDay, isValid } from '@/lib/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar'; // Use shadcn Calendar
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Use shadcn Popover
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Icon from './Icon';
import {IconName} from "@/components/common/IconMap.tsx";

interface CustomDatePickerPopoverProps {
    initialDate: Date | undefined;
    onSelect: (date: Date | undefined) => void;
    trigger: React.ReactElement; // Expect a trigger element (e.g., Button)
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
}

const CustomDatePickerPopover: React.FC<CustomDatePickerPopoverProps> = React.memo(({
                                                                                        initialDate,
                                                                                        onSelect,
                                                                                        trigger,
                                                                                        align = 'start',
                                                                                        sideOffset = 5
                                                                                    }) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    // Use Date | undefined for selectedDate to align with react-day-picker types used by shadcn Calendar
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        initialDate && isValid(initialDate) ? startOfDay(initialDate) : undefined
    );
    // Keep track of the month displayed in the calendar
    const [month, setMonth] = useState<Date>(selectedDate || today);
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = useCallback((date: Date | undefined) => {
        if (date) {
            const dateStart = startOfDay(date);
            // Toggle selection: if same day clicked, deselect; otherwise select
            const newDate = selectedDate && isSameDay(dateStart, selectedDate) ? undefined : dateStart;
            setSelectedDate(newDate);
            onSelect(newDate); // Call parent onSelect immediately
            setIsOpen(false); // Close popover on selection
        } else {
            // Handle case where undefined is passed (e.g., clicking outside) - may not be needed with Popover control
            setSelectedDate(undefined);
            onSelect(undefined);
            setIsOpen(false);
        }
    }, [selectedDate, onSelect]);

    const quickSelect = useCallback((dateFn: () => Date) => {
        const date = startOfDay(dateFn());
        setSelectedDate(date);
        setMonth(date); // Also update the displayed month
        onSelect(date);
        setIsOpen(false);
    }, [onSelect]);

    const selectToday = useCallback(() => quickSelect(() => new Date()), [quickSelect]);
    const selectTomorrow = useCallback(() => quickSelect(() => addDays(new Date(), 1)), [quickSelect]);
    const selectNextWeek = useCallback(() => quickSelect(() => addDays(new Date(), 7)), [quickSelect]);
    const selectNextMonth = useCallback(() => quickSelect(() => addMonths(new Date(), 1)), [quickSelect]);

    const handleClearDate = useCallback(() => {
        setSelectedDate(undefined);
        onSelect(undefined);
        setIsOpen(false);
    }, [onSelect]);

    // Tooltip IDs
    // const tooltipIdPrefix = useMemo(() => `date-picker-tooltip-${Math.random().toString(36).substring(7)}`, []);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl"
                align={align}
                sideOffset={sideOffset}
            >
                <div className="p-3">
                    {/* Quick Select Buttons */}
                    <div className="flex justify-around mb-3 border-b border-border/50 pb-3">
                        {[
                            { label: 'Today', icon: 'sun', handler: selectToday, id: 'today' },
                            { label: 'Tomorrow', icon: 'sunset', handler: selectTomorrow, id: 'tomorrow' },
                            { label: '+7 Days', icon: 'calendar-plus', handler: selectNextWeek, id: 'next-week' }, // Use specific icon
                            { label: 'Next Month', icon: 'moon', handler: selectNextMonth, id: 'next-month' }
                        ].map(item => (
                            <Tooltip key={item.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground"
                                        onClick={item.handler}
                                        aria-label={`Select ${item.label}`}
                                    >
                                        {/* Special rendering for +7 days icon */}
                                        {item.id === 'next-week' ? (
                                            <div className="relative">
                                                <Icon name={item.icon as IconName} size={18} />
                                                <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-muted-foreground text-white text-[7px] font-bold rounded-full w-3 h-3 flex items-center justify-center">
                                                    7
                                                </div>
                                            </div>
                                        ) : (
                                            <Icon name={item.icon as IconName} size={18} />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="tooltip-content">
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>

                    {/* shadcn Calendar Component */}
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelect}
                        month={month} // Control the displayed month
                        onMonthChange={setMonth} // Allow month navigation
                        initialFocus // Focus calendar on open
                        // Apply custom styling to match original design if needed
                        classNames={{
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            day_today: "bg-accent text-accent-foreground",
                            // Add other classes as needed: day_outside, head_cell, etc.
                        }}
                    />

                    {/* Clear Button */}
                    <div className="mt-3 pt-3 border-t border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-muted-foreground hover:text-destructive"
                            onClick={handleClearDate}
                        >
                            Clear Date
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
});
CustomDatePickerPopover.displayName = 'CustomDatePickerPopover';
export default CustomDatePickerPopover;