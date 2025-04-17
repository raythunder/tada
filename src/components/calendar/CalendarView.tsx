// src/components/calendar/CalendarView.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useAtom } from 'jotai';
import { tasksAtom, selectedTaskIdAtom } from '@/store/atoms';
// import Icon from '../common/Icon';
import Button from '../common/Button';
import { Task } from '@/types';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
    addMonths, subMonths, isSameMonth, isSameDay, getDay, startOfDay, isBefore, enUS, safeParseDate, isToday as isTodayFn
} from '@/utils/dateUtils'; // Use re-exported functions and utils
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import {
    DndContext, DragEndEvent, DragStartEvent, useDraggable, useDroppable,
    DragOverlay, pointerWithin, MeasuringStrategy, UniqueIdentifier
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';

// --- Draggable Task Item for Calendar ---
interface DraggableTaskProps {
    task: Task;
    onClick: () => void;
    style?: React.CSSProperties; // For DragOverlay
}

const DraggableCalendarTask: React.FC<DraggableTaskProps> = ({ task, onClick, style: overlayStyle }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `caltask-${task.id}`, // Unique prefix for calendar tasks
        data: { task, type: 'calendar-task' },
    });

    const style = {
        ...overlayStyle, // Apply overlay styles if provided
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    const isOverdue = task.dueDate != null && isBefore(startOfDay(safeParseDate(task.dueDate)!), startOfDay(new Date())) && !task.completed;

    // Base classes - subtle radius, margin
    const baseClasses = twMerge(
        "w-full text-left px-1.5 py-0.5 rounded-[5px] truncate text-[11px] transition-all duration-100 cursor-grab relative mb-0.5",
        task.completed ? 'bg-gray-100 text-muted line-through italic opacity-70 pointer-events-none' : 'bg-primary/10 text-primary-dark hover:bg-primary/20',
        // Priority indicators as subtle dots
        task.priority === 1 && !task.completed && "pl-3 before:content-[''] before:absolute before:left-[5px] before:top-1/2 before:-translate-y-1/2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-red-500",
        task.priority === 2 && !task.completed && "pl-3 before:content-[''] before:absolute before:left-[5px] before:top-1/2 before:-translate-y-1/2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-orange-400",
        // Overdue style overrides priority dot color
        isOverdue && !task.completed && 'text-red-600 bg-red-500/10 hover:bg-red-500/20 before:bg-red-600',
        isDragging && "shadow-medium bg-white ring-1 ring-primary/50", // Style for the original item while dragging
        overlayStyle && "shadow-strong ring-1 ring-primary/50" // Style for the item in the overlay
    );

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onClick}
            className={baseClasses}
            title={task.title}
        >
            {task.title || <span className="italic text-muted">Untitled</span>}
        </button>
    );
}

// --- Droppable Day Cell ---
interface DroppableDayProps {
    day: Date;
    children: React.ReactNode;
    className?: string;
    isOver: boolean; // Pass isOver state down
}

// Content part of the cell - apply isOver style here and ensure height fills
const DroppableDayCellContent: React.FC<DroppableDayProps> = ({ day: _day, children, className, isOver }) => {
    return (
        <div
            className={twMerge(
                'h-full', // Ensure content div takes full height
                className, // Allow external classes
                // Subtle highlight effect on drop target
                isOver && 'bg-primary/10 ring-1 ring-inset ring-primary/30 scale-[1.01] transition-all duration-150'
            )}
        >
            {children}
        </div>
    );
};

// Wrapper for Droppable functionality - takes full height of grid cell
const DroppableDayCell: React.FC<{ day: Date; children: React.ReactNode; className?: string }> = ({ day, children, className }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `day-${format(day, 'yyyy-MM-dd')}`, // Unique ID for the day cell
        data: { date: day, type: 'calendar-day' },
    });

    return (
        // This div takes the grid cell space and passes ref to dnd-kit
        <div ref={setNodeRef} className="h-full w-full">
            {/* Pass content and styling down */}
            <DroppableDayCellContent day={day} className={className} isOver={isOver}>
                {children}
            </DroppableDayCellContent>
        </div>
    );
};

