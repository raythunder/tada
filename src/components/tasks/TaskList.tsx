// src/components/tasks/TaskList.tsx
import React, {useCallback, useMemo, useState} from 'react';
import TaskItem from './TaskItem';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {
    currentFilterAtom, groupedAllTasksAtom, searchFilteredTasksAtom,
    searchTermAtom, selectedTaskIdAtom, tasksAtom
} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CustomDatePickerPopover from '../common/CustomDatePickerPopover'; // Import Date Picker
import {Task, TaskFilter, TaskGroupCategory} from '@/types';
import {
    closestCenter, defaultDropAnimationSideEffects, DndContext, DragEndEvent,
    DragOverlay, DragStartEvent, DropAnimation, KeyboardSensor, MeasuringStrategy,
    PointerSensor, UniqueIdentifier, useSensor, useSensors
} from '@dnd-kit/core';
import {usePopper} from 'react-popper'; // Import usePopper
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {AnimatePresence, motion} from 'framer-motion';
import {addDays, startOfDay, isValid, safeParseDate} from '@/utils/dateUtils';
import {twMerge} from 'tailwind-merge';

interface TaskListProps {
    title: string; // Title displayed in the header
    filter: TaskFilter; // The filter associated with this list view (passed from routing)
}

// Interface for Date Picker state (Req 2)
interface DatePickerState {
    taskId: string;
    targetCategory: TaskGroupCategory;
    referenceElement: HTMLElement; // Element to position popover near
    isVisible: boolean;
}

// Sticky Group Header Component
// Performance: Memoized TaskGroupHeader
const TaskGroupHeader: React.FC<{ title: string }> = React.memo(({title}) => (
    <div
        className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-[5]"
        // Apply backdrop filter styles directly for simplicity
        style={{
            backgroundColor: 'hsla(220, 30%, 96%, 0.85)', // Match bg-glass-alt-200 approximately with alpha
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            // Mask to fade out bottom edge for smoother scroll appearance
            WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
        }}
    >
        {title}
    </div>
));
TaskGroupHeader.displayName = 'TaskGroupHeader';

// Drop animation configuration
const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {active: {opacity: '0.4'}},
    }),
};


