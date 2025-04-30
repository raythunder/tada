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
import Icon from '../common/Icon';
import Button from '../common/Button';
import CustomDatePickerPopover from '../common/CustomDatePickerPopover'; // Radix-based popover
import {Task, TaskGroupCategory} from '@/types';
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
import {AnimatePresence, motion} from 'framer-motion'; // Keep for task add/remove animation
import {
    addDays,
    isOverdue,
    isToday,
    isValid,
    isWithinNext7Days,
    safeParseDate,
    startOfDay,
    subDays
} from '@/utils/dateUtils';
import {twMerge} from 'tailwind-merge';
import {TaskItemMenuProvider} from '@/context/TaskItemMenuContext';

interface TaskListProps {
    title: string;
}

// Styled Task Group Header
const TaskGroupHeader: React.FC<{
    title: string;
    groupKey: TaskGroupCategory;
    rescheduleTrigger?: React.ReactNode; // Allow passing the trigger
}> = React.memo(({title, groupKey, rescheduleTrigger}) => (
    <div
        className="flex items-center justify-between px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider sticky top-0 z-20"
        style={{
            // Subtle glass effect for sticky header
            backgroundColor: 'hsla(220, 40%, 98%, 0.85)', // Light mode base
            // TODO: Add dark mode equivalent background color if needed
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            // Mask to fade bottom edge
            WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
        }}
    >
        <span>{title}</span>
        {/* Render the trigger passed from parent for Radix Popover */}
        {groupKey === 'overdue' && rescheduleTrigger && (
            <div className="-mr-1"> {/* Adjust spacing */}
                {rescheduleTrigger}
            </div>
        )}
    </div>
));
TaskGroupHeader.displayName = 'TaskGroupHeader';


