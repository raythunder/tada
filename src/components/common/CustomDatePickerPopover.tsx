// src/components/common/CustomDatePickerPopover.tsx
import React, {useState} from 'react';
import {twMerge} from 'tailwind-merge';
import {Tooltip} from 'react-tooltip';
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
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths
} from '@/utils/dateUtils';
import Button from './Button';
import Icon from './Icon';
import {motion} from 'framer-motion';

interface CustomDatePickerPopoverProps {
    initialDate: Date | undefined; // Expect Date or undefined
    onSelect: (date: Date | undefined) => void; // Callback with Date or undefined
    close: () => void; // Function to close the popover
}

const CustomDatePickerPopover: React.FC<CustomDatePickerPopoverProps> = ({
                                                                             initialDate,
                                                                             onSelect,
                                                                             close
                                                                         }) => {
    // Convert undefined to current date for display purposes
    const today = startOfDay(new Date());
    const [viewDate, setViewDate] = useState(initialDate ? startOfDay(initialDate) : today);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);

    // Generate calendar data
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const tooltipIdPrefix = 'date-picker-tooltip-';

    const calendarDays = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    // Navigate between months
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));
    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const goToToday = () => setViewDate(today);

    // Quick date selection handlers
    const selectToday = () => {
        const date = startOfDay(new Date());
        setSelectedDate(date);
        setViewDate(date);
        onSelect(date);
        close();
    };

    const selectTomorrow = () => {
        const date = addDays(startOfDay(new Date()), 1);
        setSelectedDate(date);
        setViewDate(date);
        onSelect(date);
        close();
    };

    const selectNextWeek = () => {
        const date = addDays(startOfDay(new Date()), 7);
        setSelectedDate(date);
        setViewDate(date);
        onSelect(date);
        close();
    };

    const selectNextMonth = () => {
        const date = addMonths(startOfDay(new Date()), 1);
        setSelectedDate(date);
        setViewDate(date);
        onSelect(date);
        close();
    };

    // Select date handler
    const handleSelectDate = (date: Date) => {
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        const newDate = isSelected ? undefined : date; // Toggle selection

        setSelectedDate(newDate);
        onSelect(newDate);
        if (newDate) {
            close(); // Close popover on selection, but not on deselection
        }
    };

    // Clear date handler
    const handleClearDate = () => {
        setSelectedDate(undefined);
        onSelect(undefined);
        close();
    };

    // Confirm selection and close
    const handleConfirm = () => {
        onSelect(selectedDate);
        close();
    };

    return (
        <motion.div
            className="date-picker-popover bg-glass-100 backdrop-blur-xl rounded-lg shadow-strong border border-black/10 p-4 w-[320px]"
            initial={{opacity: 0, y: -5}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -5}}
            transition={{duration: 0.2}}
        >
            {/* Quick Date Selection Icons */}
            <div className="flex justify-between mb-4 px-4">
                <button
                    onClick={selectToday}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}today`}
                    data-tooltip-content="Today"
                >
                    <Icon name="sun" size={20} className="text-gray-500"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}today`} className="z-50"/>

                <button
                    onClick={selectTomorrow}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}tomorrow`}
                    data-tooltip-content="Tomorrow"
                >
                    <Icon name="sunset" size={20} className="text-gray-500"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}tomorrow`} className="z-50"/>

                <button
                    onClick={selectNextWeek}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}next-week`}
                    data-tooltip-content="+7 Days"
                >
                    <div className="relative">
                        <Icon name="calendar" size={20} className="text-gray-500"/>
                        <div
                            className="absolute top-0 right-0 -mt-1 -mr-1 bg-gray-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            +7
                        </div>
                    </div>
                </button>
                <Tooltip id={`${tooltipIdPrefix}next-week`} className="z-50"/>

                <button
                    onClick={selectNextMonth}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                    data-tooltip-id={`${tooltipIdPrefix}next-month`}
                    data-tooltip-content="Next Month"
                >
                    <Icon name="moon" size={20} className="text-gray-500"/>
                </button>
                <Tooltip id={`${tooltipIdPrefix}next-month`} className="z-50"/>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-medium">
                    {format(viewDate, 'MMM yyyy')}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={prevMonth}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                        aria-label="Previous month"
                    >
                        <Icon name="chevron-left" size={20} className="text-gray-500"/>
                    </button>

                    <button
                        onClick={goToToday}
                        className="w-8 h-8 flex items-center justify-center"
                        aria-label="Go to today"
                    >
                        <div className={twMerge(
                            "w-2 h-2 rounded-full",
                            isToday(viewDate) ? "bg-blue-500" : "bg-gray-300"
                        )}></div>
                    </button>

                    <button
                        onClick={nextMonth}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/15 transition-colors"
                        aria-label="Next month"
                    >
                        <Icon name="chevron-right" size={20} className="text-gray-500"/>
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="mb-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-sm text-gray-500 h-8 flex items-center justify-center">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-0">
                    {calendarDays.map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isDayToday = isToday(day);

                        return (
                            <button
                                key={i}
                                onClick={() => handleSelectDate(day)}
                                className={twMerge(
                                    "h-10 w-10 flex items-center justify-center rounded-full text-sm transition-colors mx-auto",
                                    !isCurrentMonth && "text-gray-400",
                                    isCurrentMonth && !isSelected && !isDayToday && "text-gray-800",
                                    isDayToday && !isSelected && "font-bold text-blue-500",
                                    isSelected && "bg-blue-500 text-white",
                                    !isSelected && "hover:bg-black/10"
                                )}
                                aria-label={format(day, 'MMMM d, yyyy')}
                                aria-selected={isSelected}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-2">
                {/* Time Option (Currently just a placeholder) */}
                <button
                    className="flex items-center justify-between w-full p-2 text-gray-700 hover:bg-black/10 rounded-md"
                    onClick={() => {
                    }} // This would open time picker in a future implementation
                >
                    <div className="flex items-center">
                        <Icon name="clock" size={18} className="text-gray-500 mr-2"/>
                        <span>Time</span>
                    </div>
                    <Icon name="chevron-right" size={18} className="text-gray-400"/>
                </button>

                {/* Reminder Option */}
                <button
                    className="flex items-center justify-between w-full p-2 text-gray-700 hover:bg-black/10 rounded-md"
                    onClick={() => {
                    }} // This would open reminder options in a future implementation
                >
                    <div className="flex items-center">
                        <Icon name="bell" size={18} className="text-gray-500 mr-2"/>
                        <span>Reminder</span>
                    </div>
                    <Icon name="chevron-right" size={18} className="text-gray-400"/>
                </button>

                {/* Repeat Option */}
                <button
                    className="flex items-center justify-between w-full p-2 text-gray-700 hover:bg-black/10 rounded-md"
                    onClick={() => {
                    }} // This would open repeat options in a future implementation
                >
                    <div className="flex items-center">
                        <Icon name="refresh-cw" size={18} className="text-gray-500 mr-2"/>
                        <span>Repeat</span>
                    </div>
                    <Icon name="chevron-right" size={18} className="text-gray-400"/>
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4">
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
                    className="flex-1 justify-center bg-blue-500 hover:bg-blue-600"
                    onClick={handleConfirm}
                >
                    OK
                </Button>
            </div>
        </motion.div>
    );
};

export default CustomDatePickerPopover;