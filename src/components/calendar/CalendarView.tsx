// src/components/calendar/CalendarView.tsx
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useAtom, useSetAtom} from 'jotai';
import {selectedTaskIdAtom, tasksAtom} from '@/store/atoms';
import {Task} from '@/types';
import {cn} from '@/lib/utils';
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
} from '@/lib/utils/dateUtils';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {ScrollArea} from "@/components/ui/scroll-area";
import Icon from "@/components/common/Icon";
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

// Draggable Task Item Refactored (Uses Button styling)
interface DraggableTaskProps {
    task: Task;
    onClick: () => void;
    isOverlay?: boolean;
}

const DraggableCalendarTask: React.FC<DraggableTaskProps> = React.memo(({task, onClick, isOverlay = false}) => {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id: `caltask-${task.id}`, data: {task, type: 'calendar-task'}, disabled: task.completed,
    });
    const parsedDueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const overdue = useMemo(() => parsedDueDate != null && isValid(parsedDueDate) && isBefore(startOfDay(parsedDueDate), startOfDay(new Date())) && !task.completed, [parsedDueDate, task.completed]);

    // Use transform for dragging, handle placeholder via opacity/visibility
    const style: React.CSSProperties = useMemo(() => ({
        transform: CSS.Translate.toString(transform),
        transition: isOverlay || !isDragging ? 'opacity 150ms ease-out' : undefined, // Only transition opacity for placeholder
        zIndex: isDragging ? 1000 : 1,
        opacity: isDragging && !isOverlay ? 0 : 1, // Make placeholder invisible
        visibility: isDragging && !isOverlay ? 'hidden' : 'visible',
        cursor: isDragging ? 'grabbing' : (task.completed ? 'default' : 'grab'),
        touchAction: task.completed ? 'auto' : 'none', // Allow scroll on completed, prevent on draggable
    }), [transform, isDragging, isOverlay, task.completed]);

    const priorityColor = useMemo(() => {
        if (task.completed || (!task.priority && task.priority !== 0) || task.priority === 4) return null;
        if (overdue) return 'bg-destructive';
        switch (task.priority) {
            case 1:
                return 'bg-red-500'; // High
            case 2:
                return 'bg-orange-400'; // Medium
            case 3:
                return 'bg-blue-500'; // Low
            default:
                return null;
        }
    }, [task.priority, task.completed, overdue]);

    const stateVariant = useMemo(() => {
        if (task.completed) return "secondary";
        if (overdue) return "destructive";
        return "outline"; // Default outline style
    }, [task.completed, overdue]);

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <Button
                variant={isOverlay ? "secondary" : stateVariant} // Use secondary for overlay, state variant otherwise
                size="sm" // Consistent small size
                onClick={onClick}
                className={cn(
                    "w-full h-auto justify-start px-1.5 py-0.5 text-xs font-medium leading-snug truncate relative", // Layout and text
                    "border", // Ensure border is present for outline/destructive
                    isOverlay && "shadow-lg bg-card/90 backdrop-blur-sm border-border", // Overlay specific styles
                    task.completed && "opacity-70 line-through italic text-muted-foreground",
                    stateVariant === "destructive" && "bg-destructive/10 border-destructive/30 text-destructive-foreground hover:bg-destructive/20", // Destructive specific
                    stateVariant === "outline" && "bg-background/50 border-border/50 hover:bg-accent/50 dark:bg-black/10 dark:hover:bg-white/10", // Outline specific
                    // Add padding left if there's a priority dot
                    priorityColor && "pl-4"
                )}
                title={task.title}
                role="button" // Explicit role
                aria-grabbed={isDragging}
                aria-disabled={task.completed}
            >
                {/* Priority Dot */}
                {priorityColor && (
                    <div
                        className={cn("absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full", priorityColor)}></div>
                )}
                <span className="truncate">
                    {task.title || <span className="italic">Untitled</span>}
                </span>
            </Button>
        </div>
    );
});
DraggableCalendarTask.displayName = 'DraggableCalendarTask';

// Droppable Day Cell (Refactored styling)
const DroppableDayCell: React.FC<{ day: Date; children: React.ReactNode; className?: string }> = React.memo(({
                                                                                                                 day,
                                                                                                                 children,
                                                                                                                 className
                                                                                                             }) => {
    const {isOver, setNodeRef} = useDroppable({
        id: `day-${format(day, 'yyyy-MM-dd')}`,
        data: {date: day, type: 'calendar-day'}
    });
    return (
        <div ref={setNodeRef} className={cn(
            'h-full w-full relative transition-colors duration-150 ease-out',
            isOver && 'bg-primary/10', // Highlight drop zone
            className
        )}>
            {children}
        </div>
    );
});
DroppableDayCell.displayName = 'DroppableDayCell';

