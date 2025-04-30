// src/components/calendar/CalendarView.tsx
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useAtom, useSetAtom} from 'jotai';
import {selectedTaskIdAtom, tasksAtom} from '@/store/atoms';
import Button from '../common/Button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from '@/components/common/Dropdown'; // Use Radix Dropdown
import {Task} from '@/types';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    enUS,
    format,
    getMonth,
    getYear,
    isBefore,
    isSameDay,
    isSameMonth,
    isToday as isTodayFn,
    isValid,
    safeParseDate,
    setMonth,
    setYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths
} from '@/utils/dateUtils';
import {twMerge} from 'tailwind-merge';
import {clsx} from 'clsx';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    MeasuringStrategy,
    pointerWithin,
    UniqueIdentifier,
    useDraggable,
    useDroppable
} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';
import Icon from "@/components/common/Icon";

// --- Draggable Task Item (Styling refined for Apple feel) ---
interface DraggableTaskProps {
    task: Task;
    onClick: () => void;
    isOverlay?: boolean;
}

const DraggableCalendarTask: React.FC<DraggableTaskProps> = React.memo(({task, onClick, isOverlay = false}) => {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id: `caltask-${task.id}`,
        data: {task, type: 'calendar-task'},
        disabled: task.completed,
    });

    const parsedDueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const overdue = useMemo(() => parsedDueDate != null && isValid(parsedDueDate) && isBefore(startOfDay(parsedDueDate), startOfDay(new Date())) && !task.completed, [parsedDueDate, task.completed]);

    // Style for drag behavior (keep position:absolute fix)
    const style: React.CSSProperties = useMemo(() => {
        const base: React.CSSProperties = {
            transform: CSS.Translate.toString(transform),
            transition: isOverlay ? undefined : 'opacity 150ms ease-out, visibility 150ms ease-out',
            zIndex: isDragging ? 1000 : 1,
            cursor: isDragging ? 'grabbing' : (task.completed ? 'default' : 'grab'),
            position: 'relative',
            opacity: 1,
            visibility: 'visible',
        };
        if (isDragging && !isOverlay) {
            base.position = 'absolute'; // Hide original item without affecting layout
            base.opacity = 0;
            base.visibility = 'hidden';
            base.pointerEvents = 'none';
        }
        return base;
    }, [transform, isDragging, isOverlay, task.completed]);

    // State-based styling using Tailwind classes
    const stateClasses = useMemo(() => {
        if (task.completed) {
            return 'bg-neutral-200/40 dark:bg-neutral-700/30 border-transparent text-neutral-500 dark:text-neutral-400 line-through italic opacity-75';
        }
        if (overdue) {
            return 'bg-red-100/60 dark:bg-red-900/40 border-red-400/30 dark:border-red-600/40 text-red-700 dark:text-red-300 hover:bg-red-100/80 dark:hover:bg-red-900/50 hover:border-red-400/40 dark:hover:border-red-600/50';
        }
        // Default non-completed, non-overdue style
        return 'bg-white/60 dark:bg-neutral-700/40 border-black/10 dark:border-white/10 text-neutral-800 dark:text-neutral-100 hover:bg-white/80 dark:hover:bg-neutral-700/60 hover:border-black/15 dark:hover:border-white/15';
    }, [task.completed, overdue]);

    // Priority dot color
    const dotColor = useMemo(() => {
        if (task.completed || (!task.priority && task.priority !== 0) || task.priority === 4) return null;
        if (overdue) return 'bg-red-500 dark:bg-red-400';
        switch (task.priority) {
            case 1:
                return 'bg-red-500 dark:bg-red-400';
            case 2:
                return 'bg-orange-400 dark:bg-orange-300';
            case 3:
                return 'bg-blue-500 dark:bg-blue-400';
            default:
                return null;
        }
    }, [task.priority, task.completed, overdue]);

    // Combine base, state, and overlay styles
    const baseClasses = useMemo(() => twMerge(
        "flex items-center w-full text-left px-1.5 py-1 rounded space-x-1.5 group", // Adjusted padding/spacing
        "border backdrop-blur-sm transition-all duration-150 ease-out",
        stateClasses,
        'text-[12px] font-medium leading-snug truncate', // Slightly smaller font
        isOverlay && "bg-glass-100 dark:bg-neutral-700/90 backdrop-blur-md shadow-lg border-black/20 dark:border-white/20 !text-gray-800 dark:!text-gray-100 !opacity-100 !visibility-visible !relative",
    ), [stateClasses, isOverlay]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onClick}
            className={baseClasses}
            title={task.title}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            aria-grabbed={isDragging}
            aria-disabled={task.completed}
        >
            {dotColor && (
                <div className={twMerge("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)}></div>
            )}
            <span className={twMerge("flex-1 truncate", !dotColor && "ml-[0px]")}> {/* Adjust margin if no dot */}
                {task.title || <span className="italic">Untitled</span>}
            </span>
        </div>
    );
});
DraggableCalendarTask.displayName = 'DraggableCalendarTask';


