// src/components/tasks/TaskList.tsx
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import TaskItem from './TaskItem';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
    tasksAtom,
    selectedTaskIdAtom,
    currentFilterAtom,
    groupedAllTasksAtom, // Use this for 'all' view structure
    // filteredTasksAtom,   // Use this for other views structure
    searchTermAtom,      // Use search term atom
    searchFilteredTasksAtom // Use derived atom for combined filtering/searching
} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import { Task, TaskFilter, TaskGroupCategory } from '@/types';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
    DragEndEvent, DragOverlay, DragStartEvent, UniqueIdentifier, MeasuringStrategy
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { startOfDay } from '@/utils/dateUtils'; // Removed unused date checks
import { twMerge } from 'tailwind-merge';

// Interface for component props
interface TaskListProps {
    title: string;
    filter: TaskFilter; // Receive filter from page
}

// Sticky Group Header Component with Stronger Glass Effect
const TaskGroupHeader: React.FC<{ title: string }> = React.memo(({ title }) => ( // Memoize Header
    <motion.div
        className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-[5]"
        style={{
            backgroundColor: 'hsla(220, 30%, 96%, 0.8)', // Use inset glass color base
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            // Mask to fade out bottom edge, blending with content scroll
            WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
        }}
        layout // Animate position if list changes cause header shifts
    >
        {title}
    </motion.div>
));
TaskGroupHeader.displayName = 'TaskGroupHeader';


