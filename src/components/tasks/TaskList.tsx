// src/components/tasks/TaskList.tsx
import React, {useCallback, useMemo, useState} from 'react';
import TaskItem from './TaskItem';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {
    currentFilterAtom, groupedAllTasksAtom,
    searchTermAtom, selectedTaskIdAtom, tasksAtom,
    rawSearchResultsAtom // Use the raw search results atom
} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CustomDatePickerPopover from '../common/CustomDatePickerPopover';
import {Task, TaskGroupCategory} from '@/types';
import {
    closestCenter, defaultDropAnimationSideEffects, DndContext, DragEndEvent,
    DragOverlay, DragStartEvent, DropAnimation, KeyboardSensor, MeasuringStrategy,
    PointerSensor, UniqueIdentifier, useSensor, useSensors
} from '@dnd-kit/core';
import {usePopper} from 'react-popper';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {AnimatePresence, motion} from 'framer-motion';
import {addDays, startOfDay, isValid, safeParseDate, isOverdue, isWithinNext7Days, isToday} from '@/utils/dateUtils';
import {twMerge} from 'tailwind-merge';

interface TaskListProps {
    title: string; // Title displayed in the header
    // filter prop is no longer needed as component relies on global currentFilterAtom
    // filter: TaskFilter;
}

// Interface for Date Picker state
interface DatePickerState {
    taskId: string;
    targetCategory: TaskGroupCategory;
    referenceElement: HTMLElement;
    isVisible: boolean;
    // Store original task position context if needed for complex reordering after date pick
    // originalOverId?: UniqueIdentifier;
}

