// src/components/tasks/TaskList.tsx
import React, {useCallback, useMemo, useRef, useState} from 'react';
import TaskItem from './TaskItem';
import {useAtomValue, useSetAtom} from 'jotai';
import {
    currentFilterAtom,
    groupedAllTasksAtom,
    rawSearchResultsAtom,
    searchTermAtom,
    selectedTaskIdAtom,
    tasksAtom
} from '@/store/atoms';
import {Task, TaskGroupCategory} from '@/types';
import {cn} from '@/lib/utils';
import {
    addDays,
    isBefore,
    isOverdue,
    isToday,
    isValid,
    isWithinNext7Days,
    safeParseDate,
    startOfDay,
    subDays
} from '@/lib/utils/dateUtils';
import Icon from '../common/Icon';
import {Button} from '@/components/ui/button';
import {ScrollArea} from "@/components/ui/scroll-area";
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'; // For header date picker
import CustomDatePickerPopover from '../common/CustomDatePickerPopover'; // Use the refactored one
import {
    closestCenter,
    defaultDropAnimationSideEffects,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    DropAnimation,
    KeyboardSensor,
    MeasuringStrategy,
    PointerSensor,
    UniqueIdentifier,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {AnimatePresence, motion} from 'framer-motion';
import {TaskItemMenuProvider} from '@/context/TaskItemMenuContext';
import {ScrollAreaViewport} from "@radix-ui/react-scroll-area";

interface TaskListProps {
    title: string;
}

// Task Group Header (Styling refined, uses Button)
const TaskGroupHeader: React.FC<{
    title: string;
    groupKey: TaskGroupCategory;
    onRescheduleAllClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}> = React.memo(({title, groupKey, onRescheduleAllClick}) => (
    <div
        className="flex items-center justify-between px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-20 bg-background/80 dark:bg-background/60 backdrop-blur-lg"
        // Masking effect for fading edge
        style={{
            WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
        }}
    >
        <span>{title}</span>
        {groupKey === 'overdue' && onRescheduleAllClick && (
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost" size="sm"
                        // Use Reschedule All text for clarity
                        className="text-xs !h-5 px-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 -mr-1"
                        title="Reschedule all overdue tasks..."
                        onClick={onRescheduleAllClick} // Pass click handler if needed by Popover logic, though often not
                    >
                        <Icon name="calendar-check" size={12} className="mr-1"/>
                        Reschedule All
                    </Button>
                </PopoverTrigger>
                {/* PopoverContent will be rendered by the parent component */}
            </Popover>
        )}
    </div>
));
TaskGroupHeader.displayName = 'TaskGroupHeader';

// DND Config (remains the same)
const dropAnimationConfig: DropAnimation = {sideEffects: defaultDropAnimationSideEffects({styles: {active: {opacity: '0.4'}}}),};
const groupTitles: Record<TaskGroupCategory, string> = {
    overdue: 'Overdue',
    today: 'Today',
    next7days: 'Next 7 Days',
    later: 'Later',
    nodate: 'No Date'
};
const groupOrder: TaskGroupCategory[] = ['overdue', 'today', 'next7days', 'later', 'nodate'];

const TaskList: React.FC<TaskListProps> = ({title: pageTitle}) => {
    const allTasks = useAtomValue(tasksAtom);
    const setTasks = useSetAtom(tasksAtom);
    const currentFilterGlobal = useAtomValue(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const groupedTasks = useAtomValue(groupedAllTasksAtom);
    const rawSearchResults = useAtomValue(rawSearchResultsAtom);
    const searchTerm = useAtomValue(searchTermAtom);

    const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref for ScrollArea's viewport
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const [isHeaderDatePickerOpen, setIsHeaderDatePickerOpen] = useState(false);
    const [, setHeaderDatePickerTrigger] = useState<HTMLButtonElement | null>(null);


    // Logic for filtering/grouping tasks (remains the same)
    const {tasksToDisplay, isGroupedView, isSearching} = useMemo(() => {
        // ... (keep existing filtering logic) ...
        const searching = searchTerm.trim().length > 0;
        let displayData: Task[] | Record<TaskGroupCategory, Task[]> = [];
        let grouped = false;
        if (searching) {
            displayData = rawSearchResults;
            grouped = false;
        } else if (currentFilterGlobal === 'all') {
            displayData = groupedTasks;
            grouped = true;
        } else {
            let filtered: Task[] = [];
            const activeTasks = allTasks.filter((task: Task) => task.list !== 'Trash');
            const trashedTasks = allTasks.filter((task: Task) => task.list === 'Trash');
            switch (currentFilterGlobal) {
                case 'today':
                    filtered = activeTasks.filter((task: Task) => !task.completed && task.dueDate != null && isToday(task.dueDate));
                    break;
                case 'next7days':
                    filtered = activeTasks.filter((task: Task) => {
                        if (task.completed || task.dueDate == null) return false;
                        const date = safeParseDate(task.dueDate);
                        return date && isValid(date) && !isOverdue(date) && isWithinNext7Days(date);
                    });
                    break;
                case 'completed':
                    filtered = activeTasks.filter((task: Task) => task.completed).sort((a: Task, b: Task) => (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0));
                    break;
                case 'trash':
                    filtered = trashedTasks.sort((a: Task, b: Task) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    break;
                default:
                    if (currentFilterGlobal.startsWith('list-')) {
                        const listName = currentFilterGlobal.substring(5);
                        filtered = activeTasks.filter((task: Task) => !task.completed && task.list === listName);
                    } else if (currentFilterGlobal.startsWith('tag-')) {
                        const tagName = currentFilterGlobal.substring(4);
                        filtered = activeTasks.filter((task: Task) => !task.completed && task.tags?.includes(tagName));
                    } else {
                        console.warn(`Unrecognized filter: ${currentFilterGlobal}`);
                        filtered = [];
                    }
                    break;
            }
            if (currentFilterGlobal !== 'completed' && currentFilterGlobal !== 'trash') {
                filtered.sort((a: Task, b: Task) => (a.order - b.order) || (a.createdAt - b.createdAt));
            }
            displayData = filtered;
            grouped = false;
        }
        return {tasksToDisplay: displayData, isGroupedView: grouped, isSearching: searching};
    }, [searchTerm, currentFilterGlobal, groupedTasks, rawSearchResults, allTasks]);


    // DND setup (remains the same)
    const sortableItems: UniqueIdentifier[] = useMemo(() => {
        if (isGroupedView) {
            return groupOrder.flatMap(groupKey => (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey]?.map(task => task.id) ?? []);
        } else {
            return (tasksToDisplay as Task[]).map(task => task.id);
        }
    }, [tasksToDisplay, isGroupedView]);
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));

    // DND handlers (logic remains the same)
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const {active} = event;
        const activeTask = (isGroupedView ? Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat() : (tasksToDisplay as Task[])).find((task: Task) => task.id === active.id) ?? allTasks.find((task: Task) => task.id === active.id);
        if (activeTask && !activeTask.completed && activeTask.list !== 'Trash') {
            setDraggingTask(activeTask);
            setSelectedTaskId(activeTask.id);
        } else {
            setDraggingTask(null);
        }
    }, [tasksToDisplay, isGroupedView, setSelectedTaskId, allTasks]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const {active, over} = event;
        setDraggingTask(null);

        if (!over || !active.data.current?.task || active.id === over.id) {
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;
        const originalTask = active.data.current.task as Task;
        let targetGroupCategory: TaskGroupCategory | undefined = undefined;
        if (currentFilterGlobal === 'all' && over.data.current?.type === 'task-item') {
            targetGroupCategory = over.data.current?.groupCategory as TaskGroupCategory | undefined;
        }
        const categoryChanged = targetGroupCategory && targetGroupCategory !== originalTask.groupCategory;

        setTasks((currentTasks) => {
            const oldIndex = currentTasks.findIndex(t => t.id === activeId);
            const newIndex = currentTasks.findIndex(t => t.id === overId);
            if (oldIndex === -1 || newIndex === -1) return currentTasks;

            const currentVisualOrderIds = sortableItems;
            const activeVisualIndex = currentVisualOrderIds.indexOf(activeId);
            const overVisualIndex = currentVisualOrderIds.indexOf(overId);
            if (activeVisualIndex === -1 || overVisualIndex === -1) return currentTasks;

            const movedVisualOrderIds = arrayMove(currentVisualOrderIds, activeVisualIndex, overVisualIndex);
            const finalMovedVisualIndex = movedVisualOrderIds.indexOf(activeId);
            const prevTaskId = finalMovedVisualIndex > 0 ? movedVisualOrderIds[finalMovedVisualIndex - 1] : null;
            const nextTaskId = finalMovedVisualIndex < movedVisualOrderIds.length - 1 ? movedVisualOrderIds[finalMovedVisualIndex + 1] : null;
            const prevTask = prevTaskId ? currentTasks.find((t: Task) => t.id === prevTaskId) : null;
            const nextTask = nextTaskId ? currentTasks.find((t: Task) => t.id === nextTaskId) : null;
            const prevOrder = prevTask?.order;
            const nextOrder = nextTask?.order;
            let newOrderValue: number;

            if (prevOrder === undefined || prevOrder === null) newOrderValue = (nextOrder ?? Date.now()) - 1000;
            else if (nextOrder === undefined || nextOrder === null) newOrderValue = prevOrder + 1000;
            else {
                const mid = prevOrder + (nextOrder - prevOrder) / 2;
                if (!Number.isFinite(mid) || mid <= prevOrder || mid >= nextOrder) newOrderValue = prevOrder + Math.random();
                else newOrderValue = mid;
            }
            if (!Number.isFinite(newOrderValue)) newOrderValue = Date.now();

            let newDueDate: number | null | undefined = undefined;
            if (categoryChanged && targetGroupCategory) {
                const todayStart = startOfDay(new Date());
                switch (targetGroupCategory) {
                    case 'today':
                        newDueDate = todayStart.getTime();
                        break;
                    case 'next7days':
                        newDueDate = startOfDay(addDays(new Date(), 1)).getTime();
                        break;
                    case 'later':
                        newDueDate = startOfDay(addDays(new Date(), 8)).getTime();
                        break;
                    case 'overdue':
                        newDueDate = startOfDay(subDays(new Date(), 1)).getTime();
                        break;
                    case 'nodate':
                        newDueDate = null;
                        break;
                }
                const currentDueDateObj = safeParseDate(originalTask.dueDate);
                const currentDueDayStart = currentDueDateObj && isValid(currentDueDateObj) ? startOfDay(currentDueDateObj).getTime() : null;
                const newDueDayStart = newDueDate !== null && newDueDate !== undefined ? startOfDay(new Date(newDueDate)).getTime() : null;
                if (currentDueDayStart === newDueDayStart) newDueDate = undefined;
            }

            return currentTasks.map((task: Task) => {
                if (task.id === activeId) {
                    return {
                        ...task,
                        order: newOrderValue,
                        updatedAt: Date.now(), ...(newDueDate !== undefined && {dueDate: newDueDate})
                    };
                }
                return task;
            });
        });
    }, [setTasks, currentFilterGlobal, sortableItems]);

    // Add Task (logic remains the same)
    const handleAddTask = useCallback(() => {
        const now = Date.now();
        let defaultList = 'Inbox';
        let defaultDueDate: number | null = null;
        let defaultTags: string[] = [];
        if (currentFilterGlobal.startsWith('list-')) {
            const listName = currentFilterGlobal.substring(5);
            if (listName !== 'Trash' && listName !== 'Completed') defaultList = listName;
        } else if (currentFilterGlobal === 'today') {
            defaultDueDate = startOfDay(now).getTime();
        } else if (currentFilterGlobal.startsWith('tag-')) {
            defaultTags = [currentFilterGlobal.substring(4)];
        } else if (currentFilterGlobal === 'next7days') {
            defaultDueDate = startOfDay(addDays(now, 1)).getTime();
        }
        let newOrder: number;
        const visibleTaskIds = sortableItems;
        if (visibleTaskIds.length > 0) {
            const firstTaskId = visibleTaskIds[0];
            const firstTask = allTasks.find((t: Task) => t.id === firstTaskId);
            const minOrder = (firstTask && typeof firstTask.order === 'number' && isFinite(firstTask.order)) ? firstTask.order : Date.now();
            newOrder = minOrder - 1000;
        } else {
            newOrder = Date.now();
        }
        if (!isFinite(newOrder)) newOrder = Date.now();

        const newTask: Omit<Task, 'groupCategory'> = {
            id: `task-${now}-${Math.random().toString(16).slice(2)}`, title: '', completed: false, completedAt: null,
            list: defaultList, completionPercentage: null, dueDate: defaultDueDate, order: newOrder, createdAt: now,
            updatedAt: now, content: '', tags: defaultTags, priority: null,
        };
        setTasks(prev => [newTask as Task, ...prev]);
        setSelectedTaskId(newTask.id);
    }, [currentFilterGlobal, setTasks, setSelectedTaskId, sortableItems, allTasks]);

    // Header Date Picker Handlers (Refactored for Popover)
    const handleOpenHeaderDatePicker = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setHeaderDatePickerTrigger(event.currentTarget); // Store trigger element
        setIsHeaderDatePickerOpen(true);
    }, []);
    const handleCloseHeaderDatePicker = useCallback(() => {
        setIsHeaderDatePickerOpen(false);
        // Optionally reset trigger: setHeaderDatePickerTrigger(null);
    }, []);
    const handleBulkRescheduleDateSelect = useCallback((date: Date | undefined) => {
        handleCloseHeaderDatePicker(); // Close popover first
        if (!date || !isValid(date)) return;

        const newDueDateTimestamp = startOfDay(date).getTime();
        setTasks(currentTasks =>
            currentTasks.map((task: Task) => {
                const isTaskOverdue = !task.completed && task.list !== 'Trash' &&
                    task.dueDate != null && isValid(task.dueDate) &&
                    isBefore(startOfDay(safeParseDate(task.dueDate)!), startOfDay(new Date()));
                if (isTaskOverdue) {
                    return {...task, dueDate: newDueDateTimestamp, updatedAt: Date.now()};
                }
                return task;
            })
        );
    }, [setTasks, handleCloseHeaderDatePicker]);


    // Task Rendering (Animation refined)
    const renderTaskGroup = useCallback((groupTasks: Task[], groupKey: TaskGroupCategory | 'flat-list' | string) => (
        <AnimatePresence initial={false}>
            {groupTasks.map((task: Task, index: number) => (
                <motion.div
                    key={task.id} // Key is crucial for AnimatePresence
                    layout // Enable smooth layout animation during reordering/filtering
                    initial={{opacity: 0, y: -10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, transition: {duration: 0.15}}} // Faster exit animation
                    transition={{
                        type: "spring", // Use spring for more natural feel
                        stiffness: 300,
                        damping: 30,
                        delay: index * 0.01, // Stagger animation slightly
                    }}
                    className="task-motion-wrapper" // Keep custom class if needed
                    id={`task-item-${task.id}`}
                >
                    <TaskItem
                        task={task}
                        groupCategory={isGroupedView && groupKey !== 'flat-list' ? groupKey as TaskGroupCategory : undefined}
                        // Pass the ScrollArea viewport ref to TaskItem if needed for popover boundaries
                        scrollContainerRef={scrollContainerRef}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    ), [isGroupedView, scrollContainerRef]); // Dependencies


    // Memoized values (remains the same)
    const isEmpty = useMemo(() => {
        if (isGroupedView) return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).every((group: Task[]) => group.length === 0);
        else return (tasksToDisplay as Task[]).length === 0;
    }, [tasksToDisplay, isGroupedView]);
    const emptyStateTitle = useMemo(() => {
        if (isSearching) return `No results for "${searchTerm}"`;
        if (currentFilterGlobal === 'trash') return 'Trash is empty';
        if (currentFilterGlobal === 'completed') return 'No completed tasks yet';
        return `No tasks in "${pageTitle}"`;
    }, [isSearching, searchTerm, currentFilterGlobal, pageTitle]);
    const showAddTaskButton = useMemo(() => !['completed', 'trash'].includes(currentFilterGlobal) && !isSearching, [currentFilterGlobal, isSearching]);

    return (
        <TaskItemMenuProvider>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd} measuring={{droppable: {strategy: MeasuringStrategy.Always}}}>
                <div className="h-full flex flex-col bg-transparent overflow-hidden relative">
                    {/* Header */}
                    <div className={cn(
                        "px-3 py-2 border-b border-border/60 flex justify-between items-center flex-shrink-0 h-12 z-10",
                        "bg-background/60 dark:bg-black/20 backdrop-blur-lg" // Refined glass effect
                    )}>
                        <h1 className="text-base font-semibold text-foreground truncate pr-2" title={pageTitle}>
                            {pageTitle}
                        </h1>
                        <div className="flex items-center space-x-1">
                            {/* Header Date Picker Popover Trigger */}
                            {isGroupedView && (tasksToDisplay as Record<TaskGroupCategory, Task[]>)?.overdue?.length > 0 && (
                                <Popover open={isHeaderDatePickerOpen} onOpenChange={setIsHeaderDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost" size="sm"
                                            className="text-xs !h-7 px-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                            title="Reschedule all overdue tasks..."
                                            onClick={handleOpenHeaderDatePicker} // Use the handler to manage state
                                        >
                                            <Icon name="calendar-check" size={13} className="mr-1"/>
                                            Reschedule Overdue
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        {/* Pass handlers to the custom popover */}
                                        <CustomDatePickerPopover
                                            initialDate={undefined} // Start fresh each time
                                            onSelect={handleBulkRescheduleDateSelect}
                                            trigger={<></>}
                                            // Close is handled by onSelect or clicking away due to Popover's modal nature
                                            // triggerElement={headerDatePickerTrigger} // Not needed if Popover handles trigger
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                            {showAddTaskButton && (
                                <Button variant="default" size="sm" onClick={handleAddTask} className="px-2.5 !h-8">
                                    <Icon name="plus" size={16} className="mr-1"/> Add Task
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Task List Area using ScrollArea */}
                    <ScrollArea className="flex-1">
                        <ScrollAreaViewport ref={scrollContainerRef} className="relative pb-4">
                            <div className="relative pb-4"> {/* Add padding bottom inside scroll area */}
                                {isEmpty ? (
                                    <div
                                        className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-muted-foreground px-6 text-center pt-10"> {/* Adjust height based on layout */}
                                        <Icon
                                            name={currentFilterGlobal === 'trash' ? 'trash' : (currentFilterGlobal === 'completed' ? 'check-square' : (isSearching ? 'search' : 'archive'))}
                                            size={40} className="mb-3 opacity-40"
                                        />
                                        <p className="text-sm font-medium">{emptyStateTitle}</p>
                                        {showAddTaskButton && (
                                            <p className="text-xs mt-1">Click the '+' button to add a new task.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                                            {isGroupedView ? (
                                                <>
                                                    {groupOrder.map(groupKey => {
                                                        const groupTasks = (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey];
                                                        if (groupTasks && groupTasks.length > 0) {
                                                            return (
                                                                <div key={groupKey}>
                                                                    {/* TaskGroupHeader now only needs title/key */}
                                                                    <TaskGroupHeader title={groupTitles[groupKey]}
                                                                                     groupKey={groupKey}/>
                                                                    <div
                                                                        className="px-1"> {/* Add slight horizontal padding for items */}
                                                                        {renderTaskGroup(groupTasks, groupKey)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </>
                                            ) : (
                                                <div className="pt-0.5 px-1"> {/* Add slight padding for non-grouped */}
                                                    {renderTaskGroup(tasksToDisplay as Task[], 'flat-list')}
                                                </div>
                                            )}
                                        </SortableContext>
                                    </div>
                                )}
                            </div>
                        </ScrollAreaViewport>
                    </ScrollArea> {/* End ScrollArea */}
                </div>
                {/* End main flex container */}

                {/* Drag Overlay */}
                <DragOverlay dropAnimation={dropAnimationConfig} className="dnd-drag-overlay">
                    {draggingTask ? (
                        <TaskItem task={draggingTask} isOverlay={true} scrollContainerRef={scrollContainerRef}/>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </TaskItemMenuProvider>
    );
};
TaskList.displayName = 'TaskList';
export default TaskList;