// Main Task List Component
const TaskList: React.FC<TaskListProps> = ({ title: pageTitle, filter: pageFilter }) => {
    // --- State and Atoms ---
    const [tasks, setTasks] = useAtom(tasksAtom);
    const [currentFilterInternal, setCurrentFilterInternal] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const groupedTasks = useAtomValue(groupedAllTasksAtom); // For 'all' view structure
    const searchFilteredTasks = useAtomValue(searchFilteredTasksAtom); // Use combined atom
    const searchTerm = useAtomValue(searchTermAtom); // Read search term

    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const [draggingTaskCategory, setDraggingTaskCategory] = useState<TaskGroupCategory | undefined>(undefined);

    // --- Effects ---
    // Sync external filter prop with internal atom state if different
    useEffect(() => {
        if (pageFilter !== currentFilterInternal) {
            setCurrentFilterInternal(pageFilter);
        }
    }, [pageFilter, currentFilterInternal, setCurrentFilterInternal]);

    // --- Memoized Values ---
    // Determine which set of tasks to display based on search state and current filter
    const { tasksToDisplay, isGroupedView } = useMemo(() => {
        const isSearching = searchTerm.trim().length > 0;
        if (isSearching) {
            // When searching, always show a flat list of results
            return { tasksToDisplay: searchFilteredTasks, isGroupedView: false };
        } else if (currentFilterInternal === 'all') {
            // 'All' view uses the grouped structure
            return { tasksToDisplay: groupedTasks, isGroupedView: true };
        } else {
            // Other filters use the flat filtered list (already handled by searchFilteredTasks atom when search is empty)
            return { tasksToDisplay: searchFilteredTasks, isGroupedView: false };
        }
    }, [searchTerm, currentFilterInternal, groupedTasks, searchFilteredTasks]);

    // Get task IDs for SortableContext based on the current view structure
    const sortableItems: UniqueIdentifier[] = useMemo(() => {
        if (isGroupedView) {
            // Flatten tasks from grouped structure for SortableContext ID list
            return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat().map(task => task.id);
        } else {
            // Use flat list directly
            return (tasksToDisplay as Task[]).map(task => task.id);
        }
    }, [tasksToDisplay, isGroupedView]);

    // --- Dnd-Kit Setup ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Drag and Drop Handlers ---
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const taskData = active.data.current?.task as Task | undefined;
        const categoryData = active.data.current?.groupCategory as TaskGroupCategory | undefined;
        const task = taskData ?? tasks.find(t => t.id === active.id); // Fallback lookup
        if (task) {
            setDraggingTask(task);
            setDraggingTaskCategory(categoryData ?? task.groupCategory);
        }
    }, [tasks]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingTask(null);
        setDraggingTaskCategory(undefined);

        if (!over || active.id === over.id) return; // No valid drop

        const activeId = active.id as string;
        const overId = over.id as string;
        const targetGroupCategory = over.data.current?.groupCategory as TaskGroupCategory | undefined;

        // Determine visual indices based on the *flattened* list used by SortableContext
        const currentVisualTaskList = isGroupedView ? Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat() : (tasksToDisplay as Task[]);
        const oldVisualIndex = currentVisualTaskList.findIndex(t => t.id === activeId);
        const newVisualIndex = currentVisualTaskList.findIndex(t => t.id === overId);

        if (oldVisualIndex === -1 || newVisualIndex === -1) {
            console.warn("TaskList DragEnd: Could not find dragged items in the current visual list.");
            // Fallback: Use arrayMove on the base tasks atom (less accurate visually)
            setTasks(currentTasks => {
                const oldFullIndex = currentTasks.findIndex(t => t.id === activeId);
                const newFullIndex = currentTasks.findIndex(t => t.id === overId);
                return (oldFullIndex !== -1 && newFullIndex !== -1) ? arrayMove(currentTasks, oldFullIndex, newFullIndex) : currentTasks;
            });
            return;
        }

        // --- Fractional Indexing Logic (using visual order) ---
        const isMovingDown = oldVisualIndex < newVisualIndex;
        const prevTaskVisual = isMovingDown ? currentVisualTaskList[newVisualIndex] : (newVisualIndex > 0 ? currentVisualTaskList[newVisualIndex - 1] : null);
        const nextTaskVisual = isMovingDown ? (newVisualIndex + 1 < currentVisualTaskList.length ? currentVisualTaskList[newVisualIndex + 1] : null) : currentVisualTaskList[newVisualIndex];
        const prevOrder = prevTaskVisual?.order;
        const nextOrder = nextTaskVisual?.order;
        let newOrderValue: number;
        if (prevOrder === undefined || prevOrder === null) { newOrderValue = (nextOrder ?? 0) - 1; }
        else if (nextOrder === undefined || nextOrder === null) { newOrderValue = prevOrder + 1; }
        else { newOrderValue = (prevOrder + nextOrder) / 2; }
        // --- End Fractional Indexing ---

        // --- Handle Date Change (Implicitly for 'today'/'nodate' in 'all' view only) ---
        let newDueDate: number | null | undefined = undefined; // undefined = no change
        if (currentFilterInternal === 'all' && targetGroupCategory) {
            const originalTask = tasks.find(t => t.id === activeId);
            if (originalTask) {
                const originalCategory = originalTask.groupCategory;
                if (targetGroupCategory !== originalCategory) {
                    console.log(`Dropped task ${activeId} from ${originalCategory} to ${targetGroupCategory}`);
                    if (targetGroupCategory === 'today') {
                        newDueDate = startOfDay(new Date()).getTime();
                    } else if (targetGroupCategory === 'nodate') {
                        newDueDate = null; // Explicitly clear date
                    }
                    // NO date change/prompt for overdue, next7days, later as per revised requirement
                }
            }
        }
        // --- End Date Change ---

        // Update the tasks atom
        setTasks((currentTasks) =>
            currentTasks.map((task) => {
                if (task.id === activeId) {
                    return {
                        ...task,
                        order: newOrderValue,
                        updatedAt: Date.now(),
                        ...(newDueDate !== undefined && { dueDate: newDueDate }),
                        // groupCategory will be updated automatically by the tasksAtom setter
                    };
                }
                return task;
            })
        );
    }, [setTasks, currentFilterInternal, isGroupedView, tasksToDisplay, tasks]); // Added tasks dependency

    // --- Add Task Handler ---
    const handleAddTask = useCallback(() => {
        const now = Date.now();
        let defaultList = 'Inbox';
        let defaultDueDate: number | null = null;
        let defaultTags: string[] = [];

        if (currentFilterInternal.startsWith('list-')) {
            const listName = currentFilterInternal.substring(5);
            if (listName !== 'Inbox' && listName !== 'Trash') defaultList = listName;
        } else if (currentFilterInternal === 'today') {
            defaultDueDate = startOfDay(now).getTime();
        } else if (currentFilterInternal.startsWith('tag-')) {
            defaultTags = [currentFilterInternal.substring(4)];
        } else if (currentFilterInternal === 'next7days') {
            defaultDueDate = startOfDay(new Date(now + 86400000)).getTime(); // Tomorrow
        }

        // Calculate order based on the currently displayed tasks
        const currentVisualTaskList = isGroupedView ? Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).flat() : (tasksToDisplay as Task[]);
        const firstVisibleTaskOrder = currentVisualTaskList.length > 0 ? currentVisualTaskList[0]?.order : 0;
        const newOrder = (firstVisibleTaskOrder ?? 0) - 1;

        const newTaskBase: Omit<Task, 'groupCategory'> = {
            id: `task-${now}-${Math.random().toString(16).slice(2)}`,
            title: '', completed: false, list: defaultList, dueDate: defaultDueDate,
            order: newOrder, createdAt: now, updatedAt: now, content: '', tags: defaultTags, priority: null,
        };
        const newTask: Task = newTaskBase as Task; // Cast, knowing atom will add category

        setTasks(prev => [newTask, ...prev]);
        setSelectedTaskId(newTask.id);

        setTimeout(() => {
            const titleInput = document.querySelector('.task-detail-title-input') as HTMLInputElement | null;
            titleInput?.focus();
        }, 100);
    }, [currentFilterInternal, isGroupedView, tasksToDisplay, setTasks, setSelectedTaskId]);

    // --- Render Helper for Task Groups/Lists ---
    const renderTaskGroup = useCallback((groupTasks: Task[], groupKey: TaskGroupCategory | string) => (
        // AnimatePresence helps with enter/exit, key ensures correct item matching
        <AnimatePresence initial={false} key={`group-anim-${groupKey}`}>
            {groupTasks.map((task) => (
                // motion.div with layout prop handles the smooth reordering animation
                <motion.div
                    key={task.id} // Use task ID as the key
                    layout // THIS IS CRUCIAL for the reordering animation
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10, transition: { duration: 0.15, ease: 'easeIn' } }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="task-motion-wrapper" // Optional wrapper class
                >
                    <TaskItem
                        task={task}
                        // Pass the correct category context for DnD logic
                        groupCategory={typeof groupKey === 'string' && ['overdue', 'today', 'next7days', 'later', 'nodate'].includes(groupKey) ? groupKey as TaskGroupCategory : task.groupCategory}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    ), []); // Empty dependency array as it uses props passed during render

    // Determine if the current view is empty based on the *final* list/groups being rendered
    const isEmpty = useMemo(() => {
        if (isGroupedView) {
            return Object.values(tasksToDisplay as Record<TaskGroupCategory, Task[]>).every(group => group.length === 0);
        } else {
            return (tasksToDisplay as Task[]).length === 0;
        }
    }, [tasksToDisplay, isGroupedView]);

    // --- Main Render ---
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
            {/* Container with strong glass */}
            <div className="h-full flex flex-col bg-glass-alt-100 backdrop-blur-xl">
                {/* Header with strong glass */}
                <div className={twMerge(
                    "px-3 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 h-11 z-10",
                    "bg-glass-alt-200 backdrop-blur-lg" // Stronger glass header
                )}>
                    <h1 className="text-base font-semibold text-gray-800 truncate pr-2" title={pageTitle}>{pageTitle}</h1>
                    <div className="flex items-center space-x-1">
                        {/* Conditionally show Add Task button */}
                        {currentFilterInternal !== 'completed' && currentFilterInternal !== 'trash' && (
                            <Button variant="primary" size="sm" icon="plus" onClick={handleAddTask} className="px-2.5"> Add </Button>
                        )}
                        {/* Options Button (Functionality TBD) */}
                        <Button variant="ghost" size="icon" icon="more-horizontal" aria-label="List options" className="w-7 h-7 text-muted-foreground hover:bg-black/10" />
                    </div>
                </div>

                {/* Task List Area */}
                <div className="flex-1 overflow-y-auto styled-scrollbar relative">
                    {isEmpty ? (
                        // Empty State Message
                        <motion.div
                            className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center pt-10"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Icon
                                name={currentFilterInternal === 'trash' ? 'trash' : (currentFilterInternal === 'completed' ? 'check-square' : 'archive')}
                                size={40} className="mb-3 text-gray-300 opacity-80"
                            />
                            <p className="text-sm font-medium text-gray-500">
                                {searchTerm ? `No results for "${searchTerm}"` :
                                    currentFilterInternal === 'trash' ? 'Trash is empty' :
                                        currentFilterInternal === 'completed' ? 'No completed tasks yet' :
                                            `No tasks in "${pageTitle}"`}
                            </p>
                            {currentFilterInternal !== 'trash' && currentFilterInternal !== 'completed' && !searchTerm && (
                                <p className="text-xs mt-1 text-muted">Click the '+' button to add a new task.</p>
                            )}
                        </motion.div>
                    ) : (
                        // Sortable Context wrapping the tasks
                        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                            {isGroupedView ? (
                                // Render grouped tasks ('All' view without search)
                                <>
                                    {(tasksToDisplay as Record<TaskGroupCategory, Task[]>).overdue.length > 0 && ( <> <TaskGroupHeader title="Overdue" /> {renderTaskGroup((tasksToDisplay as Record<TaskGroupCategory, Task[]>).overdue, 'overdue')} </> )}
                                    {(tasksToDisplay as Record<TaskGroupCategory, Task[]>).today.length > 0 && ( <> <TaskGroupHeader title="Today" /> {renderTaskGroup((tasksToDisplay as Record<TaskGroupCategory, Task[]>).today, 'today')} </> )}
                                    {(tasksToDisplay as Record<TaskGroupCategory, Task[]>).next7days.length > 0 && ( <> <TaskGroupHeader title="Next 7 Days" /> {renderTaskGroup((tasksToDisplay as Record<TaskGroupCategory, Task[]>).next7days, 'next7days')} </> )}
                                    {(tasksToDisplay as Record<TaskGroupCategory, Task[]>).later.length > 0 && ( <> <TaskGroupHeader title="Later" /> {renderTaskGroup((tasksToDisplay as Record<TaskGroupCategory, Task[]>).later, 'later')} </> )}
                                    {(tasksToDisplay as Record<TaskGroupCategory, Task[]>).nodate.length > 0 && ( <> <TaskGroupHeader title="No Due Date" /> {renderTaskGroup((tasksToDisplay as Record<TaskGroupCategory, Task[]>).nodate, 'nodate')} </> )}
                                </>
                            ) : (
                                // Render flat list (search results or specific filter view)
                                <div className="pt-0.5">
                                    {renderTaskGroup(tasksToDisplay as Task[], 'flat-list')}
                                </div>
                            )}
                        </SortableContext>
                    )}
                </div>
            </div>

            {/* Drag Overlay with Glass */}
            <DragOverlay dropAnimation={null}>
                {draggingTask ? (
                    <TaskItem
                        task={draggingTask}
                        groupCategory={draggingTaskCategory}
                        isOverlay // Applies strong glass effect via TaskItem style
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
export default TaskList;