// --- Year/Month Selector Component (Used within Radix Dropdown) ---
interface MonthYearSelectorProps { // Removed DropdownRenderProps, not needed directly
    currentDate: Date;
    onChange: (newDate: Date) => void;
    closeDropdown: () => void; // Function to close the parent dropdown
}

const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({currentDate, onChange, closeDropdown}) => {
    const currentYear = getYear(currentDate);
    const currentMonth = getMonth(currentDate);
    const [displayYear, setDisplayYear] = useState(currentYear);

    const months = useMemo(() => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);

    const handleMonthChange = useCallback((monthIndex: number) => {
        let newDate = setMonth(currentDate, monthIndex);
        if (getYear(newDate) !== displayYear) {
            newDate = setYear(newDate, displayYear);
        }
        onChange(newDate);
        closeDropdown(); // Close dropdown after selection
    }, [currentDate, displayYear, onChange, closeDropdown]);

    const changeDisplayYear = (direction: -1 | 1) => {
        setDisplayYear(y => y + direction);
    };

    useEffect(() => {
        setDisplayYear(getYear(currentDate)); // Sync display year if currentDate changes externally
    }, [currentDate]);

    return (
        // Removed outer padding, handled by DropdownMenuContent
        <div className="w-56 ignore-click-away"> {/* Ignore clicks inside */}
            {/* Year Selector */}
            <div className="flex items-center justify-between mb-2 px-1">
                <Button
                    variant="ghost" size="icon" icon="chevron-left"
                    onClick={() => changeDisplayYear(-1)}
                    className="w-7 h-7 text-gray-500 dark:text-neutral-400 hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label="Previous year"
                />
                <span
                    className="text-sm font-medium text-gray-700 dark:text-neutral-200 tabular-nums">{displayYear}</span>
                <Button
                    variant="ghost" size="icon" icon="chevron-right"
                    onClick={() => changeDisplayYear(1)}
                    className="w-7 h-7 text-gray-500 dark:text-neutral-400 hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label="Next year"
                />
            </div>
            {/* Month Grid */}
            <div className="grid grid-cols-4 gap-1">
                {months.map((month, index) => (
                    <Button
                        key={month}
                        // Style based on selection relative to displayYear
                        variant={(index === currentMonth && displayYear === currentYear) ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleMonthChange(index)}
                        className={twMerge(
                            "text-xs !h-7 justify-center",
                            (index === currentMonth && displayYear === currentYear)
                                ? "!bg-primary !text-primary-foreground" // Active style
                                : "text-gray-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10" // Inactive style
                        )}
                        aria-pressed={index === currentMonth && displayYear === currentYear}
                    >
                        {month}
                    </Button>
                ))}
            </div>
        </div>
    );
};
MonthYearSelector.displayName = 'MonthYearSelector';


// --- Droppable Day Cell Components (Keep internal logic, refine styles) ---
interface DroppableDayCellContentProps {
    children: React.ReactNode;
    className?: string;
    isOver: boolean;
}

const DroppableDayCellContent: React.FC<DroppableDayCellContentProps> = React.memo(({children, className, isOver}) => {
    const cellClasses = useMemo(() => twMerge(
        'h-full w-full transition-colors duration-150 ease-out flex flex-col',
        'relative', // Keep relative for positioning dragged items
        className,
        isOver && 'bg-blue-500/10 dark:bg-blue-400/10' // Subtle drop indicator
    ), [className, isOver]);

    return <div className={cellClasses}>{children}</div>;
});
DroppableDayCellContent.displayName = 'DroppableDayCellContent';