// Sticky Group Header Component
const TaskGroupHeader: React.FC<{ title: string }> = React.memo(({title}) => (
    <div
        className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-[5]"
        style={{
            backgroundColor: 'hsla(220, 30%, 96%, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
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


const TaskList: React.FC<TaskListProps> = ({title: pageTitle}) => {
    const [tasks, setTasks] = useAtom(tasksAtom);
    const currentFilterGlobal = useAtomValue(currentFilterAtom); // Use the global filter state
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const groupedTasks = useAtomValue(groupedAllTasksAtom); // For 'all' view
    const rawSearchResults = useAtomValue(rawSearchResultsAtom); // Use raw results for search
    const searchTerm = useAtomValue(searchTermAtom);

    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const [datePickerState, setDatePickerState] = useState<DatePickerState | null>(null);

    // Popper setup for date picker
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
    const {tasksToDisplay, isGroupedView, isSearching} = useMemo(() => {
        const searching = searchTerm.trim().length > 0;
        let displayData: Task[] | Record<TaskGroupCategory, Task[]> = [];
        let grouped = false;

        if (searching) {
            // Req 3 Fix: If searching, always show a flat list from rawSearchResultsAtom
            displayData = rawSearchResults;
            grouped = false;
        } else if (currentFilterGlobal === 'all') {
            // 'all' view and not searching, use grouped tasks
            displayData = groupedTasks;
            grouped = true;
        } else {
            // Specific filter, not searching: Need to filter tasks manually here
            // as searchFilteredTasksAtom is only for search results on top of filter
            // Let's reuse the filtering logic from filteredTasksAtom definition:
            let filtered: Task[] = [];
            const activeTasks = tasks.filter(task => task.list !== 'Trash');
            const trashedTasks = tasks.filter(task => task.list === 'Trash');

            switch (currentFilterGlobal) {
                case 'today':
                    filtered = activeTasks.filter(task => !task.completed && task.dueDate != null && isToday(task.dueDate));
                    break;
                case 'next7days':
                    filtered = activeTasks.filter(task => {
                        if (task.completed || task.dueDate == null) return false;
                        const date = safeParseDate(task.dueDate);
                        return date && isValid(date) && !isOverdue(date) && isWithinNext7Days(date);
                    });
                    break;
                case 'completed':
                    filtered = activeTasks.filter(task => task.completed).sort((a, b) => (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0));
                    break;
                case 'trash':
                    filtered = trashedTasks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    break;
                default:
                    if (currentFilterGlobal.startsWith('list-')) {
                        const listName = currentFilterGlobal.substring(5);
                        filtered = activeTasks.filter(task => !task.completed && task.list === listName);
                    } else if (currentFilterGlobal.startsWith('tag-')) {
                        const tagName = currentFilterGlobal.substring(4);
                        filtered = activeTasks.filter(task => !task.completed && task.tags?.includes(tagName));
                    } else {
                        // Should not happen if routing is correct, but fallback to empty
                        console.warn(`Unrecognized filter in TaskList: ${currentFilterGlobal}`);
                        filtered = [];
                    }
                    break;
            }
            displayData = filtered.sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt)); // Ensure sorted by order
            grouped = false;
        }
        return {tasksToDisplay: displayData, isGroupedView: grouped, isSearching: searching};
    }, [searchTerm, currentFilterGlobal, groupedTasks, rawSearchResults, tasks]);


    // Memoize calculation of sortable item IDs from the derived tasksToDisplay
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
        useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    );

    // Drag Handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const {active} = event;
        const task = tasks.find(t => t.id === active.id);
        // Allow dragging only for non-completed, non-trashed tasks
        if (task && !task.completed && task.list !== 'Trash') {
            setDraggingTask(task);
            setSelectedTaskId(task.id);
        } else {
            setDraggingTask(null); // Prevent dragging invalid items
        }
    }, [tasks, setSelectedTaskId]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const {active, over} = event;
        setDraggingTask(null);

        if (!over || !active.data.current?.task || active.id === over.id) {
            return; // No valid drop target or no movement
        }

        const activeId = active.id as string;
        const overId = over.id as string;
        const originalTask = active.data.current.task as Task;
        const overElement = document.getElementById(`task-item-${overId}`);

        // Determine target group category only if in 'all' view and dropping onto a task item
        let targetGroupCategory: TaskGroupCategory | undefined = undefined;
        if (currentFilterGlobal === 'all' && over.data.current?.type === 'task-item') {
            targetGroupCategory = over.data.current?.groupCategory as TaskGroupCategory | undefined;
        }

        const categoryChanged = targetGroupCategory && targetGroupCategory !== originalTask.groupCategory;
        const needsDatePicker = categoryChanged &&
            ['overdue', 'next7days', 'later'].includes(targetGroupCategory!) &&
            overElement;

        if (needsDatePicker) {
            // Show Date Picker Popover
            setDatePickerState({
                taskId: activeId,
                targetCategory: targetGroupCategory!,
                referenceElement: overElement!,
                isVisible: true,
            });
            // Reordering will happen after date pick confirmation (in handleDatePick)
            return;
        }

        // Proceed with reordering and potential direct date updates
        setTasks((currentTasks) => {
            const oldIndex = currentTasks.findIndex(t => t.id === activeId);
            const newIndex = currentTasks.findIndex(t => t.id === overId);

            if (oldIndex === -1 || newIndex === -1) return currentTasks;

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
                newOrderValue = (nextOrder ?? Date.now()) - 1000; // Place before next or use timestamp
            } else if (nextOrder === undefined || nextOrder === null) {
                newOrderValue = prevOrder + 1000; // Place after previous
            } else {
                newOrderValue = (prevOrder + nextOrder) / 2;
                if (!Number.isFinite(newOrderValue) || newOrderValue === prevOrder || newOrderValue === nextOrder) {
                    newOrderValue = prevOrder + Math.random() * 0.01; // Fallback for precision issues
                    // console.warn("Order calculation fallback used due to precision or identical orders.");
                }
            }
            if (!Number.isFinite(newOrderValue)) {
                newOrderValue = Date.now(); // Absolute fallback
                // console.warn("Order calculation absolute fallback used.");
            }

            // Direct Date Change Logic (for drops onto Today/No Date or non-'all' views)
            let newDueDate: number | null | undefined = undefined; // undefined means no change
            if (categoryChanged && !needsDatePicker) {
                if (targetGroupCategory === 'today') newDueDate = startOfDay(new Date()).getTime();
                else if (targetGroupCategory === 'nodate') newDueDate = null;

                // Avoid update if date is effectively the same day
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
                    const updatedTask = {
                        ...task,
                        order: newOrderValue,
                        updatedAt: Date.now(),
                        // Apply direct due date change if calculated
                        ...(newDueDate !== undefined && {dueDate: newDueDate}),
                    };
                    // Let atom setter recalculate category
                    return updatedTask;
                }
                return task;
            });
        });

    }, [setTasks, currentFilterGlobal]); // Removed tasks dependency to avoid potential loops, relies on closure


    // Date Picker Popover Handlers
    const handleDatePick = useCallback((date: Date | undefined) => {
        if (!datePickerState) return;

        const { taskId } = datePickerState;
        const newDueDate = date && isValid(date) ? startOfDay(date).getTime() : null;

        // Update the date first
        setTasks(currentTasks => {
            return currentTasks.map(t =>
                t.id === taskId ? { ...t, dueDate: newDueDate, updatedAt: Date.now() } : t
            );
            // Note: Reordering after date pick requires more complex state management
            // (passing overId through datePickerState) or simplifying the UX.
            // Current implementation updates date but doesn't re-run the reorder logic post-date-pick.
        });

        setDatePickerState(null); // Close picker
    }, [datePickerState, setTasks]);

    const closeDatePicker = useCallback(() => {
        setDatePickerState(null);
    }, []);


    // Add new task handler
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
            defaultDueDate = startOfDay(addDays(now, 1)).getTime();
        }

        // Calculate initial order to place at the top of the *visible* list
        const visibleTasks = isGroupedView
            ? Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat()
            : (tasksToDisplay as Task[]);
        const minOrder = visibleTasks.reduce((min, t) => Math.min(min, t.order ?? Infinity), Infinity);
        const newOrder = (isFinite(minOrder) ? minOrder : Date.now()) - 1000;

        const newTask: Omit<Task, 'groupCategory'> = {
            id: `task-${now}-${Math.random().toString(16).slice(2)}`,
            title: '',
            completed: false,
            completedAt: null,
            list: defaultList,
            dueDate: defaultDueDate,
            order: newOrder,
            createdAt: now,
            updatedAt: now,
            content: '',
            tags: defaultTags,
            priority: null,
        };

        // Add to global tasks, let atom setter handle category calculation
        setTasks(prev => [newTask as Task, ...prev]);
        setSelectedTaskId(newTask.id); // Select the new task

        // Focus the title input in TaskDetail after a short delay
        setTimeout(() => {
            const titleInput = document.getElementById(`task-title-input-${newTask.id}`) as HTMLInputElement | null;
            titleInput?.focus();
            titleInput?.select();
        }, 150);

    }, [currentFilterGlobal, setTasks, setSelectedTaskId, isGroupedView, tasksToDisplay]);


    // Render task group function
    const renderTaskGroup = useCallback((groupTasks: Task[], groupKey: TaskGroupCategory | 'flat-list' | string) => (
        // Req 1: Use AnimatePresence and motion.div for animations
        <AnimatePresence initial={false} key={`group-anim-${groupKey}`}>
            {groupTasks.map((task) => (
                <motion.div
                    key={task.id} // Use task.id for stable key
                    layout="position" // Enable smooth position animation
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10, transition: { duration: 0.15, ease: 'easeIn' } }}
                    transition={{ duration: 0.20, ease: "easeOut" }}
                    className="task-motion-wrapper"
                    id={`task-item-${task.id}`} // ID for date picker anchor
                >
                    <TaskItem
                        task={task}
                        groupCategory={isGroupedView && ['overdue', 'today', 'next7days', 'later', 'nodate'].includes(groupKey) ? groupKey as TaskGroupCategory : undefined}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    ), [isGroupedView]); // Dependency on isGroupedView


    // Memoize empty state calculations
    const isEmpty = useMemo(() => {
        if (isGroupedView) {
            return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).every(group => group.length === 0);
        } else {
            return (tasksToDisplay as Task[]).length === 0;
        }
    }, [tasksToDisplay, isGroupedView]);

    const emptyStateTitle = useMemo(() => {
        if (isSearching) return `No results for "${searchTerm}"`;
        if (currentFilterGlobal === 'trash') return 'Trash is empty';
        if (currentFilterGlobal === 'completed') return 'No completed tasks yet';
        // Use pageTitle passed from routing/wrapper
        return `No tasks in "${pageTitle}"`;
    }, [isSearching, searchTerm, currentFilterGlobal, pageTitle]);

    // Group display titles and order
    const groupTitles: Record<TaskGroupCategory, string> = useMemo(() => ({
        overdue: 'Overdue', today: 'Today', next7days: 'Next 7 Days',
        later: 'Later', nodate: 'No Date',
    }), []);
    const groupOrder: TaskGroupCategory[] = useMemo(() => ['overdue', 'today', 'next7days', 'later', 'nodate'], []);

    // Header class names
    const headerClass = useMemo(() => twMerge(
        "px-3 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 h-11 z-10",
        "bg-glass-alt-200 backdrop-blur-lg"
    ), []);

    // Determine if Add Task button should be shown
    const showAddTaskButton = useMemo(() =>
            !['completed', 'trash'].includes(currentFilterGlobal) && !isSearching
        , [currentFilterGlobal, isSearching]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={{droppable: {strategy: MeasuringStrategy.Always}}}
        >
            <div className="h-full flex flex-col bg-glass-alt-100 backdrop-blur-xl overflow-hidden">
                {/* Header */}
                <div className={headerClass}>
                    <h1 className="text-base font-semibold text-gray-800 truncate pr-2" title={pageTitle}>
                        {pageTitle}
                    </h1>
                    <div className="flex items-center space-x-1">
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
                            {currentFilterGlobal !== 'trash' && currentFilterGlobal !== 'completed' && !isSearching && (
                                <p className="text-xs mt-1 text-muted">Click the '+' button to add a new task.</p>
                            )}
                        </div>
                    ) : (
                        // Task List Content (Handles Grouped or Flat)
                        // Req 1: Container div does NOT have a key that changes, allowing inner AnimatePresence to work
                        <div>
                            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                                {isGroupedView ? (
                                    // Render Grouped View ('all' tasks, not searching)
                                    <>
                                        {groupOrder.map(groupKey => {
                                            const groupTasks = (tasksToDisplay as Record<TaskGroupCategory, Task[]>)[groupKey];
                                            if (groupTasks && groupTasks.length > 0) {
                                                return (
                                                    <div key={groupKey}>
                                                        <TaskGroupHeader title={groupTitles[groupKey]}/>
                                                        {/* Render tasks with animation */}
                                                        {renderTaskGroup(groupTasks, groupKey)}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </>
                                ) : (
                                    // Render Flat List View (specific filter or search results)
                                    <div className="pt-0.5"> {/* Optional padding */}
                                        {renderTaskGroup(tasksToDisplay as Task[], 'flat-list')}
                                    </div>
                                )}
                            </SortableContext>
                        </div>
                    )}
                </div>

                {/* Date Picker Popover (Rendered via Popper) */}
                {datePickerState?.isVisible && (
                    <div
                        ref={setPopperElement}
                        style={popperStyles.popper}
                        {...popperAttributes.popper}
                        className="z-50" // Ensure picker is on top
                    >
                        <CustomDatePickerPopover
                            initialDate={undefined} // Or pass original date if needed
                            onSelect={handleDatePick}
                            close={closeDatePicker}
                            triggerElement={datePickerState.referenceElement}
                        />
                    </div>
                )}

            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={dropAnimationConfig}>
                {draggingTask ? (
                    <TaskItem task={draggingTask} isOverlay={true} />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
export default TaskList;