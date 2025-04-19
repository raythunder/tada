// src/components/tasks/TaskList.tsx
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import TaskItem from './TaskItem';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
    tasksAtom, selectedTaskIdAtom, currentFilterAtom,
    groupedAllTasksAtom, searchFilteredTasksAtom, searchTermAtom,
} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import { Task, TaskFilter, TaskGroupCategory } from '@/types';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
    DragEndEvent, DragOverlay, DragStartEvent, UniqueIdentifier, MeasuringStrategy
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion'; // Keep for TaskItem add/remove and DragOverlay
import {addDays, startOfDay} from '@/utils/dateUtils';
import { twMerge } from 'tailwind-merge';

interface TaskListProps {
    title: string; // Title displayed in the header
    filter: TaskFilter; // The filter associated with this list view
}

// Sticky Group Header Component (Memoized, No Animation)
const TaskGroupHeader: React.FC<{ title: string }> = React.memo(({ title }) => (
    <div
        className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-[5]"
        // Apply background and blur for sticky header effect
        style={{
            backgroundColor: 'hsla(220, 30%, 96%, 0.85)', // Slightly opaque background
            backdropFilter: 'blur(14px)', // Blur effect
            WebkitBackdropFilter: 'blur(14px)', // Safari blur
            // Mask to fade out bottom edge slightly for smoother scroll appearance
            WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
        }}
    >
        {title}
    </div>
));
TaskGroupHeader.displayName = 'TaskGroupHeader';