const DroppableDayCell: React.FC<{ day: Date; children: React.ReactNode; className?: string }> = React.memo(({
                                                                                                                 day,
                                                                                                                 children,
                                                                                                                 className
                                                                                                             }) => {
    const {isOver, setNodeRef} = useDroppable({
        id: `day-${format(day, 'yyyy-MM-dd')}`,
        data: {date: day, type: 'calendar-day'},
    });

    // Container div takes the ref
    return (
        <div ref={setNodeRef} className="h-full w-full">
            <DroppableDayCellContent className={className} isOver={isOver}>
                {children}
            </DroppableDayCellContent>
        </div>
    );
});
DroppableDayCell.displayName = 'DroppableDayCell';


// --- Main Calendar View Component ---
const CalendarView: React.FC = () => {
    // State and Atoms (keep as is)
    const [tasks, setTasks] = useAtom(tasksAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const [currentMonthDate, setCurrentMonthDate] = useState(startOfDay(new Date()));
    const [draggingTaskId, setDraggingTaskId] = useState<UniqueIdentifier | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

    // Memoized dragging task (keep as is)
    const draggingTask = useMemo(() => {
        if (!draggingTaskId) return null;
        const id = draggingTaskId.toString().replace('caltask-', '');
        return tasks.find(t => t.id === id) ?? null;
    }, [draggingTaskId, tasks]);

    // Memoized date calculations (keep as is)
    const firstDayCurrentMonth = useMemo(() => startOfMonth(currentMonthDate), [currentMonthDate]);
    const lastDayCurrentMonth = useMemo(() => endOfMonth(currentMonthDate), [currentMonthDate]);
    const startDate = useMemo(() => startOfWeek(firstDayCurrentMonth, {locale: enUS}), [firstDayCurrentMonth]);
    const endDate = useMemo(() => endOfWeek(lastDayCurrentMonth, {locale: enUS}), [lastDayCurrentMonth]);
    const daysInGrid = useMemo(() => eachDayOfInterval({start: startDate, end: endDate}), [startDate, endDate]);
    const numberOfRows = useMemo(() => daysInGrid.length / 7, [daysInGrid]);

    // Memoized task grouping and sorting (keep as is)
    const tasksByDueDate = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        tasks.forEach(task => {
            if (task.dueDate && task.list !== 'Trash') {
                const parsedDate = safeParseDate(task.dueDate);
                if (parsedDate && isValid(parsedDate)) {
                    const dateKey = format(parsedDate, 'yyyy-MM-dd');
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(task);
                }
            }
        });
        Object.values(grouped).forEach(dayTasks => {
            dayTasks.sort((a, b) => {
                const priorityA = a.completed ? 99 : (a.priority ?? 5);
                const priorityB = b.completed ? 99 : (b.priority ?? 5);
                if (priorityA !== priorityB) return priorityA - priorityB;
                const orderA = a.order ?? a.createdAt ?? 0;
                const orderB = b.order ?? b.createdAt ?? 0;
                return orderA - orderB;
            });
        });
        return grouped;
    }, [tasks]);

    // Callbacks (Task Click, Month Change, Today, Date Change - keep as is)
    const handleTaskClick = useCallback((taskId: string) => {
        setSelectedTaskId(taskId);
    }, [setSelectedTaskId]);

    const changeMonth = useCallback((direction: -1 | 1) => {
        setCurrentMonthDate(current => direction === 1 ? addMonths(current, 1) : subMonths(current, 1));
        setExpandedDays(new Set()); // Reset expanded days on month change
    }, []);

    const goToToday = useCallback(() => {
        setCurrentMonthDate(startOfDay(new Date()));
        setExpandedDays(new Set());
    }, []);

    // Handle date selection from the MonthYearSelector dropdown
    const handleDateChangeFromDropdown = useCallback((newDate: Date) => {
        setCurrentMonthDate(startOfDay(newDate));
        setExpandedDays(new Set());
    }, []);

    // Drag Handlers (keep as is)
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const {active} = event;
        if (active.data.current?.type === 'calendar-task') {
            setDraggingTaskId(active.id);
            // Keep task selected during drag for context
            setSelectedTaskId(active.data.current.task.id);
        }
    }, [setSelectedTaskId]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setDraggingTaskId(null);
        const {active, over} = event;

        if (over?.data.current?.type === 'calendar-day' && active.data.current?.type === 'calendar-task') {
            const taskId = active.data.current.task.id as string;
            const targetDay = over.data.current?.date as Date | undefined;
            const originalTask = active.data.current?.task as Task | undefined;

            if (taskId && targetDay && originalTask && !originalTask.completed) {
                const originalDateTime = safeParseDate(originalTask.dueDate);
                const currentDueDateStart = originalDateTime ? startOfDay(originalDateTime) : null;
                const newDueDateStart = startOfDay(targetDay);

                if (!currentDueDateStart || !isSameDay(currentDueDateStart, newDueDateStart)) {
                    setTasks(prevTasks =>
                        prevTasks.map(task => {
                            if (task.id === taskId) {
                                return {...task, dueDate: newDueDateStart.getTime(), updatedAt: Date.now()};
                            }
                            return task;
                        })
                    );
                }
            }
        }
        // Optionally deselect after drop, or keep selected
        // setSelectedTaskId(null);
    }, [setTasks]);

    // Toggle expanded state for a day (keep as is)
    const toggleExpandDay = useCallback((dateKey: string) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateKey)) newSet.delete(dateKey);
            else newSet.add(dateKey);
            return newSet;
        });
    }, []);


    // Render function for calendar days (Refined styles)
    const renderCalendarDay = useCallback((day: Date, index: number) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDueDate[dateKey] || [];
        const isCurrentMonthDay = isSameMonth(day, currentMonthDate);
        const isToday = isTodayFn(day);

        const isExpanded = expandedDays.has(dateKey);
        const MAX_VISIBLE_TASKS = 4; // Adjusted max visible tasks
        const tasksToShow = isExpanded ? dayTasks : dayTasks.slice(0, MAX_VISIBLE_TASKS);
        const hasMoreTasks = dayTasks.length > MAX_VISIBLE_TASKS;

        return (
            <DroppableDayCell
                key={dateKey}
                day={day}
                className={twMerge(
                    // Borders - subtle divisions
                    'border-t border-l border-black/5 dark:border-white/5',
                    // Background and opacity based on month
                    isCurrentMonthDay
                        ? 'bg-white/20 dark:bg-neutral-800/20' // Subtle bg for current month
                        : 'bg-neutral-100/10 dark:bg-neutral-900/10 opacity-70', // Dimmed for other months
                    // Remove outer borders
                    index % 7 === 0 && 'border-l-0',
                    index < 7 && 'border-t-0',
                    'overflow-hidden' // Prevent content bleed
                )}
            >
                {/* Day Number Header */}
                <div className="flex justify-end items-center px-1 pt-1 h-6 flex-shrink-0">
                    <span className={clsx(
                        'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                        isToday ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-300',
                        !isCurrentMonthDay && !isToday && 'text-neutral-400/80 dark:text-neutral-500/80',
                    )}>
                        {format(day, 'd')}
                    </span>
                </div>

                {/* Task Area - scrolls internally */}
                <div className="flex-1 space-y-0.5 px-1 pb-1 overflow-y-auto styled-scrollbar-thin min-h-[60px]">
                    {isCurrentMonthDay && tasksToShow.map((task) => (
                        <DraggableCalendarTask
                            key={task.id}
                            task={task}
                            onClick={() => handleTaskClick(task.id)}
                        />
                    ))}
                    {/* Render toggle button for Show More/Less */}
                    {isCurrentMonthDay && hasMoreTasks && (
                        <button
                            onClick={() => toggleExpandDay(dateKey)}
                            className={twMerge(
                                "w-full text-[10px] text-center py-0.5 px-1 mt-0.5 rounded",
                                "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300",
                                "bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 dark:hover:bg-blue-500/20",
                                "transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                            )}
                            aria-expanded={isExpanded}
                        >
                            {isExpanded ? 'Show Less' : `+ ${dayTasks.length - MAX_VISIBLE_TASKS} more`}
                        </button>
                    )}
                </div>
            </DroppableDayCell>
        );
    }, [tasksByDueDate, currentMonthDate, handleTaskClick, expandedDays, toggleExpandDay]); // Dependencies for render

    const weekDays = useMemo(() => ['S', 'M', 'T', 'W', 'T', 'F', 'S'], []); // Keep short names
    const isTodayButtonDisabled = useMemo(() => isSameDay(currentMonthDate, new Date()), [currentMonthDate]);


    return (
        <DndContext
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            collisionDetection={pointerWithin}
            measuring={{droppable: {strategy: MeasuringStrategy.Always}}}
        >
            {/* Use a neutral background for the calendar page */}
            <div className="h-full flex flex-col bg-canvas-alt dark:bg-neutral-900 overflow-hidden">
                {/* Header */}
                <div className={twMerge(
                    "px-3 md:px-4 py-2 border-b border-black/10 dark:border-white/10",
                    "flex justify-between items-center flex-shrink-0",
                    "bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-lg z-10 h-12 shadow-sm" // Subtle header style
                )}>
                    {/* Left placeholder (or title) */}
                    <div className="w-20">
                        {/* Optionally keep title if IconBar is hidden for this view */}
                        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">Calendar</h1>
                    </div>

                    {/* Center: Navigation */}
                    <div className="flex items-center space-x-1">
                        <Button
                            onClick={goToToday}
                            variant="secondary" // Use secondary variant
                            size="sm"
                            className="!h-8 px-2.5 tabular-nums" // Adjusted height and padding
                            disabled={isTodayButtonDisabled}
                        >
                            Today
                        </Button>
                        <div className="flex items-center">
                            <Button onClick={() => changeMonth(-1)} variant="ghost" size="icon" icon="chevron-left"
                                    aria-label="Previous month"
                                    className="w-8 h-8 text-gray-500 dark:text-neutral-400 hover:bg-black/15 dark:hover:bg-white/10 rounded-md"/>
                            {/* Radix Dropdown for Month/Year Selection */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm"
                                            className="!h-8 px-2 text-sm font-medium w-32 text-center tabular-nums text-gray-700 dark:text-neutral-200 hover:bg-black/15 dark:hover:bg-white/10">
                                        {format(currentMonthDate, 'MMMM yyyy', {locale: enUS})}
                                        <Icon name="chevron-down" size={14} className="ml-1.5 opacity-60"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="p-0" align="center">
                                    {/* Pass close function to the selector */}
                                    {/* Radix DropdownMenu manages closing, so we don't need DropdownRenderProps here */}
                                    <MonthYearSelector
                                        currentDate={currentMonthDate}
                                        onChange={handleDateChangeFromDropdown}
                                        closeDropdown={() => {
                                        }} // No-op needed, Radix handles close
                                    />
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => changeMonth(1)} variant="ghost" size="icon" icon="chevron-right"
                                    aria-label="Next month"
                                    className="w-8 h-8 text-gray-500 dark:text-neutral-400 hover:bg-black/15 dark:hover:bg-white/10 rounded-md"/>
                        </div>
                    </div>

                    {/* Right Placeholder */}
                    <div className="w-20"></div>
                </div>

                {/* Calendar Body */}
                <div className="flex-1 overflow-hidden flex flex-col p-2 md:p-3">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 flex-shrink-0 mb-1 px-0.5">
                        {weekDays.map((day, index) => (
                            <div key={`${day}-${index}`}
                                 className="text-center py-1 text-[11px] font-semibold text-gray-500/80 dark:text-neutral-400/80 tracking-wide uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Day Grid Container */}
                    <div className="flex-1 min-h-0">
                        <div className={twMerge(
                            "grid grid-cols-7 h-full w-full",
                            "gap-0", // Rely on cell borders
                            numberOfRows === 5 ? "grid-rows-5" : "grid-rows-6",
                            "rounded-lg overflow-hidden shadow-lg border border-black/10 dark:border-white/10", // Subtle border
                            "bg-gradient-to-br from-white/5 via-transparent to-transparent dark:from-neutral-800/5 dark:via-transparent dark:to-transparent" // Very subtle gradient
                        )}>
                            {daysInGrid.map(renderCalendarDay)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={null}>
                {draggingTask ? (
                    <DraggableCalendarTask
                        task={draggingTask}
                        onClick={() => {
                        }} // Overlay isn't clickable
                        isOverlay={true}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
CalendarView.displayName = 'CalendarView';
export default CalendarView;