// DND Config (Keep as is)
const dropAnimationConfig: DropAnimation = {sideEffects: defaultDropAnimationSideEffects({styles: {active: {opacity: '0.4'}}}),};
const groupTitles: Record<TaskGroupCategory, string> = {
    overdue: 'Overdue',
    today: 'Today',
    next7days: 'Next 7 Days',
    later: 'Later',
    nodate: 'No Date',
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

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);

    // Filter/Grouping logic (remains the same)
    const {tasksToDisplay, isGroupedView, isSearching} = useMemo(() => {
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
                    // Sort completed by completion/update time DESC
                    filtered = activeTasks.filter((task: Task) => task.completed && task.list !== 'Trash').sort((a: Task, b: Task) => (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0));
                    break;
                case 'trash':
                    filtered = trashedTasks.sort((a: Task, b: Task) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    break;
                default:
                    if (currentFilterGlobal.startsWith('list-')) {
                        const listName = currentFilterGlobal.substring(5);
                        // Show non-completed tasks for specific lists
                        filtered = activeTasks.filter((task: Task) => !task.completed && task.list === listName);
                    } else if (currentFilterGlobal.startsWith('tag-')) {
                        const tagName = currentFilterGlobal.substring(4);
                        // Show non-completed tasks for specific tags
                        filtered = activeTasks.filter((task: Task) => !task.completed && task.tags?.includes(tagName));
                    } else {
                        console.warn(`Unrecognized filter: ${currentFilterGlobal}`);
                        filtered = [];
                    }
                    break;
            }
            // Default sort for non-completed/trash views
            if (currentFilterGlobal !== 'completed' && currentFilterGlobal !== 'trash') {
                filtered.sort((a: Task, b: Task) => (a.order - b.order) || (a.createdAt - b.createdAt));
            }
            displayData = filtered;
            grouped = false;
        }
        return {tasksToDisplay: displayData, isGroupedView: grouped, isSearching: searching};
    }, [searchTerm, currentFilterGlobal, groupedTasks, rawSearchResults, allTasks]);

    // Sortable items for dnd-kit (remains the same)
    const sortableItems: UniqueIdentifier[] = useMemo(() => {
        if (isGroupedView) {
            return groupOrder.flatMap(groupKey => (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey]?.map(task => task.id) ?? []);
        } else {
            return (tasksToDisplay as Task[]).map(task => task.id);
        }
    }, [tasksToDisplay, isGroupedView]);

    // DND Sensors (remains the same)
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));

    // DND Handlers (remains the same logic)
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const {active} = event;
        // Find task from appropriate source (grouped, flat, or all)
        const sourceTasks = isGroupedView ? Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat() : (tasksToDisplay as Task[]);
        let activeTask = sourceTasks.find((task: Task) => task.id === active.id);
        if (!activeTask) {
            activeTask = allTasks.find((task: Task) => task.id === active.id);
        }

        // Allow dragging only non-completed, non-trash items
        if (activeTask && !activeTask.completed && activeTask.list !== 'Trash') {
            setDraggingTask(activeTask);
            setSelectedTaskId(activeTask.id); // Select task being dragged
        } else {
            setDraggingTask(null);
        }
    }, [tasksToDisplay, isGroupedView, setSelectedTaskId, allTasks]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const {active, over} = event;
        setDraggingTask(null);

        if (!over || !active.data.current?.task || active.id === over.id) {
            return; // No valid drop target or no movement
        }

        const activeId = active.id as string;
        const overId = over.id as string;
        const originalTask = active.data.current.task as Task;

        // Determine target category only if in 'all' view and dropped onto another task
        let targetGroupCategory: TaskGroupCategory | undefined = undefined;
        if (currentFilterGlobal === 'all' && over.data.current?.type === 'task-item') {
            targetGroupCategory = over.data.current?.groupCategory as TaskGroupCategory | undefined;
        }

        const categoryChanged = targetGroupCategory && targetGroupCategory !== originalTask.groupCategory;

        setTasks((currentTasks) => {
            const oldIndex = currentTasks.findIndex(t => t.id === activeId);
            const newIndex = currentTasks.findIndex(t => t.id === overId);
            if (oldIndex === -1 || newIndex === -1) return currentTasks; // Task not found (shouldn't happen)

            // Use the visual order derived from sortableItems for order calculation
            const currentVisualOrderIds = sortableItems;
            const activeVisualIndex = currentVisualOrderIds.indexOf(activeId);
            const overVisualIndex = currentVisualOrderIds.indexOf(overId);

            if (activeVisualIndex === -1 || overVisualIndex === -1) {
                console.warn("DragEnd: Task not found in visual order for reordering.");
                return currentTasks; // Fallback: don't change order if visual indexes are invalid
            }
            const movedVisualOrderIds = arrayMove(currentVisualOrderIds, activeVisualIndex, overVisualIndex);
            const finalMovedVisualIndex = movedVisualOrderIds.indexOf(activeId);

            // Calculate new fractional order based on surrounding tasks in the *visual* order
            const prevTaskId = finalMovedVisualIndex > 0 ? movedVisualOrderIds[finalMovedVisualIndex - 1] : null;
            const nextTaskId = finalMovedVisualIndex < movedVisualOrderIds.length - 1 ? movedVisualOrderIds[finalMovedVisualIndex + 1] : null;
            const prevTask = prevTaskId ? currentTasks.find((t: Task) => t.id === prevTaskId) : null;
            const nextTask = nextTaskId ? currentTasks.find((t: Task) => t.id === nextTaskId) : null;

            const prevOrder = prevTask?.order;
            const nextOrder = nextTask?.order;
            let newOrderValue: number;

            if (prevOrder === undefined || prevOrder === null) { // Dropped at the beginning
                newOrderValue = (nextOrder ?? Date.now()) - 1000;
            } else if (nextOrder === undefined || nextOrder === null) { // Dropped at the end
                newOrderValue = prevOrder + 1000;
            } else { // Dropped in the middle
                const mid = prevOrder + (nextOrder - prevOrder) / 2;
                // Handle potential precision issues or equality
                if (!Number.isFinite(mid) || mid <= prevOrder || mid >= nextOrder) {
                    // Fallback: Insert very close to the previous item
                    newOrderValue = prevOrder + Math.random() * 0.01; // Small random offset
                    console.warn("Order calculation fallback (random offset). Prev:", prevOrder, "Next:", nextOrder);
                } else {
                    newOrderValue = mid;
                }
            }
            // Final sanity check for finiteness
            if (!Number.isFinite(newOrderValue)) {
                newOrderValue = Date.now(); // Absolute fallback
                console.warn("Order calculation fallback (Date.now()).");
            }


            // Calculate new due date if category changed in 'all' view
            let newDueDate: number | null | undefined = undefined; // Use undefined to signal no change initially
            if (categoryChanged && targetGroupCategory) {
                const todayStart = startOfDay(new Date());
                switch (targetGroupCategory) {
                    case 'today':
                        newDueDate = todayStart.getTime();
                        break;
                    case 'next7days':
                        newDueDate = startOfDay(addDays(new Date(), 1)).getTime();
                        break; // Default to tomorrow
                    case 'later':
                        newDueDate = startOfDay(addDays(new Date(), 8)).getTime();
                        break; // Default to 8 days later
                    case 'overdue':
                        newDueDate = startOfDay(subDays(new Date(), 1)).getTime();
                        break; // Default to yesterday
                    case 'nodate':
                        newDueDate = null;
                        break;
                }

                // Avoid updating if the effective day hasn't changed
                const currentDueDateObj = safeParseDate(originalTask.dueDate);
                const currentDueDayStart = currentDueDateObj && isValid(currentDueDateObj) ? startOfDay(currentDueDateObj).getTime() : null;
                const newDueDayStart = newDueDate !== null && newDueDate !== undefined ? startOfDay(new Date(newDueDate)).getTime() : null;

                if (currentDueDayStart === newDueDayStart) {
                    newDueDate = undefined; // Signal no effective date change needed
                }
            }

            // Update the task
            return currentTasks.map((task: Task) => {
                if (task.id === activeId) {
                    const updatedTask: Task = {
                        ...task,
                        order: newOrderValue, // Apply new order
                        updatedAt: Date.now(), // Update timestamp
                        // Conditionally update dueDate only if it's defined (meaning a change is needed)
                        ...(newDueDate !== undefined && {dueDate: newDueDate}),
                    };
                    // Group category will be recalculated by the atom setter
                    return updatedTask;
                }
                return task;
            });
        });
    }, [setTasks, currentFilterGlobal, sortableItems]);


    // Add Task logic (remains the same)
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
        if (!isFinite(newOrder)) {
            newOrder = Date.now();
            console.warn("AddTask: Order calc fallback.");
        }
        const newTask: Omit<Task, 'groupCategory'> = {
            id: `task-${now}-${Math.random().toString(16).slice(2)}`,
            title: '', // Start with empty title to trigger focus
            completed: false,
            completedAt: null,
            list: defaultList,
            completionPercentage: null, // Start as null
            dueDate: defaultDueDate,
            order: newOrder,
            createdAt: now,
            updatedAt: now,
            content: '',
            tags: defaultTags,
            priority: null,
        };
        setTasks(prev => [newTask as Task, ...prev]); // Add to the beginning
        setSelectedTaskId(newTask.id); // Select the new task for editing
    }, [currentFilterGlobal, setTasks, setSelectedTaskId, sortableItems, allTasks]);

    // Bulk Reschedule logic (Date Picker in header)
    const handleBulkRescheduleDateSelect = useCallback((date: Date | undefined) => {
        if (!date || !isValid(date)) {
            return; // Don't close popover if date is invalid/undefined
        }
        const newDueDateTimestamp = startOfDay(date).getTime();
        setTasks(currentTasks =>
            currentTasks.map((task: Task) => {
                // Find overdue tasks (using the groupCategory derived state)
                const isTaskOverdue = task.groupCategory === 'overdue';
                if (isTaskOverdue) {
                    return {...task, dueDate: newDueDateTimestamp, updatedAt: Date.now()};
                }
                return task;
            })
        );
        // Popover closes itself via Radix PopoverClose or the internal picker logic
    }, [setTasks]);

    // Render Task Group - Kept Framer Motion as requested
    const renderTaskGroup = useCallback((groupTasks: Task[], groupKey: TaskGroupCategory | 'flat-list' | string) => (
        <AnimatePresence initial={false} key={`group-anim-${groupKey}`}>
            {groupTasks.map((task: Task) => (
                // Keep motion.div for add/remove animation
                <motion.div
                    key={task.id} // Key is crucial for AnimatePresence
                    // layout // Keep layout animation for reordering smoothness? Test performance.
                    initial={{opacity: 0, height: 0}} // Animate height for smooth insertion/deletion
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    transition={{duration: 0.25, ease: "easeOut"}}
                    className="task-motion-wrapper overflow-hidden" // Add overflow hidden
                    id={`task-item-${task.id}`} // ID for potential linking
                >
                    {/* Pass down scroll container ref for potential popover boundaries */}
                    <TaskItem
                        task={task}
                        groupCategory={isGroupedView && groupKey !== 'flat-list' ? groupKey as TaskGroupCategory : undefined}
                        scrollContainerRef={scrollContainerRef}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    ), [isGroupedView, scrollContainerRef]); // Depend on isGroupedView

    // Empty state calculations
    const isEmpty = useMemo(() => {
        if (isGroupedView) {
            return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).every((group: Task[]) => group.length === 0);
        } else {
            return (tasksToDisplay as Task[]).length === 0;
        }
    }, [tasksToDisplay, isGroupedView]);
    const emptyStateTitle = useMemo(() => {
        if (isSearching) return `No results for "${searchTerm}"`;
        if (currentFilterGlobal === 'trash') return 'Trash is empty';
        if (currentFilterGlobal === 'completed') return 'No completed tasks yet';
        return `No tasks in "${pageTitle}"`;
    }, [isSearching, searchTerm, currentFilterGlobal, pageTitle]);

    // Header/Button visibility
    const headerClass = useMemo(() => twMerge(
        "px-3 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center flex-shrink-0 h-11 z-10",
        "bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-lg" // Adjusted glass effect
    ), []);
    const showAddTaskButton = useMemo(() => !['completed', 'trash'].includes(currentFilterGlobal) && !isSearching, [currentFilterGlobal, isSearching]);

    return (
        <TaskItemMenuProvider>
            {/* DND Context wraps the list */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                measuring={{droppable: {strategy: MeasuringStrategy.Always}}} // Ensure droppables are always measured
            >
                <div className="h-full flex flex-col bg-transparent overflow-hidden relative">
                    {/* Header */}
                    <div className={headerClass}>
                        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate pr-2"
                            title={pageTitle}>
                            {pageTitle}
                        </h1>
                        <div className="flex items-center space-x-1">
                            {showAddTaskButton && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    icon="plus"
                                    onClick={handleAddTask}
                                    className="px-2.5 !h-[30px]" // Explicit height
                                >
                                    Add
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Task List Area */}
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto styled-scrollbar relative">
                        {isEmpty ? (
                            // Empty State Styling
                            <div
                                className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-neutral-500 px-6 text-center pt-10">
                                <Icon
                                    name={currentFilterGlobal === 'trash' ? 'trash' : (currentFilterGlobal === 'completed' ? 'check-square' : (isSearching ? 'search' : 'archive'))}
                                    size={40}
                                    className="mb-3 text-gray-300 dark:text-neutral-600 opacity-80"
                                />
                                <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">{emptyStateTitle}</p>
                                {showAddTaskButton && (
                                    <p className="text-xs mt-1 text-muted dark:text-neutral-500">Click the '+' button to
                                        add a new task.</p>
                                )}
                            </div>
                        ) : (
                            // Task List Content
                            <div>
                                {/* SortableContext wraps the list items */}
                                <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                                    {isGroupedView ? (
                                        <>
                                            {groupOrder.map(groupKey => {
                                                const groupTasks = (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey];
                                                if (groupTasks && groupTasks.length > 0) {
                                                    // Prepare the trigger for the date picker popover
                                                    const rescheduleTrigger = groupKey === 'overdue' ? (
                                                        <CustomDatePickerPopover
                                                            initialDate={undefined} // No initial date for bulk reschedule
                                                            onSelect={handleBulkRescheduleDateSelect}
                                                        >
                                                            {/* Button that triggers the popover */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                icon="calendar-check"
                                                                className="text-xs !h-5 px-1.5 text-muted-foreground dark:text-neutral-400 hover:text-primary dark:hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/15"
                                                                title="Reschedule all overdue tasks..."
                                                            >
                                                                Reschedule All
                                                            </Button>
                                                        </CustomDatePickerPopover>
                                                    ) : undefined;

                                                    return (
                                                        <div key={groupKey}>
                                                            <TaskGroupHeader
                                                                title={groupTitles[groupKey]}
                                                                groupKey={groupKey}
                                                                rescheduleTrigger={rescheduleTrigger} // Pass trigger down
                                                            />
                                                            {/* Render tasks using the animated function */}
                                                            {renderTaskGroup(groupTasks, groupKey)}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </>
                                    ) : (
                                        // Flat list view
                                        <div className="pt-0.5">
                                            {renderTaskGroup(tasksToDisplay as Task[], 'flat-list')}
                                        </div>
                                    )}
                                </SortableContext>
                            </div>
                        )}
                    </div>
                    {/* End scrollable area */}
                </div>
                {/* End main flex container */}

                {/* Drag Overlay for smooth dragging visual */}
                <DragOverlay dropAnimation={dropAnimationConfig}>
                    {draggingTask ? (
                        <TaskItem
                            task={draggingTask}
                            isOverlay={true}
                            scrollContainerRef={scrollContainerRef} // Pass ref to overlay item too
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </TaskItemMenuProvider>
    );
};
TaskList.displayName = 'TaskList';
export default TaskList;