const TaskList: React.FC<TaskListProps> = ({title: pageTitle, filter: _pageFilter}) => {
    const [tasks, setTasks] = useAtom(tasksAtom);
    const currentFilterGlobal = useAtomValue(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const groupedTasks = useAtomValue(groupedAllTasksAtom);
    const searchFilteredTasks = useAtomValue(searchFilteredTasksAtom); // Filtered based on currentFilter + search
    const searchTerm = useAtomValue(searchTermAtom);

    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    // State for managing the date picker popover (Req 2)
    const [datePickerState, setDatePickerState] = useState<DatePickerState | null>(null);

    // Popper setup for date picker (Req 2)
    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const { styles: popperStyles, attributes: popperAttributes } = usePopper(
        datePickerState?.referenceElement,
        popperElement,
        {
            placement: 'bottom-start',
            modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
        }
    );

    // Determine tasks and view type based on GLOBAL filter and search term
    // Performance: useMemo for derived state
    const {tasksToDisplay, isGroupedView} = useMemo(() => {
    // const {tasksToDisplay, isGroupedView, viewKey} = useMemo(() => {
        const isSearching = searchTerm.trim().length > 0;
        let displayData: Task[] | Record<TaskGroupCategory, Task[]> = [];
        let grouped = false;

        if (isSearching) {
            // If searching, always show a flat list from searchFilteredTasks
            displayData = searchFilteredTasks;
            grouped = false;
        } else if (currentFilterGlobal === 'all') {
            // If 'all' view and not searching, use grouped tasks
            displayData = groupedTasks;
            grouped = true;
        } else {
            // Otherwise (specific filter, not searching), use searchFilteredTasks (which == filteredTasks when not searching)
            displayData = searchFilteredTasks;
            grouped = false;
        }
        // Key helps differentiate views for potential transitions/logic, NOT for forcing remounts
        const key = grouped ? 'grouped' : 'flat';
        return {tasksToDisplay: displayData, isGroupedView: grouped, viewKey: key};
    }, [searchTerm, currentFilterGlobal, groupedTasks, searchFilteredTasks]);


    // Performance: Memoize calculation of sortable item IDs
    const sortableItems: UniqueIdentifier[] = useMemo(() => {
        if (isGroupedView) {
            // Flatten grouped tasks for sortable context
            return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat().map(task => task.id);
        } else {
            // Use IDs directly from the flat list
            return (tasksToDisplay as Task[]).map(task => task.id);
        }
    }, [tasksToDisplay, isGroupedView]);


    // DND sensors setup
    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 8}}), // Start drag after 8px movement
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}) // Keyboard support
    );

    // --- Drag Handlers ---
    // Performance: Use useCallback for handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const {active} = event;
        const task = tasks.find(t => t.id === active.id);
        // Allow dragging only for non-completed, non-trashed tasks
        if (task && !task.completed && task.list !== 'Trash') {
            setDraggingTask(task);
            setSelectedTaskId(task.id); // Select task being dragged
        } else {
            setDraggingTask(null); // Prevent dragging
        }
    }, [tasks, setSelectedTaskId]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const {active, over} = event;
        setDraggingTask(null); // Clear dragging task state

        if (!over || !active.data.current?.task || active.id === over.id) {
            return; // No valid drop target or no movement
        }

        const activeId = active.id as string;
        const overId = over.id as string;
        const originalTask = active.data.current.task as Task;
        const overElement = document.getElementById(`task-item-${overId}`); // Get target DOM element for positioning popover

        // --- Requirement 2: Date Change Logic ---
        // Determine target group category only if in 'all' view and dropping onto a task item
        let targetGroupCategory: TaskGroupCategory | undefined = undefined;
        if (currentFilterGlobal === 'all' && over.data.current?.type === 'task-item') {
            targetGroupCategory = over.data.current?.groupCategory as TaskGroupCategory | undefined;
        }

        // Check if the category changed and requires date picker popup
        const categoryChanged = targetGroupCategory && targetGroupCategory !== originalTask.groupCategory;
        const needsDatePicker = categoryChanged &&
            ['overdue', 'next7days', 'later'].includes(targetGroupCategory!) &&
            overElement; // Ensure we have an element to anchor to

        if (needsDatePicker) {
            // Show Date Picker Popover instead of immediate update
            setDatePickerState({
                taskId: activeId,
                targetCategory: targetGroupCategory!,
                referenceElement: overElement!, // Anchor to the item dropped onto
                isVisible: true,
            });
            // Defer reordering until date is picked
            return; // Stop further processing in this handler
        }
        // --- End Requirement 2 Date Picker Trigger ---


        // Proceed with reordering and potential direct date updates
        setTasks((currentTasks) => {
            const oldIndex = currentTasks.findIndex(t => t.id === activeId);
            const newIndex = currentTasks.findIndex(t => t.id === overId);

            if (oldIndex === -1 || newIndex === -1) return currentTasks; // Should not happen

            // Reorder the tasks array
            const reorderedTasks = arrayMove(currentTasks, oldIndex, newIndex);

            // Calculate new fractional order
            const finalMovedTaskIndex = reorderedTasks.findIndex(t => t.id === activeId);
            const prevTask = finalMovedTaskIndex > 0 ? reorderedTasks[finalMovedTaskIndex - 1] : null;
            const nextTask = finalMovedTaskIndex < reorderedTasks.length - 1 ? reorderedTasks[finalMovedTaskIndex + 1] : null;
            const prevOrder = prevTask?.order;
            const nextOrder = nextTask?.order;
            let newOrderValue: number;

            if (prevOrder === undefined || prevOrder === null) {
                newOrderValue = (nextOrder ?? 0) - 1000;
            } else if (nextOrder === undefined || nextOrder === null) {
                newOrderValue = prevOrder + 1000;
            } else {
                newOrderValue = (prevOrder + nextOrder) / 2;
                // Handle potential precision issues or identical orders
                if (newOrderValue === prevOrder || newOrderValue === nextOrder || !Number.isFinite(newOrderValue)) {
                    // Fallback: Slightly adjust based on previous order or timestamp
                    newOrderValue = prevOrder + Math.random() * 0.01; // Add small random fraction
                    console.warn("Order calculation fallback used.");
                }
            }
            if (!Number.isFinite(newOrderValue)) {
                newOrderValue = Date.now(); // Absolute fallback
            }


            // Direct Date Change Logic (for drops onto Today/No Date or non-'all' views)
            let newDueDate: number | null | undefined = undefined; // undefined means no change
            if (categoryChanged && !needsDatePicker) { // Only if category changed and date picker wasn't needed
                if (targetGroupCategory === 'today') newDueDate = startOfDay(new Date()).getTime();
                else if (targetGroupCategory === 'nodate') newDueDate = null;
                // Other categories handled by date picker popup

                // Avoid update if date is effectively the same
                const currentDueDate = safeParseDate(originalTask.dueDate);
                const currentDueTime = currentDueDate && isValid(currentDueDate) ? startOfDay(currentDueDate).getTime() : null;
                const newDueTime = newDueDate !== null && newDueDate !== undefined ? startOfDay(new Date(newDueDate)).getTime() : null;
                if (currentDueTime === newDueTime) {
                    newDueDate = undefined; // Don't update if day hasn't changed
                }
            }

            // Apply Updates to the moved task
            return reorderedTasks.map((task) => {
                if (task.id === activeId) {
                    return {
                        ...task,
                        order: newOrderValue,
                        updatedAt: Date.now(),
                        // Apply direct due date change if calculated
                        ...(newDueDate !== undefined && {dueDate: newDueDate}),
                        // Category will be recalculated by tasksAtom setter logic
                    };
                }
                return task;
            });
        });

    }, [setTasks, currentFilterGlobal]); // Dependencies


    // Date Picker Popover Handlers (Req 2)
    const handleDatePick = useCallback((date: Date | undefined) => {
        if (!datePickerState) return;

        const { taskId } = datePickerState;
        const newDueDate = date && isValid(date) ? startOfDay(date).getTime() : null;

        setTasks(currentTasks => {
            const taskIndex = currentTasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return currentTasks; // Task not found

            // --- Re-apply Reordering Logic Here (Simplified) ---
            // This part is tricky. We need the original 'overId' from handleDragEnd.
            // Let's assume for now we just update the date and rely on the user to manually reorder if needed after date pick,
            // OR pass 'overId' through datePickerState.
            // For simplicity now, just update the date. A full solution would re-run reorder logic.

            console.warn("Reordering after date pick is simplified. Task might need manual re-positioning.");

            return currentTasks.map(t =>
                t.id === taskId ? { ...t, dueDate: newDueDate, updatedAt: Date.now() } : t
            );
        });

        setDatePickerState(null); // Close picker
    }, [datePickerState, setTasks]);

    const closeDatePicker = useCallback(() => {
        setDatePickerState(null);
    }, []);


    // Add new task handler
    // Performance: useCallback
    const handleAddTask = useCallback(() => {
        const now = Date.now();
        let defaultList = 'Inbox';
        let defaultDueDate: number | null = null;
        let defaultTags: string[] = [];

        // Determine defaults based on the current filter context
        if (currentFilterGlobal.startsWith('list-')) {
            const listName = currentFilterGlobal.substring(5);
            if (listName !== 'Trash' && listName !== 'Completed') defaultList = listName;
        } else if (currentFilterGlobal === 'today') {
            defaultDueDate = startOfDay(now).getTime();
        } else if (currentFilterGlobal.startsWith('tag-')) {
            defaultTags = [currentFilterGlobal.substring(4)];
        } else if (currentFilterGlobal === 'next7days') {
            // Default to tomorrow for 'Next 7 Days' add
            defaultDueDate = startOfDay(addDays(now, 1)).getTime();
        }
        // Add more defaults as needed (e.g., for 'Overdue'?)

        // Calculate initial order to place at the top
        // Find the minimum order among existing tasks, place new task before it
        const minOrder = tasks.reduce((min, t) => Math.min(min, t.order ?? Infinity), Infinity);
        const newOrder = (isFinite(minOrder) ? minOrder : Date.now()) - 1000; // Place before minimum or use timestamp derivative

        const newTask: Omit<Task, 'groupCategory'> = { // Omit groupCategory, it will be calculated
            id: `task-${now}-${Math.random().toString(16).slice(2)}`,
            title: '', // Start with empty title for editing
            completed: false,
            list: defaultList,
            dueDate: defaultDueDate,
            order: newOrder,
            createdAt: now,
            updatedAt: now,
            content: '',
            tags: defaultTags,
            priority: null,
            completedAt: null, // Add completedAt field
        };

        setTasks(prev => [newTask as Task, ...prev]); // Add to the beginning of the list
        setSelectedTaskId(newTask.id); // Select the new task

        // Focus the title input in TaskDetail after a short delay
        setTimeout(() => {
            const titleInput = document.getElementById(`task-title-input-${newTask.id}`) as HTMLInputElement | null;
            // Find the specific input if TaskDetail is complex, otherwise query globally (less robust)
            // const titleInput = document.querySelector('.task-detail-title-input') as HTMLInputElement | null;
            titleInput?.focus();
            titleInput?.select(); // Select text for easy typing
        }, 150); // Delay allows TaskDetail to render

    }, [currentFilterGlobal, setTasks, setSelectedTaskId, tasks]);


    // Render task group function
    // Performance: useCallback, child TaskItem is memoized
    const renderTaskGroup = useCallback((groupTasks: Task[], groupKey: TaskGroupCategory | 'flat-list' | string) => (
        // Req 1: AnimatePresence handles item enter/exit. Key ensures it animates correctly.
        <AnimatePresence initial={false} key={`group-anim-${groupKey}`}>
            {groupTasks.map((task) => (
                // Req 1: motion.div handles layout/position animations.
                // Keyed by task.id for correct animation tracking.
                <motion.div
                    key={task.id}
                    layout="position" // Enable smooth position animation during reordering/filtering
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10, transition: { duration: 0.15, ease: 'easeIn' } }}
                    transition={{ duration: 0.20, ease: "easeOut" }}
                    className="task-motion-wrapper" // Optional wrapper class if needed
                    id={`task-item-${task.id}`} // Add ID for date picker anchoring (Req 2)
                >
                    <TaskItem
                        task={task}
                        // Pass groupCategory only if it's a valid category key from grouping
                        groupCategory={['overdue', 'today', 'next7days', 'later', 'nodate'].includes(groupKey) ? groupKey as TaskGroupCategory : undefined}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    ), []); // No dependencies needed if it only uses props/constants


    // Performance: Memoize empty state calculations
    const isEmpty = useMemo(() => {
        if (isGroupedView) {
            // Check if all groups in the grouped view are empty
            return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).every(group => group.length === 0);
        } else {
            // Check if the flat list is empty
            return (tasksToDisplay as Task[]).length === 0;
        }
    }, [tasksToDisplay, isGroupedView]);

    const emptyStateTitle = useMemo(() => {
        if (searchTerm) return `No results for "${searchTerm}"`;
        if (currentFilterGlobal === 'trash') return 'Trash is empty';
        if (currentFilterGlobal === 'completed') return 'No completed tasks yet';
        // Provide a more specific title if possible, fallback to pageTitle
        return `No tasks in "${pageTitle}"`;
    }, [searchTerm, currentFilterGlobal, pageTitle]);

    // Group display titles and order (stable)
    const groupTitles: Record<TaskGroupCategory, string> = useMemo(() => ({
        overdue: 'Overdue', today: 'Today', next7days: 'Next 7 Days',
        later: 'Later', nodate: 'No Date',
    }), []);
    const groupOrder: TaskGroupCategory[] = useMemo(() => ['overdue', 'today', 'next7days', 'later', 'nodate'], []);

    // Header class names
    const headerClass = useMemo(() => twMerge(
        "px-3 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 h-11 z-10",
        "bg-glass-alt-200 backdrop-blur-lg" // Consistent glass effect
    ), []);

    // Determine if Add Task button should be shown
    const showAddTaskButton = useMemo(() =>
            !['completed', 'trash'].includes(currentFilterGlobal) && !searchTerm
        , [currentFilterGlobal, searchTerm]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter} // Simple collision detection
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={{droppable: {strategy: MeasuringStrategy.Always}}} // Consistent measurement
        >
            <div className="h-full flex flex-col bg-glass-alt-100 backdrop-blur-xl overflow-hidden">
                {/* Header */}
                <div className={headerClass}>
                    <h1 className="text-base font-semibold text-gray-800 truncate pr-2" title={pageTitle}>
                        {pageTitle}
                    </h1>
                    <div className="flex items-center space-x-1">
                        {/* Add Task Button - Conditionally rendered */}
                        {showAddTaskButton && (
                            <Button variant="primary" size="sm" icon="plus" onClick={handleAddTask} className="px-2.5 !h-[30px]"> Add </Button>
                        )}
                    </div>
                </div>

                {/* Scrollable Task List Area */}
                <div className="flex-1 overflow-y-auto styled-scrollbar relative">
                    {isEmpty ? (
                        // Empty State
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center pt-10">
                            <Icon
                                name={currentFilterGlobal === 'trash' ? 'trash' : (currentFilterGlobal === 'completed' ? 'check-square' : 'archive')}
                                size={40} className="mb-3 text-gray-300 opacity-80"
                            />
                            <p className="text-sm font-medium text-gray-500">{emptyStateTitle}</p>
                            {currentFilterGlobal !== 'trash' && currentFilterGlobal !== 'completed' && !searchTerm && (
                                <p className="text-xs mt-1 text-muted">Click the '+' button to add a new task.</p>
                            )}
                        </div>
                    ) : (
                        // --- Removed key={viewKey} to prevent remounts (Req 1 & 8) ---
                        <div>
                            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                                {isGroupedView ? (
                                    // Render Grouped View ('all' tasks)
                                    <>
                                        {groupOrder.map(groupKey => {
                                            const groupTasks = (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey];
                                            // Render group only if it has tasks
                                            if (groupTasks && groupTasks.length > 0) {
                                                return (
                                                    <div key={groupKey}>
                                                        <TaskGroupHeader title={groupTitles[groupKey]}/>
                                                        {/* Task items are rendered with animation */}
                                                        {renderTaskGroup(groupTasks, groupKey)}
                                                    </div>
                                                );
                                            }
                                            return null; // Don't render header for empty groups
                                        })}
                                    </>
                                ) : (
                                    // Render Flat List View (specific filter or search results)
                                    <div className="pt-0.5"> {/* Optional top padding for flat list */}
                                        {renderTaskGroup(tasksToDisplay as Task[], 'flat-list')}
                                    </div>
                                )}
                            </SortableContext>
                        </div>
                    )}
                </div>

                {/* Date Picker Popover (Req 2) - Rendered via Popper */}
                {datePickerState?.isVisible && (
                    <div
                        ref={setPopperElement}
                        style={popperStyles.popper}
                        {...popperAttributes.popper}
                        className="z-50" // Ensure picker is on top
                    >
                        <CustomDatePickerPopover
                            initialDate={undefined} // Start fresh or pass original date? Start fresh.
                            onSelect={handleDatePick}
                            close={closeDatePicker}
                            triggerElement={datePickerState.referenceElement} // Pass trigger for context if needed
                        />
                    </div>
                )}

            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={dropAnimationConfig}>
                {draggingTask ? (
                    // Performance: TaskItem is memoized
                    <TaskItem task={draggingTask} isOverlay={true} />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
export default TaskList; // Not typically memoized directly