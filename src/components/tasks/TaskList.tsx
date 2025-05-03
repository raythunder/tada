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
import * as Popover from '@radix-ui/react-popover';
import {CustomDatePickerContent} from '../common/CustomDatePickerPopover'; // Import the CONTENT component
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
import {AnimatePresence, motion} from 'framer-motion';
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
} from '@/utils/dateUtils';
import {twMerge} from 'tailwind-merge';
import {TaskItemMenuProvider} from '@/context/TaskItemMenuContext';

interface TaskListProps {
    title: string;
}

// TaskGroupHeader now correctly uses Popover.Trigger and Popover.Anchor
const TaskGroupHeader: React.FC<{
    title: string;
    groupKey: TaskGroupCategory;
}> = React.memo(({title, groupKey}) => (
    <div
        className="flex items-center justify-between px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider sticky top-0 z-20"
        style={{
            // Use hsla for alpha channel support
            backgroundColor: 'hsla(var(--glass-alt-h), var(--glass-alt-s), var(--glass-alt-l), var(--glass-alt-a-100))', // Use variables
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
        }}
    >
        <span>{title}</span>
        {groupKey === 'overdue' && (
            // Use Popover.Anchor to help with positioning from sticky header
            <Popover.Anchor asChild>
                <Popover.Trigger asChild>
                    <Button
                        variant="ghost" size="sm" icon="calendar-check"
                        className="text-xs !h-5 px-1.5 text-muted-foreground dark:text-neutral-400 hover:text-primary dark:hover:text-primary-light hover:bg-primary/15 dark:hover:bg-primary/20 -mr-1"
                        title="Reschedule all overdue tasks..."
                    >
                        Reschedule All
                    </Button>
                </Popover.Trigger>
            </Popover.Anchor>
        )}
    </div>
));
TaskGroupHeader.displayName = 'TaskGroupHeader';


