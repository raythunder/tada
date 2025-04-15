// src/components/calendar/CalendarView.tsx
import React, { useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { tasksAtom, selectedTaskIdAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import { Task } from '@/types';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    getDay,
    startOfDay
} from 'date-fns';
import { enUS } from 'date-fns/locale'; // Use appropriate locale
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
// import { motion } from 'framer-motion';

const CalendarView: React.FC = () => {
    const [tasks] = useAtom(tasksAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom); // To select task on click
    const [currentMonthDate, setCurrentMonthDate] = useState(startOfDay(new Date()));

    const firstDayCurrentMonth = startOfMonth(currentMonthDate);
    const lastDayCurrentMonth = endOfMonth(currentMonthDate);

    // Get the start and end of the week range that contains the first/last day of the month
    const startDate = startOfWeek(firstDayCurrentMonth, { locale: enUS });
    const endDate = endOfWeek(lastDayCurrentMonth, { locale: enUS });

    // Generate all days to display in the grid
    const daysInGrid = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

    // Group tasks by their due date (as string YYYY-MM-DD) for quick lookup
    const tasksByDueDate = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        tasks.forEach(task => {
            if (task.dueDate && !task.completed && task.list !== 'Trash') {
                const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    const renderCalendarDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDueDate[dateKey] || [];
        const isCurrentMonth = isSameMonth(day, currentMonthDate);
        const isToday = isSameDay(day, new Date());

        return (
            <div
                key={day.toString()}
                className={twMerge(
                    'h-28 md:h-32 border-t border-l border-gray-200/80 p-1.5 flex flex-col relative transition-colors duration-150 ease-in-out',
                    !isCurrentMonth && 'bg-canvas-inset text-muted', // Style for days outside current month
                    isCurrentMonth && 'bg-canvas hover:bg-gray-50/50',
                    isToday && 'bg-primary/5',
                    getDay(day) === 0 && 'border-l-0', // No left border for Sunday
                    // Add top border to first row manually if needed, grid handles others
                )}
            >
                {/* Day Number */}
                <div className="flex justify-between items-center mb-1">
                     <span className={clsx(
                         'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                         isToday ? 'bg-primary text-white font-semibold' : 'text-gray-600',
                         !isCurrentMonth && !isToday && 'text-gray-400'
                     )}>
                        {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && isCurrentMonth && (
                        <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">
                           {dayTasks.length}
                        </span>
                    )}
                </div>

                {/* Task List */}
                {isCurrentMonth && dayTasks.length > 0 && (
                    <div className="overflow-y-auto styled-scrollbar flex-1 space-y-1 text-xs pr-1">
                        {dayTasks.slice(0, 3).map((task) => (
                            <button
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)} // Select task on click
                                className={twMerge(
                                    "w-full text-left p-1 rounded truncate transition-colors duration-150",
                                    task.completed ? 'bg-gray-100 text-muted line-through' : 'bg-primary/10 text-primary-dark hover:bg-primary/20',
                                    // Add priority colors?
                                    task.priority === 1 && !task.completed && "border-l-2 border-red-500 pl-0.5",
                                    task.priority === 2 && !task.completed && "border-l-2 border-orange-400 pl-0.5",
                                )}
                                title={task.title}
                            >
                                {task.title}
                            </button>
                        ))}
                        {dayTasks.length > 3 && (
                            <div className="text-xs text-muted-foreground pt-0.5">+{dayTasks.length - 3} more</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const previousMonth = () => setCurrentMonthDate(subMonths(currentMonthDate, 1));
    const nextMonth = () => setCurrentMonthDate(addMonths(currentMonthDate, 1));
    const goToToday = () => setCurrentMonthDate(startOfDay(new Date()));

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Or use date-fns locale

    return (
        <div className="h-full flex flex-col bg-canvas">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-200/80 flex justify-between items-center flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-800">Calendar</h1>
                <div className="flex items-center space-x-3">
                    <Button
                        onClick={goToToday}
                        variant="outline"
                        size="sm"
                        disabled={isSameMonth(currentMonthDate, new Date())} // Disable if already on current month
                    >
                        Today
                    </Button>
                    <div className="flex items-center">
                        <Button onClick={previousMonth} variant="ghost" size="icon" aria-label="Previous month">
                            <Icon name="chevron-left" size={18} />
                        </Button>
                        <span className="mx-2 text-sm font-medium w-32 text-center">
                             {format(currentMonthDate, 'MMMM yyyy', { locale: enUS })}
                        </span>
                        <Button onClick={nextMonth} variant="ghost" size="icon" aria-label="Next month">
                            <Icon name="chevron-right" size={18} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto styled-scrollbar p-1 md:p-2">
                <div className="grid grid-cols-7 border-b border-r border-gray-200/80 rounded-lg overflow-hidden shadow-subtle">
                    {/* Weekday Headers */}
                    {weekDays.map((day) => (
                        <div key={day} className="text-center py-2 text-xs font-medium text-muted-foreground bg-canvas-alt border-l border-t border-gray-200/80 first:border-l-0">
                            {day}
                        </div>
                    ))}
                    {/* Calendar Days */}
                    {daysInGrid.map(renderCalendarDay)}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;