// --- Main Calendar View Component ---
const CalendarView: React.FC = () => {
    const [tasks, setTasks] = useAtom(tasksAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const [currentMonthDate, setCurrentMonthDate] = useState(startOfDay(new Date()));
    const [draggingTaskId, setDraggingTaskId] = useState<UniqueIdentifier | null>(null);
    const [monthDirection, setMonthDirection] = useState<number>(0);

    const draggingTask = useMemo(() => {
        if (!draggingTaskId) return null;
        const id = draggingTaskId.toString().replace('caltask-', '');
        return tasks.find(t => t.id === id) ?? null;
    }, [draggingTaskId, tasks]);

    const firstDayCurrentMonth = startOfMonth(currentMonthDate);
    const lastDayCurrentMonth = endOfMonth(currentMonthDate);
    const startDate = startOfWeek(firstDayCurrentMonth, { locale: enUS });
    const endDate = endOfWeek(lastDayCurrentMonth, { locale: enUS });
    const daysInGrid = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

    const tasksByDueDate = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        tasks.forEach(task => {
            if (task.dueDate && task.list !== 'Trash') {
                const parsedDate = safeParseDate(task.dueDate);
                if (parsedDate) {
                    const dateKey = format(parsedDate, 'yyyy-MM-dd');
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(task);
                }
            }
        });
        Object.values(grouped).forEach(dayTasks => {
            dayTasks.sort((a, b) => ((a.priority ?? 5) - (b.priority ?? 5)) || (b.createdAt - a.createdAt));
        });
        return grouped;
    }, [tasks]);

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId);
    };

    const changeMonth = (direction: -1 | 1) => {
        setMonthDirection(direction);
        setCurrentMonthDate(current => direction === 1 ? addMonths(current, 1) : subMonths(current, 1));
    };

    const goToToday = () => {
        const todayMonthStart = startOfMonth(new Date());
        const currentMonthStart = startOfMonth(currentMonthDate);
        if (isBefore(todayMonthStart, currentMonthStart)) setMonthDirection(-1);
        else if (isBefore(currentMonthStart, todayMonthStart)) setMonthDirection(1);
        else setMonthDirection(0);
        setCurrentMonthDate(startOfDay(new Date()));
    };

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'calendar-task') {
            setDraggingTaskId(active.id);
            setSelectedTaskId(active.data.current.task.id);
        }
    }, [setSelectedTaskId]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setDraggingTaskId(null);
        const { active, over } = event;

        if (over?.data.current?.type === 'calendar-day' && active.data.current?.type === 'calendar-task') {
            const taskId = active.data.current.task.id as string;
            const targetDay = over.data.current?.date as Date | undefined;
            const originalTask = active.data.current?.task as Task | undefined;

            if (taskId && targetDay && originalTask) {
                const currentDueDate = originalTask.dueDate ? startOfDay(safeParseDate(originalTask.dueDate)!) : null;
                const newDueDate = startOfDay(targetDay);

                if (!currentDueDate || !isSameDay(currentDueDate, newDueDate)) {
                    setTasks((prevTasks: Task[]) =>
                        prevTasks.map(task => {
                            if (task.id === taskId) {
                                const originalDateTime = safeParseDate(task.dueDate);
                                let newTimestamp = newDueDate.getTime();

                                if (originalDateTime) {
                                    const hours = originalDateTime.getHours();
                                    const minutes = originalDateTime.getMinutes();
                                    const seconds = originalDateTime.getSeconds();
                                    const updatedDateWithTime = new Date(newDueDate);
                                    updatedDateWithTime.setHours(hours, minutes, seconds, 0);
                                    newTimestamp = updatedDateWithTime.getTime();
                                }
                                return { ...task, dueDate: newTimestamp, updatedAt: Date.now() };
                            }
                            return task;
                        })
                    );
                }
            }
        }
    }, [setTasks]);

    // Subtle month text animation
    const monthTextVariants = {
        initial: (direction: number) => ({ opacity: 0, x: direction > 0 ? 5 : (direction < 0 ? -5 : 0) }),
        animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
        exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -5 : (direction < 0 ? 5 : 0), transition: { duration: 0.15, ease: 'easeIn' } }),
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // --- Render Function for a Single Day Cell ---
    const renderCalendarDay = (day: Date, index: number) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDueDate[dateKey] || [];
        const isCurrentMonthDay = isSameMonth(day, currentMonthDate);
        const isToday = isTodayFn(day);
        const dayOfWeek = getDay(day);
        const MAX_VISIBLE_TASKS = 3; // Max tasks before "+ X more"

        return (
            <DroppableDayCell
                key={day.toISOString()}
                day={day}
                className={twMerge(
                    'flex flex-col relative transition-colors duration-150 ease-in-out overflow-hidden', // flex-col needed for flex-1 to work below
                    'border-t border-l border-border-color/70',
                    !isCurrentMonthDay && 'bg-canvas-inset/50',
                    isCurrentMonthDay && 'bg-canvas',
                    dayOfWeek === 0 && 'border-l-0',
                    index < 7 && 'border-t-0',
                    'group'
                )}
            >
                {/* Day Number Header */}
                <div className="flex justify-between items-center px-1.5 pt-1 pb-0.5 flex-shrink-0">
                    <span className={clsx(
                        'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full transition-colors duration-150',
                        isToday ? 'bg-primary text-white font-semibold shadow-sm' : 'text-gray-600',
                        !isCurrentMonthDay && !isToday && 'text-gray-400 opacity-60'
                    )}>
                        {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && isCurrentMonthDay && (
                        // Removed subtle animation from badge for less clutter
                        <span className="text-[10px] text-muted-foreground bg-gray-100/80 px-1 py-0.5 rounded-full font-mono">
                            {dayTasks.length}
                        </span>
                    )}
                </div>

                {/* Task List Area - Use flex-1 to make it grow */}
                <div className="overflow-y-auto styled-scrollbar flex-1 space-y-0.5 px-1 pb-1 min-h-[50px]">
                    {isCurrentMonthDay && dayTasks.slice(0, MAX_VISIBLE_TASKS).map((task) => (
                        <DraggableCalendarTask
                            key={task.id}
                            task={task}
                            onClick={() => handleTaskClick(task.id)}
                        />
                    ))}
                    {isCurrentMonthDay && dayTasks.length > MAX_VISIBLE_TASKS && (
                        <div className="text-[10px] text-muted pt-0.5 px-1 text-center opacity-80">
                            + {dayTasks.length - MAX_VISIBLE_TASKS} more
                        </div>
                    )}
                </div>
                {!isCurrentMonthDay && (
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 opacity-30 pointer-events-none"></div>
                )}
            </DroppableDayCell>
        );
    };

    // --- Main Component Render ---
    return (
        <DndContext
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            collisionDetection={pointerWithin}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
            <div className="h-full flex flex-col bg-canvas overflow-hidden">
                {/* Header with Glass Effect */}
                <div className="px-4 py-2 border-b border-black/5 flex justify-between items-center flex-shrink-0 bg-glass-200 backdrop-blur-sm z-10">
                    <h1 className="text-lg font-semibold text-gray-800">Calendar</h1>
                    <div className="flex items-center space-x-3">
                        <Button
                            onClick={goToToday}
                            variant="outline"
                            size="sm"
                            disabled={isSameMonth(currentMonthDate, new Date()) && isTodayFn(currentMonthDate)}
                        >
                            Today
                        </Button>
                        <div className="flex items-center">
                            <Button onClick={() => changeMonth(-1)} variant="ghost" size="icon" aria-label="Previous month" className="w-7 h-7 text-muted-foreground" icon="chevron-left" />
                            <AnimatePresence mode="wait" initial={false} custom={monthDirection}>
                                <motion.span
                                    key={format(currentMonthDate, 'yyyy-MM')}
                                    className="mx-2 text-sm font-medium w-28 text-center tabular-nums text-gray-700"
                                    custom={monthDirection}
                                    variants={monthTextVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    {format(currentMonthDate, 'MMMM yyyy', { locale: enUS })}
                                </motion.span>
                            </AnimatePresence>
                            <Button onClick={() => changeMonth(1)} variant="ghost" size="icon" aria-label="Next month" className="w-7 h-7 text-muted-foreground" icon="chevron-right" />
                        </div>
                    </div>
                </div>

                {/* Calendar Grid Container */}
                <div className="flex-1 overflow-hidden p-3">
                    <div className="h-full w-full flex flex-col rounded-lg overflow-hidden shadow-subtle border border-border-color/60 bg-white">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 flex-shrink-0 border-b border-border-color/70">
                            {weekDays.map((day) => (
                                <div key={day} className="text-center py-1.5 text-[11px] font-semibold text-muted-foreground bg-canvas-alt/70 border-l border-border-color/70 first:border-l-0">
                                    {day}
                                </div>
                            ))}
                        </div>
                        {/* Calendar Days Grid - takes remaining space */}
                        {/* Use explicit height calculation for rows to ensure they fill the space */}
                        <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0">
                            {daysInGrid.map(renderCalendarDay)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drag Overlay for visual feedback */}
            <DragOverlay dropAnimation={null}>
                {draggingTask ? (
                    <DraggableCalendarTask
                        task={draggingTask}
                        onClick={() => {}}
                        style={{
                            boxShadow: '0 6px 10px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.08)',
                            cursor: 'grabbing'
                        }}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default CalendarView;