const dropAnimationConfig: DropAnimation = {sideEffects: defaultDropAnimationSideEffects({styles: {active: {opacity: '0.4'}}}),};
const groupTitles: Record<TaskGroupCategory, string> = {
    overdue: 'Overdue', today: 'Today', next7days: 'Next 7 Days', later: 'Later', nodate: 'No Date',
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
    const [isBulkRescheduleOpen, setIsBulkRescheduleOpen] = useState(false);

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
                        // Check if !overdue AND within next 7 days (inclusive of today)
                        return date && isValid(date) && !isOverdue(date) && isWithinNext7Days(date);
                    });
                    break;
                case 'completed':
                    filtered = activeTasks.filter((task: Task) => task.completed).sort((a: Task, b: Task) =>
                        (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0)
                    );
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
                        // Should not happen with RouteChangeHandler, but handle defensively
                        console.warn(`Unrecognized filter: ${currentFilterGlobal}, showing all tasks.`);
                        displayData = groupedTasks;
                        grouped = true;
                        filtered = []; // Set filtered to empty as displayData is handled above
                    }
                    break;
            }

            // Only sort non-grouped, non-completed, non-trash views by order
            if (!grouped && currentFilterGlobal !== 'completed' && currentFilterGlobal !== 'trash') {
                filtered.sort((a: Task, b: Task) => (a.order - b.order) || (a.createdAt - b.createdAt));
            }
            // Assign filtered data if not already handled by the default case
            if (!grouped) {
                displayData = filtered;
            }
        }
        return {tasksToDisplay: displayData, isGroupedView: grouped, isSearching: searching};
    }, [searchTerm, currentFilterGlobal, groupedTasks, rawSearchResults, allTasks]);

    const sortableItems: UniqueIdentifier[] = useMemo(() => {
        if (isGroupedView) {
            // Flatten tasks from groups in the correct display order
            return groupOrder.flatMap(groupKey =>
                (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey]?.map(task => task.id) ?? []
            );
        } else {
            // Use the flat list directly
            return (tasksToDisplay as Task[]).map(task => task.id);
        }
    }, [tasksToDisplay, isGroupedView]);

    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 8}}), // Allow small movements before dragging
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const {active} = event;
        const allVisibleTasks = isGroupedView
            ? Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat()
            : (tasksToDisplay as Task[]);
        // Fallback to allTasks if somehow not in the visible list (shouldn't happen often)
        const activeTask = allVisibleTasks.find((task: Task) => task.id === active.id) ?? allTasks.find((task: Task) => task.id === active.id);

        if (activeTask && !activeTask.completed && activeTask.list !== 'Trash') {
            setDraggingTask(activeTask);
            setSelectedTaskId(activeTask.id); // Select task on drag start
        } else {
            setDraggingTask(null); // Don't drag completed or trashed tasks
        }
    }, [tasksToDisplay, isGroupedView, setSelectedTaskId, allTasks]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const {active, over} = event;
        setDraggingTask(null);

        if (!over || !active.data.current?.task || active.id === over.id) {
            return; // No valid drop target or dropped on self
        }

        const activeId = active.id as string;
        const overId = over.id as string;
        const originalTask = active.data.current.task as Task;

        // Determine target category only in the 'all' grouped view
        let targetGroupCategory: TaskGroupCategory | undefined = undefined;
        if (currentFilterGlobal === 'all' && over.data.current?.type === 'task-item') {
            targetGroupCategory = over.data.current?.groupCategory as TaskGroupCategory | undefined;
        }
        // Check if the derived category actually changes based on the drop target
        const categoryChanged = targetGroupCategory && targetGroupCategory !== originalTask.groupCategory;

        setTasks((currentTasks) => {
            const oldIndex = currentTasks.findIndex(t => t.id === activeId);
            const newIndex = currentTasks.findIndex(t => t.id === overId);

            if (oldIndex === -1 || newIndex === -1) {
                console.warn("DragEnd: Task not found in current task list.");
                return currentTasks; // Task IDs not found in the main list
            }

            // Calculate visual order based on the current state of `sortableItems`
            const currentVisualOrderIds = sortableItems;
            const activeVisualIndex = currentVisualOrderIds.indexOf(activeId);
            const overVisualIndex = currentVisualOrderIds.indexOf(overId);

            if (activeVisualIndex === -1 || overVisualIndex === -1) {
                console.warn("DragEnd: Task not found in visual order array.");
                return currentTasks; // Task not found in the currently rendered order
            }

            // Simulate the move in the visual order to find neighbors
            const movedVisualOrderIds = arrayMove(currentVisualOrderIds, activeVisualIndex, overVisualIndex);
            const finalMovedVisualIndex = movedVisualOrderIds.indexOf(activeId);

            const prevTaskId = finalMovedVisualIndex > 0 ? movedVisualOrderIds[finalMovedVisualIndex - 1] : null;
            const nextTaskId = finalMovedVisualIndex < movedVisualOrderIds.length - 1 ? movedVisualOrderIds[finalMovedVisualIndex + 1] : null;

            // Find the actual task objects for neighbors using the main task list
            const prevTask = prevTaskId ? currentTasks.find((t: Task) => t.id === prevTaskId) : null;
            const nextTask = nextTaskId ? currentTasks.find((t: Task) => t.id === nextTaskId) : null;

            // Calculate new fractional index based on neighbors' orders
            const prevOrder = prevTask?.order;
            const nextOrder = nextTask?.order;
            let newOrderValue: number;

            // Handle edge cases and calculate midpoint
            if (prevOrder === undefined || prevOrder === null) { // Dropped at the beginning
                newOrderValue = (nextOrder ?? Date.now()) - 1000; // Use timestamp if no next task
            } else if (nextOrder === undefined || nextOrder === null) { // Dropped at the end
                newOrderValue = prevOrder + 1000;
            } else { // Dropped between two tasks
                const mid = prevOrder + (nextOrder - prevOrder) / 2;
                // Check for precision issues or identical orders
                if (!Number.isFinite(mid) || mid <= prevOrder || mid >= nextOrder) {
                    // Fallback: Add a small random offset (less ideal) or use timestamp
                    newOrderValue = prevOrder + Math.random(); // Simple fallback
                    console.warn("Order calculation fallback (random offset).");
                } else {
                    newOrderValue = mid;
                }
            }
            // Final check if order is still invalid
            if (!Number.isFinite(newOrderValue)) {
                newOrderValue = Date.now(); // Absolute fallback
                console.warn("Order calculation fallback (Date.now()).");
            }

            // --- Handle Due Date Change Based on Category ---
            let newDueDate: number | null | undefined = undefined; // undefined means no change

            if (categoryChanged && targetGroupCategory) {
                const todayStart = startOfDay(new Date());
                switch (targetGroupCategory) {
                    case 'today':
                        newDueDate = todayStart.getTime();
                        break;
                    case 'next7days':
                        // Set to tomorrow if dropping here, prevents dropping into 'today' section
                        newDueDate = startOfDay(addDays(todayStart, 1)).getTime();
                        break;
                    case 'later':
                        // Set to 8 days from now (start of 'later')
                        newDueDate = startOfDay(addDays(todayStart, 8)).getTime();
                        break;
                    case 'overdue':
                        // Set to yesterday if dropping here (can be adjusted)
                        newDueDate = startOfDay(subDays(todayStart, 1)).getTime();
                        break;
                    case 'nodate':
                        newDueDate = null; // Explicitly set to null
                        break;
                }

                // Only apply the date change if the target category's implied date is different
                // from the task's current due date's *day*
                const currentDueDateObj = safeParseDate(originalTask.dueDate);
                const currentDueDayStart = currentDueDateObj && isValid(currentDueDateObj) ? startOfDay(currentDueDateObj).getTime() : null;
                const newDueDayStart = newDueDate !== null && newDueDate !== undefined ? startOfDay(new Date(newDueDate)).getTime() : null;

                if (currentDueDayStart === newDueDayStart) {
                    newDueDate = undefined; // Don't change if the day is already correct for the category
                }
            }
            // --- End Due Date Handling ---


            // Update the specific task with new order and potentially new due date
            return currentTasks.map((task: Task) => {
                if (task.id === activeId) {
                    const updates: Partial<Task> = {
                        order: newOrderValue,
                    };
                    if (newDueDate !== undefined) { // Apply if due date change is determined
                        updates.dueDate = newDueDate;
                    }
                    // Let the main tasksAtom setter handle updatedAt and groupCategory recalculation
                    return {...task, ...updates};
                }
                return task;
            });
        });

    }, [setTasks, currentFilterGlobal, sortableItems]); // Include sortableItems


    const handleAddTask = useCallback(() => {
        const now = Date.now();
        let defaultList = 'Inbox';
        let defaultDueDate: number | null = null;
        let defaultTags: string[] = [];

        // Set defaults based on the current filter context
        if (currentFilterGlobal.startsWith('list-')) {
            const listName = currentFilterGlobal.substring(5);
            // Avoid setting Trash or Completed as default
            if (listName !== 'Trash' && listName !== 'Completed') {
                defaultList = listName;
            }
        } else if (currentFilterGlobal === 'today') {
            defaultDueDate = startOfDay(now).getTime();
        } else if (currentFilterGlobal.startsWith('tag-')) {
            defaultTags = [currentFilterGlobal.substring(4)];
        } else if (currentFilterGlobal === 'next7days') {
            // Set to tomorrow if adding in "Next 7 Days" view
            defaultDueDate = startOfDay(addDays(now, 1)).getTime();
        }
        // No default date for 'all', 'overdue', 'later', 'nodate'

        // Calculate order for the new task (place at the top of the current view)
        let newOrder: number;
        const visibleTaskIds = sortableItems; // Use the current visual order
        if (visibleTaskIds.length > 0) {
            const firstTaskId = visibleTaskIds[0];
            const firstTask = allTasks.find((t: Task) => t.id === firstTaskId);
            // Ensure order is a valid number, fall back if not
            const minOrder = (firstTask && typeof firstTask.order === 'number' && isFinite(firstTask.order))
                ? firstTask.order
                : Date.now(); // Fallback if first task has no order
            newOrder = minOrder - 1000; // Place before the first item
        } else {
            newOrder = Date.now(); // No tasks in view, use timestamp
        }
        // Final fallback check for order validity
        if (!isFinite(newOrder)) {
            newOrder = Date.now();
            console.warn("AddTask: Order calculation fallback (Date.now()).");
        }

        const newTask: Omit<Task, 'groupCategory' | 'completed'> = { // Let tasksAtom derive completed/groupCategory
            id: `task-${now}-${Math.random().toString(16).slice(2)}`,
            title: '', // Empty title for user input
            // completed: false, // Derived by tasksAtom setter
            completedAt: null,
            list: defaultList,
            completionPercentage: null, // Start with no progress
            dueDate: defaultDueDate,
            order: newOrder,
            createdAt: now,
            updatedAt: now,
            content: '',
            tags: defaultTags,
            priority: null,
        };

        // Add the new task to the beginning of the tasks list
        setTasks(prev => [newTask as Task, ...prev]); // Cast needed as derived fields aren't included
        // Select the new task for immediate editing
        setSelectedTaskId(newTask.id);
    }, [currentFilterGlobal, setTasks, setSelectedTaskId, sortableItems, allTasks]);

    const handleBulkRescheduleDateSelect = useCallback((date: Date | undefined) => {
        if (!date || !isValid(date)) {
            setIsBulkRescheduleOpen(false);
            return;
        }
        const newDueDateTimestamp = startOfDay(date).getTime();

        setTasks(currentTasks =>
            currentTasks.map((task: Task) => {
                // Check if the task is overdue
                const isTaskOverdue = !task.completed &&
                    task.list !== 'Trash' &&
                    task.dueDate != null &&
                    isValid(task.dueDate) &&
                    isBefore(startOfDay(safeParseDate(task.dueDate)!), startOfDay(new Date()));

                if (isTaskOverdue) {
                    // Update due date for overdue tasks
                    return {...task, dueDate: newDueDateTimestamp};
                }
                return task; // Return unchanged task otherwise
            })
        );
        // Popover closes automatically via closePopover callback passed to content
        // setIsBulkRescheduleOpen(false); // Not needed if closePopover works
    }, [setTasks]);

    // Callback to close the popover, passed to the content component
    const closeBulkReschedulePopover = useCallback(() => setIsBulkRescheduleOpen(false), []);

    // --- UPDATE: Add layout prop to motion.div ---
    const renderTaskGroup = useCallback((groupTasks: Task[], groupKey: TaskGroupCategory | 'flat-list' | string) => (
        // mode="sync" handles exit/enter concurrently which can look smoother than "wait"
        <AnimatePresence initial={false} mode="sync">
            {groupTasks.map((task: Task) => (
                <motion.div
                    key={task.id}
                    // Add layout="position" to animate position changes smoothly
                    layout="position"
                    initial={{opacity: 0, y: -5}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, x: -10, transition: {duration: 0.2}}} // Slightly faster exit
                    // Customize transition for entry/animation
                    transition={{duration: 0.25, ease: "easeOut"}}
                    className="task-motion-wrapper" // Optional wrapper class
                    id={`task-item-${task.id}`} // Ensure unique ID for DOM elements
                >
                    <TaskItem
                        task={task}
                        groupCategory={isGroupedView && groupKey !== 'flat-list' ? groupKey as TaskGroupCategory : undefined}
                        scrollContainerRef={scrollContainerRef} // Pass ref for potential internal use
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    ), [isGroupedView, scrollContainerRef]); // Dependencies for the callback

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
        // Provide a more specific message for list/tag views if pageTitle is available
        if (currentFilterGlobal.startsWith('list-') || currentFilterGlobal.startsWith('tag-')) {
            return `No active tasks in "${pageTitle}"`;
        }
        // Default for 'all', 'today', 'next7days' etc.
        return `No tasks for "${pageTitle}"`;
    }, [isSearching, searchTerm, currentFilterGlobal, pageTitle]);

    const headerClass = useMemo(() => twMerge(
        "px-3 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center flex-shrink-0 h-11 z-10",
        "bg-glass-alt-100 dark:bg-neutral-800/70 backdrop-blur-lg" // Use glass background from theme
    ), []);

    const showAddTaskButton = useMemo(() => !['completed', 'trash'].includes(currentFilterGlobal) && !isSearching, [currentFilterGlobal, isSearching]);

    return (
        <TaskItemMenuProvider>
            {/* Popover for Bulk Reschedule */}
            <Popover.Root open={isBulkRescheduleOpen} onOpenChange={setIsBulkRescheduleOpen}>
                {/* Dnd Context for Drag and Drop */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd} measuring={{droppable: {strategy: MeasuringStrategy.Always}}}>
                    {/* Main Layout Div */}
                    <div className="h-full flex flex-col bg-transparent overflow-hidden relative">
                        {/* Header */}
                        <div className={headerClass}>
                            <h1 className="text-base font-semibold text-gray-800 dark:text-neutral-100 truncate pr-2"
                                title={pageTitle}>
                                {pageTitle}
                            </h1>
                            <div className="flex items-center space-x-1">
                                {showAddTaskButton && (
                                    <Button variant="primary" size="sm" icon="plus" onClick={handleAddTask}
                                            className="px-2.5 !h-[30px]">
                                        Add
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Task List Area */}
                        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto styled-scrollbar relative">
                            {isEmpty ? (
                                // Empty State Display
                                <div
                                    className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-neutral-500 px-6 text-center pt-10">
                                    <Icon
                                        name={currentFilterGlobal === 'trash' ? 'trash' : (currentFilterGlobal === 'completed' ? 'check-square' : (isSearching ? 'search' : 'archive'))}
                                        size={40} className="mb-3 text-gray-300 dark:text-neutral-600 opacity-80"
                                    />
                                    <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">{emptyStateTitle}</p>
                                    {showAddTaskButton && (
                                        <p className="text-xs mt-1 text-muted dark:text-neutral-500">Click the '+'
                                            button to add a new task.</p>
                                    )}
                                </div>
                            ) : (
                                // Task List Content
                                <div>
                                    <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                                        {isGroupedView ? (
                                            // Grouped View Rendering
                                            <>
                                                {groupOrder.map(groupKey => {
                                                    const groupTasks = (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey];
                                                    if (groupTasks && groupTasks.length > 0) {
                                                        return (
                                                            <div key={groupKey}>
                                                                <TaskGroupHeader
                                                                    title={groupTitles[groupKey]}
                                                                    groupKey={groupKey}
                                                                />
                                                                {renderTaskGroup(groupTasks, groupKey)}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </>
                                        ) : (
                                            // Flat List Rendering
                                            <div className="pt-0.5">
                                                {renderTaskGroup(tasksToDisplay as Task[], 'flat-list')}
                                            </div>
                                        )}
                                    </SortableContext>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay dropAnimation={dropAnimationConfig}>
                        {draggingTask ? (
                            <TaskItem task={draggingTask} isOverlay={true} scrollContainerRef={scrollContainerRef}/>
                        ) : null}
                    </DragOverlay>

                    {/* Radix Popover Content for Bulk Reschedule */}
                    <Popover.Portal>
                        <Popover.Content
                            sideOffset={5}
                            align="end" // Align to the end (right) of the anchor
                            className={twMerge(
                                "z-[60] radix-popover-content", // Ensure high z-index
                                // Use Tailwind animation classes defined in config
                                "data-[state=open]:animate-slideUpAndFade",
                                "data-[state=closed]:animate-slideDownAndFade"
                            )}
                            onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing on open
                            onCloseAutoFocus={(e) => e.preventDefault()} // Keep focus management sane on close
                        >
                            {/* Render the Date Picker Content component */}
                            <CustomDatePickerContent
                                initialDate={undefined} // No initial date for bulk action
                                onSelect={handleBulkRescheduleDateSelect}
                                closePopover={closeBulkReschedulePopover} // Pass the closing function
                            />
                        </Popover.Content>
                    </Popover.Portal>

                </DndContext>
            </Popover.Root>
        </TaskItemMenuProvider>
    );
};
TaskList.displayName = 'TaskList';
export default TaskList;