const TaskList: React.FC<TaskListProps> = ({ title: pageTitle, filter: pageFilter }) => {
    const [tasks, setTasks] = useAtom(tasksAtom);
    // Use a separate internal state for the filter this list actually displays,
    // while the atom reflects the globally selected filter.
    const [currentFilterInternal, setCurrentFilterAtom] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const groupedTasks = useAtomValue(groupedAllTasksAtom); // For 'all' view
    const searchFilteredTasks = useAtomValue(searchFilteredTasksAtom); // Filtered+Searched tasks
    const searchTerm = useAtomValue(searchTermAtom);

    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    // Store the category context *during* the drag operation
    const [draggingTaskCategory, setDraggingTaskCategory] = useState<TaskGroupCategory | undefined>(undefined);

    // Sync internal filter state with the global atom when the pageFilter prop changes
    useEffect(() => {
        if (pageFilter !== currentFilterInternal) {
            // console.log(`TaskList Sync: Setting internal filter to ${pageFilter}`);
            setCurrentFilterAtom(pageFilter);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageFilter]); // Only run when pageFilter prop changes

    // Determine which set of tasks to display based on search and filter
    const { tasksToDisplay, isGroupedView } = useMemo(() => {
        const isSearching = searchTerm.trim().length > 0;
        // Use search results if searching, regardless of filter
        if (isSearching) {
            // console.log("TaskList Display: Using Search Results");
            return { tasksToDisplay: searchFilteredTasks, isGroupedView: false };
        }
        // Use grouped tasks only for the 'all' filter when not searching
        else if (currentFilterInternal === 'all') {
            // console.log("TaskList Display: Using Grouped Tasks");
            return { tasksToDisplay: groupedTasks, isGroupedView: true };
        }
        // Otherwise, use the standard filtered tasks (which handles today, lists, tags etc.)
        else {
            // console.log(`TaskList Display: Using Filtered Tasks for ${currentFilterInternal}`);
            return { tasksToDisplay: searchFilteredTasks, isGroupedView: false }; // searchFilteredTasks === filteredTasks when not searching
        }
    }, [searchTerm, currentFilterInternal, groupedTasks, searchFilteredTasks]);

    // Calculate the list of item IDs for SortableContext based on the *currently displayed* tasks
    const sortableItems: UniqueIdentifier[] = useMemo(() => {
        const getIds = (data: Task[] | Record<string, Task[]>): UniqueIdentifier[] => {
            if (Array.isArray(data)) { // Flat list
                return data.map(task => task.id);
            } else { // Grouped object
                return Object.values(data).flat().map(task => task.id);
            }
        };
        return getIds(tasksToDisplay);
    }, [tasksToDisplay]);


    // Setup DND sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Require slight drag movement
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }) // Keyboard support
    );

    // Handle drag start: store the dragging task and its context
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id); // Find task from master list
        if (task) {
            setDraggingTask(task);
            // Capture the category context *at the start of the drag* from the sortable item's data
            setDraggingTaskCategory(active.data.current?.groupCategory as TaskGroupCategory | undefined);
            setSelectedTaskId(task.id); // Select the task being dragged
        }
    }, [tasks, setSelectedTaskId]);

    // Handle drag end: update task order and potentially dueDate/category
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingTask(null); // Clear dragging task state
        setDraggingTaskCategory(undefined); // Clear dragging category context

        // No drop target or dropped on itself
        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Determine the target group category if dropping in 'all' view
        const targetGroupCategory = (currentFilterInternal === 'all' && over.data.current?.groupCategory)
            ? over.data.current?.groupCategory as TaskGroupCategory
            : undefined;

        setTasks((currentTasks) => {
            const oldIndex = currentTasks.findIndex(t => t.id === activeId);
            const newIndex = currentTasks.findIndex(t => t.id === overId);

            if (oldIndex === -1 || newIndex === -1) {
                console.warn("TaskList DragEnd: Could not find dragged items indices.");
                return currentTasks; // Should not happen if data is consistent
            }

            // --- 1. Reorder based on visual drop position using full task list ---
            const reorderedTasks = arrayMove(currentTasks, oldIndex, newIndex);

            // --- 2. Calculate new fractional index for the moved task ---
            const movedTaskIndex = reorderedTasks.findIndex(t => t.id === activeId);
            const prevTask = movedTaskIndex > 0 ? reorderedTasks[movedTaskIndex - 1] : null;
            const nextTask = movedTaskIndex < reorderedTasks.length - 1 ? reorderedTasks[movedTaskIndex + 1] : null;
            const prevOrder = prevTask?.order;
            const nextOrder = nextTask?.order;
            let newOrderValue: number;
            // Calculate midpoint or edge position for fractional indexing
            if (prevOrder === undefined || prevOrder === null) { // Dropped at the beginning
                newOrderValue = (nextOrder ?? 0) - 1000; // Place before the first item
            } else if (nextOrder === undefined || nextOrder === null) { // Dropped at the end
                newOrderValue = prevOrder + 1000; // Place after the last item
            } else { // Dropped in the middle
                newOrderValue = (prevOrder + nextOrder) / 2;
            }
            // Handle potential collision (highly unlikely with float precision)
            // Handle potential collision (highly unlikely with float precision)
            if (prevOrder !== undefined && nextOrder !== undefined && prevOrder >= nextOrder) {
                console.warn("Order collision detected, forcing re-order calculation potentially");
                // Needs a re-balancing strategy if this happens frequently
                newOrderValue = prevOrder + 1; // Simple fallback, less ideal
            }


            // --- 3. Date Change Logic (Only for 'all' view drops between categories) ---
            let newDueDate: number | null | undefined = undefined; // undefined means no change
            const originalTask = currentTasks[oldIndex]; // Get original task before reorder

            // Check if dragging within 'all' view AND the target category is different
            if (originalTask && currentFilterInternal === 'all' && targetGroupCategory) {
                const originalCategory = originalTask.groupCategory; // Use persisted category
                if (targetGroupCategory !== originalCategory) {
                    // Assign new due date based on target category
                    if (targetGroupCategory === 'today') newDueDate = startOfDay(new Date()).getTime();
                    else if (targetGroupCategory === 'next7days') newDueDate = startOfDay(addDays(new Date(), 1)).getTime(); // Default to tomorrow
                    else if (targetGroupCategory === 'later') newDueDate = startOfDay(addDays(new Date(), 8)).getTime(); // Default to 8 days later
                    else if (targetGroupCategory === 'nodate') newDueDate = null; // Set to null
                    // 'overdue' drop target shouldn't ideally change the date unless explicitly handled
                    // else if (targetGroupCategory === 'overdue') newDueDate = startOfDay(subDays(new Date(), 1)).getTime();
                }
            }

            // --- 4. Apply Updates ---
            // Map over the reordered array to apply the new order and potential date change
            return reorderedTasks.map((task, index) => {
                if (index === movedTaskIndex) { // Apply changes ONLY to the moved task
                    return {
                        ...task,
                        order: newOrderValue, // Update order
                        updatedAt: Date.now(), // Update timestamp
                        // Conditionally update dueDate if it changed
                        ...(newDueDate !== undefined && { dueDate: newDueDate }),
                        // Recalculate groupCategory if date changed (atom setter will handle this)
                    };
                }
                return task; // Return other tasks unchanged
            });
        });

    }, [setTasks, currentFilterInternal]);


    // Add a new task based on the current filter context
    const handleAddTask = useCallback(() => {
        const now = Date.now();
        let defaultList = 'Inbox';
        let defaultDueDate: number | null = null;
        let defaultTags: string[] = [];

        // Set defaults based on the current active filter
        if (currentFilterInternal.startsWith('list-')) {
            const listName = currentFilterInternal.substring(5);
            if (listName !== 'Trash') defaultList = listName;
        } else if (currentFilterInternal === 'today') {
            defaultDueDate = startOfDay(now).getTime();
        } else if (currentFilterInternal.startsWith('tag-')) {
            defaultTags = [currentFilterInternal.substring(4)];
        } else if (currentFilterInternal === 'next7days') {
            // Default to tomorrow if adding in 'Next 7 Days' view
            defaultDueDate = startOfDay(addDays(now, 1)).getTime();
        }
        // No specific date/list default for 'all', 'completed', 'trash'

        // Calculate order to place the new task at the very top of the *entire* list
        const minOrder = tasks.reduce((min, t) => Math.min(min, t.order ?? Infinity), Infinity);
        const newOrder = (isFinite(minOrder) ? minOrder : 0) - 1000; // Place before the current top item

        // Create the new task object
        const newTask: Omit<Task, 'groupCategory'> = { // Omit category, atom setter calculates it
            id: `task-${now}-${Math.random().toString(16).slice(2)}`,
            title: '', // Start with empty title for immediate editing
            completed: false,
            list: defaultList,
            dueDate: defaultDueDate,
            order: newOrder,
            createdAt: now,
            updatedAt: now,
            content: '',
            tags: defaultTags,
            priority: null,
        };

        // Add task and select it
        setTasks(prev => [newTask as Task, ...prev]); // Add to the beginning (atom setter handles sorting/category)
        setSelectedTaskId(newTask.id);

        // Focus the title input in TaskDetail after a short delay
        setTimeout(() => {
            const titleInput = document.querySelector('.task-detail-title-input') as HTMLInputElement | null;
            titleInput?.focus();
        }, 150); // Delay allows TaskDetail to render

    }, [currentFilterInternal, setTasks, setSelectedTaskId, tasks]); // Added `tasks` dependency for minOrder calculation

    // Render a group of tasks (used for both grouped and flat lists)
    const renderTaskGroup = useCallback((groupTasks: Task[], groupKey: TaskGroupCategory | string) => (
        // REQ 1: Keep AnimatePresence for add/remove animation within the list/group
        <AnimatePresence initial={false} key={`group-anim-${groupKey}`}>
            {groupTasks.map((task) => (
                // REQ 1: Keep motion.div for layout animation (reordering) and add/remove
                <motion.div
                    key={task.id} // Crucial for animation and React updates
                    layout // Enable smooth layout animation for reordering
                    initial={{ opacity: 0, y: -5 }} // Entry animation
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10, transition: { duration: 0.15, ease: 'easeIn' } }} // Exit animation
                    transition={{ duration: 0.20, ease: "easeOut" }} // Default transition
                    className="task-motion-wrapper" // Optional wrapper class
                >
                    <TaskItem
                        task={task}
                        // Pass groupCategory context, especially important for 'all' view DND
                        groupCategory={isGroupedView ? (groupKey as TaskGroupCategory) : task.groupCategory}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    ), [isGroupedView]); // Recreate render function if view type changes

    // Check if the current view is empty
    const isEmpty = useMemo(() => {
        if (isGroupedView) {
            // Check if all groups in the grouped object are empty
            return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).every(group => group.length === 0);
        } else {
            // Check if the flat array is empty
            return (tasksToDisplay as Task[]).length === 0;
        }
    }, [tasksToDisplay, isGroupedView]);

    // Determine the appropriate title for the empty state message
    const emptyStateTitle = useMemo(() => {
        if (searchTerm) return `No results for "${searchTerm}"`;
        if (currentFilterInternal === 'trash') return 'Trash is empty';
        if (currentFilterInternal === 'completed') return 'No completed tasks yet';
        return `No tasks in "${pageTitle}"`;
    }, [searchTerm, currentFilterInternal, pageTitle]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter} // Simple collision detection strategy
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} // Consistent measurement
        >
            <div className="h-full flex flex-col bg-glass-alt-100 backdrop-blur-xl overflow-hidden">
                {/* Header */}
                <div className={twMerge(
                    "px-3 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 h-11 z-10",
                    "bg-glass-alt-200 backdrop-blur-lg" // Header background
                )}>
                    <h1 className="text-base font-semibold text-gray-800 truncate pr-2" title={pageTitle}>{pageTitle}</h1>
                    <div className="flex items-center space-x-1">
                        {/* Add Task Button (conditional) */}
                        {currentFilterInternal !== 'completed' && currentFilterInternal !== 'trash' && (
                            <Button variant="primary" size="sm" icon="plus" onClick={handleAddTask} className="px-2.5 !h-[30px]"> Add </Button>
                        )}
                        {/* More Options Button (Placeholder) */}
                        <Button variant="ghost" size="icon" icon="more-horizontal" aria-label="List options" className="w-7 h-7 text-muted-foreground hover:bg-black/15" />
                    </div>
                </div>

                {/* Scrollable Task List Area */}
                <div className="flex-1 overflow-y-auto styled-scrollbar relative">
                    {isEmpty ? (
                        // Empty State Message (No animation needed)
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center pt-10">
                            <Icon
                                name={currentFilterInternal === 'trash' ? 'trash' : (currentFilterInternal === 'completed' ? 'check-square' : 'archive')}
                                size={40} className="mb-3 text-gray-300 opacity-80"
                            />
                            <p className="text-sm font-medium text-gray-500">{emptyStateTitle}</p>
                            {/* Hint to add tasks if applicable */}
                            {currentFilterInternal !== 'trash' && currentFilterInternal !== 'completed' && !searchTerm && (
                                <p className="text-xs mt-1 text-muted">Click the '+' button to add a new task.</p>
                            )}
                        </div>
                    ) : (
                        // REQ 4 FIX: Add key here to force remount on view type change, preventing jumpy layout animation between grouped/flat.
                        <div key={isGroupedView ? 'grouped-view' : 'flat-view'}>
                            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                                {isGroupedView ? (
                                    // Render Grouped View
                                    <>
                                        {Object.entries(tasksToDisplay as Record<TaskGroupCategory, Task[]>)
                                            // Filter out empty groups before rendering
                                            .filter(([, groupTasks]) => groupTasks.length > 0)
                                            .map(([groupKey, groupTasks]) => (
                                                <div key={groupKey}>
                                                    <TaskGroupHeader title={groupKey.charAt(0).toUpperCase() + groupKey.slice(1).replace('7', ' 7 ')} />
                                                    {renderTaskGroup(groupTasks, groupKey as TaskGroupCategory)}
                                                </div>
                                            ))
                                        }
                                    </>
                                ) : (
                                    // Render Flat List View
                                    <div className="pt-0.5"> {/* Small top padding for flat list */}
                                        {renderTaskGroup(tasksToDisplay as Task[], 'flat-list')}
                                    </div>
                                )}
                            </SortableContext>
                        </div>
                    )}
                </div>
            </div>

            {/* Drag Overlay - Renders the TaskItem being dragged */}
            <DragOverlay dropAnimation={null}> {/* No drop animation needed */}
                {draggingTask ? (
                    <TaskItem
                        task={draggingTask}
                        groupCategory={draggingTaskCategory} // Provide category context
                        isOverlay // Mark as overlay for styling
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
export default TaskList;