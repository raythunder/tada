// src/components/common/CustomDateRangePickerPopover.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { format, isValid, startOfDay } from '@/lib/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker'; // Import DateRange type

interface CustomDateRangePickerPopoverProps {
    initialStartDate: Date | undefined;
    initialEndDate: Date | undefined;
    onApplyRange: (startDate: Date, endDate: Date) => void;
    trigger: React.ReactElement;
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
}

const CustomDateRangePickerPopover: React.FC<CustomDateRangePickerPopoverProps> = React.memo(({
                                                                                                  initialStartDate,
                                                                                                  initialEndDate,
                                                                                                  onApplyRange,
                                                                                                  trigger,
                                                                                                  align = 'start',
                                                                                                  sideOffset = 5
                                                                                              }) => {
    const initialRange: DateRange | undefined = useMemo(() => {
        const start = initialStartDate && isValid(initialStartDate) ? startOfDay(initialStartDate) : undefined;
        const end = initialEndDate && isValid(initialEndDate) ? startOfDay(initialEndDate) : undefined;
        if (start && end) return { from: start, to: end };
        if (start) return { from: start, to: start }; // Handle single date initial case if needed
        return undefined;
    }, [initialStartDate, initialEndDate]);

    const [range, setRange] = useState<DateRange | undefined>(initialRange);
    const [isOpen, setIsOpen] = useState(false);

    const handleApply = useCallback(() => {
        if (range?.from && range?.to) {
            onApplyRange(range.from, range.to);
            setIsOpen(false);
        } else if (range?.from) {
            // If only start date selected, apply it as start and end
            onApplyRange(range.from, range.from);
            setIsOpen(false);
        }
        // Optionally handle error or disable apply button if range is incomplete
    }, [range, onApplyRange]);

    const handleClear = useCallback(() => {
        setRange(undefined);
        // Decide if onApplyRange should be called with undefined or if clear just resets local state
        // onApplyRange(undefined, undefined); // Optional: notify parent of clear
        // Keep popover open after clear? Or close?
        // setIsOpen(false);
    }, []);


    const displayRange = useMemo(() => {
        if (range?.from && range?.to) {
            const startStr = format(range.from, 'MMM d, yyyy');
            const endStr = format(range.to, 'MMM d, yyyy');
            return `${startStr} - ${endStr}`;
        } else if (range?.from) {
            return `Start: ${format(range.from, 'MMM d, yyyy')}`;
        }
        return "Select date range";
    }, [range]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl"
                align={align}
                sideOffset={sideOffset}
            >
                <div className="p-3">
                    {/* Selected Range Display */}
                    <div className="text-center text-xs text-muted-foreground mb-3 min-h-[16px]">
                        {displayRange}
                    </div>

                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={range?.from || initialStartDate} // Start view at selected/initial date
                        selected={range}
                        onSelect={setRange}
                        numberOfMonths={2} // Show two months for easier range selection
                        // Apply custom styling if needed
                        classNames={{
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            day_range_start: "rounded-l-full",
                            day_range_end: "rounded-r-full",
                            day_range_middle: "bg-primary/10 text-primary rounded-none",
                            // ... other classes
                        }}
                    />
                    {/* Action Buttons */}
                    <div className="flex space-x-2 mt-3 pt-3 border-t border-border/50">
                        <Button variant="ghost" size="sm" className="flex-1 justify-center text-muted-foreground" onClick={handleClear}>
                            Clear
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="default" size="sm" className="flex-1 justify-center" onClick={handleApply} disabled={!range?.from}>
                            Apply
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
});
CustomDateRangePickerPopover.displayName = 'CustomDateRangePickerPopover';
export default CustomDateRangePickerPopover;