// Month/Year Selector Refactored
interface MonthYearSelectorProps {
    currentDate: Date;
    onChange: (newDate: Date) => void;
    close: () => void; // Function to close the dropdown/popover
}

const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({currentDate, onChange, close}) => {
    const currentYear = getYear(currentDate);
    const currentMonth = getMonth(currentDate);
    const [displayYear, setDisplayYear] = useState(currentYear);
    const months = useMemo(() => Array.from({length: 12}, (_, i) => format(setMonth(new Date(), i), 'MMM')), []);

    const handleMonthChange = useCallback((monthIndex: number) => {
        let newDate = setMonth(currentDate, monthIndex);
        if (getYear(newDate) !== displayYear) newDate = setYear(newDate, displayYear);
        onChange(newDate);
        close();
    }, [currentDate, displayYear, onChange, close]);

    const changeDisplayYear = (direction: -1 | 1) => setDisplayYear(y => y + direction);
    useEffect(() => {
        setDisplayYear(getYear(currentDate));
    }, [currentDate]);

    return (
        <div className="p-2 w-56">
            <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" size="icon" onClick={() => changeDisplayYear(-1)}
                        className="w-7 h-7 text-muted-foreground" aria-label="Previous year"><Icon name="chevron-left"
                                                                                                   size={16}/></Button>
                <span className="text-sm font-medium text-foreground">{displayYear}</span>
                <Button variant="ghost" size="icon" onClick={() => changeDisplayYear(1)}
                        className="w-7 h-7 text-muted-foreground" aria-label="Next year"><Icon name="chevron-right"
                                                                                               size={16}/></Button>
            </div>
            <div className="grid grid-cols-4 gap-1">
                {months.map((month, index) => (
                    <Button
                        key={month}
                        variant={(index === currentMonth && displayYear === currentYear) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleMonthChange(index)}
                        className={cn("text-xs !h-7 justify-center", (index !== currentMonth || displayYear !== currentYear) && "text-muted-foreground hover:bg-accent")}
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


// Main Calendar View Component (Refactored)
const CalendarView: React.FC = () => {
    const [tasks, setTasks] = useAtom(tasksAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const [currentMonthDate, setCurrentMonthDate] = useState(startOfDay(new Date()));
    const [draggingTaskId, setDraggingTaskId] = useState<UniqueIdentifier | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState(false);

    const draggingTask = useMemo(() => {
        if (!draggingTaskId) return null;
        const id = draggingTaskId.toString().replace('caltask-', '');
        return tasks.find(t => t.id === id) ?? null;
    }, [draggingTaskId, tasks]);
    const firstDayCurrentMonth = useMemo(() => startOfMonth(currentMonthDate), [currentMonthDate]);
    const lastDayCurrentMonth = useMemo(() => endOfMonth(currentMonthDate), [currentMonthDate]);
    const startDate = useMemo(() => startOfWeek(firstDayCurrentMonth, {locale: enUS}), [firstDayCurrentMonth]);
    const endDate = useMemo(() => endOfWeek(lastDayCurrentMonth, {locale: enUS}), [lastDayCurrentMonth]);
    const daysInGrid = useMemo(() => eachDayOfInterval({start: startDate, end: endDate}), [startDate, endDate]);
    const numberOfRows = useMemo(() => daysInGrid.length / 7, [daysInGrid]);
    const tasksByDueDate = useMemo(() => { /* ... (same logic, uses safeParseDate) ... */
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

    const handleTaskClick = useCallback((taskId: string) => setSelectedTaskId(taskId), [setSelectedTaskId]);
    const changeMonth = useCallback((direction: -1 | 1) => {
        setCurrentMonthDate(current => direction === 1 ? addMonths(current, 1) : subMonths(current, 1));
        setExpandedDays(new Set());
    }, []);
    const goToToday = useCallback(() => {
        setCurrentMonthDate(startOfDay(new Date()));
        setExpandedDays(new Set());
    }, []);
    const handleDateChange = useCallback((newDate: Date) => {
        setCurrentMonthDate(startOfDay(newDate));
        setExpandedDays(new Set());
    }, []);

    const handleDragStart = useCallback((event: DragStartEvent) => { /* ... (same logic) ... */
        const {active} = event;
        if (active.data.current?.type === 'calendar-task') {
            setDraggingTaskId(active.id);
            setSelectedTaskId(active.data.current.task.id);
        }
    }, [setSelectedTaskId]);
    const handleDragEnd = useCallback((event: DragEndEvent) => { /* ... (same logic, uses safeParseDate) ... */
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
                    setTasks(prevTasks => prevTasks.map(task => (task.id === taskId) ? {
                        ...task,
                        dueDate: newDueDateStart.getTime(),
                        updatedAt: Date.now()
                    } : task));
                }
            }
        }
    }, [setTasks]);

    const toggleExpandDay = useCallback((dateKey: string) => { /* ... (same logic) ... */
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateKey)) newSet.delete(dateKey); else newSet.add(dateKey);
            return newSet;
        });
    }, []);


    const renderCalendarDay = useCallback((day: Date, index: number) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDueDate[dateKey] || [];
        const isCurrentMonthDay = isSameMonth(day, currentMonthDate);
        const isToday = isTodayFn(day);
        const isExpanded = expandedDays.has(dateKey);
        const MAX_VISIBLE_TASKS = 4; // Adjusted slightly for potentially taller Button tasks
        const tasksToShow = isExpanded ? dayTasks : dayTasks.slice(0, MAX_VISIBLE_TASKS);
        const hasMoreTasks = dayTasks.length > MAX_VISIBLE_TASKS;

        return (
            <DroppableDayCell key={dateKey} day={day} className={cn(
                'border-t border-l',
                isCurrentMonthDay ? 'border-border/50 bg-card/20 dark:bg-card/10' : 'border-border/30 bg-secondary/10 dark:bg-black/10 opacity-75',
                index % 7 === 0 && 'border-l-0', index < 7 && 'border-t-0',
                'flex flex-col' // Ensure flex column layout
            )}>
                {/* Day Number Header */}
                <div className="flex justify-end items-center px-1 pt-1 h-6 flex-shrink-0">
                    <span className={cn(
                        'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                        isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground',
                        !isCurrentMonthDay && !isToday && 'text-muted-foreground/60',
                    )}>
                        {format(day, 'd')}
                    </span>
                </div>
                {/* Task Area */}
                <ScrollArea className="flex-1 styled-scrollbar-thin">
                    <div className="space-y-0.5 px-1 pb-1 min-h-[60px]"> {/* Padding inside scroll */}
                        {isCurrentMonthDay && tasksToShow.map((task) => (
                            <DraggableCalendarTask key={task.id} task={task} onClick={() => handleTaskClick(task.id)}/>
                        ))}
                        {isCurrentMonthDay && hasMoreTasks && (
                            <Button
                                variant="link" size="sm"
                                onClick={() => toggleExpandDay(dateKey)}
                                className="w-full text-xs !h-5 justify-center text-primary/80 hover:text-primary"
                                aria-expanded={isExpanded}
                            >
                                {isExpanded ? 'Show Less' : `+ ${dayTasks.length - MAX_VISIBLE_TASKS} more`}
                            </Button>
                        )}
                    </div>
                </ScrollArea>
            </DroppableDayCell>
        );
    }, [tasksByDueDate, currentMonthDate, handleTaskClick, expandedDays, toggleExpandDay]);

    const weekDays = useMemo(() => ['S', 'M', 'T', 'W', 'T', 'F', 'S'], []);
    const isTodayButtonDisabled = useMemo(() => isSameDay(currentMonthDate, new Date()), [currentMonthDate]);

    return (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} collisionDetection={pointerWithin}
                    measuring={{droppable: {strategy: MeasuringStrategy.Always}}}>
            <div className="h-full flex flex-col bg-background/50 dark:bg-background/30 overflow-hidden">
                {/* Header */}
                <div className={cn(
                    "px-3 md:px-4 py-2 border-b border-border/60 flex justify-between items-center flex-shrink-0",
                    "bg-background/60 dark:bg-black/20 backdrop-blur-lg z-10 h-12 shadow-sm"
                )}>
                    <div className="w-20">
                        <h1 className="text-base font-semibold text-foreground truncate">Calendar</h1>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <Button onClick={goToToday} variant="outline" size="sm" className="!h-8 px-2.5"
                                disabled={isTodayButtonDisabled}>
                            Today
                        </Button>
                        <div className="flex items-center">
                            <Button onClick={() => changeMonth(-1)} variant="ghost" size="icon"
                                    aria-label="Previous month"
                                    className="w-8 h-8 text-muted-foreground hover:bg-accent rounded-md"><Icon
                                name="chevron-left" size={18}/></Button>
                            {/*<DropdownMenu>*/}
                            {/*    <DropdownMenuTrigger asChild>*/}
                            {/*        <Button variant="ghost" size="sm"*/}
                            {/*                className="!h-8 px-2 text-sm font-medium w-32 text-center tabular-nums text-foreground hover:bg-accent">*/}
                            {/*            {format(currentMonthDate, 'MMMM yyyy', {locale: enUS})}*/}
                            {/*            <Icon name="chevron-down" size={14} className="ml-1.5 opacity-60"/>*/}
                            {/*        </Button>*/}
                            {/*    </DropdownMenuTrigger>*/}
                            {/*    <DropdownMenuContent align="center"*/}
                            {/*                         className="bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">*/}
                            {/*        /!* Render MonthYearSelector inside DropdownMenuContent *!/*/}
                            {/*        /!* Need to pass close function from DropdownMenu *!/*/}
                            {/*        /!* DropdownMenu doesn't expose 'close', so we use Popover instead *!/*/}
                            {/*        /!* Correct approach: Use Popover for custom content *!/*/}
                            {/*        <MonthYearSelector currentDate={currentMonthDate} onChange={handleDateChange}*/}
                            {/*                           close={() => {*/}
                            {/*                           }}/>*/}
                            {/*        /!* This won't close automatically, better to use Popover *!/*/}
                            {/*    </DropdownMenuContent>*/}
                            {/*</DropdownMenu>*/}
                            {/* Replace Dropdown with Popover for MonthYearSelector */}
                            <Popover open={isMonthPopoverOpen} onOpenChange={setIsMonthPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm"
                                            className="!h-8 px-2 text-sm font-medium w-32 text-center tabular-nums text-foreground hover:bg-accent">
                                        {format(currentMonthDate, 'MMMM yyyy', {locale: enUS})}
                                        <Icon name="chevron-down" size={14} className="ml-1.5 opacity-60"/>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                                    {/* Popover gives better control for custom components */}
                                    {/*<MonthYearSelector currentDate={currentMonthDate} onChange={handleDateChange} close={() => setIsMonthPopoverOpen(false)}/>*/}
                                    {/* If Popover doesn't provide close, manage open state: */}
                                    <MonthYearSelector currentDate={currentMonthDate} onChange={(d) => {
                                        handleDateChange(d);
                                        setIsMonthPopoverOpen(false);
                                    }} close={() => setIsMonthPopoverOpen(false)}/>
                                </PopoverContent>
                            </Popover>


                            <Button onClick={() => changeMonth(1)} variant="ghost" size="icon" aria-label="Next month"
                                    className="w-8 h-8 text-muted-foreground hover:bg-accent rounded-md"><Icon
                                name="chevron-right" size={18}/></Button>
                        </div>
                    </div>
                    <div className="w-20"></div>
                    {/* Spacer */}
                </div>

                {/* Calendar Body */}
                <div className="flex-1 overflow-hidden flex flex-col p-2 md:p-3">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 flex-shrink-0 mb-1 px-0.5">
                        {weekDays.map((day, index) => (
                            <div key={`${day}-${index}`}
                                 className="text-center py-1 text-[11px] font-semibold text-muted-foreground tracking-wide">
                                {day}
                            </div>
                        ))}
                    </div>
                    {/* Day Grid Container */}
                    <div className="flex-1 min-h-0">
                        <div className={cn(
                            "grid grid-cols-7 h-full w-full gap-0",
                            numberOfRows === 5 ? "grid-rows-5" : "grid-rows-6",
                            "rounded-lg overflow-hidden shadow-inner border border-border/50", // Use inner shadow
                            "bg-gradient-to-br from-card/10 via-transparent to-transparent" // Subtle gradient
                        )}>
                            {daysInGrid.map(renderCalendarDay)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={null} className="dnd-drag-overlay">
                {draggingTask ? <DraggableCalendarTask task={draggingTask} onClick={() => {
                }} isOverlay={true}/> : null}
            </DragOverlay>
        </DndContext>
    );
};
CalendarView.displayName = 'CalendarView';
export default CalendarView;