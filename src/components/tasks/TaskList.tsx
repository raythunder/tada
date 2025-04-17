// src/components/tasks/TaskList.tsx
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import TaskItem from './TaskItem';
import { useAtom, useAtomValue } from 'jotai';
import {
    filteredTasksAtom, tasksAtom, selectedTaskIdAtom, currentFilterAtom, groupedAllTasksAtom
} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import { Task, TaskFilter } from '@/types';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
    DragEndEvent, DragOverlay, DragStartEvent, UniqueIdentifier, MeasuringStrategy
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { startOfDay } from "@/utils/dateUtils"; // Use utils
// import { twMerge } from "tailwind-merge";

interface TaskListProps {
    title: string;
    filter: TaskFilter;
}

// Sticky Group Header Component with Glass Effect
const TaskGroupHeader: React.FC<{ title: string }> = ({ title }) => (
    <motion.div
        className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-[5]"
        // Apply glass effect using explicit styles for better control
        style={{
            backgroundColor: 'hsla(0, 0%, 100%, 0.75)', // White with transparency
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            // Optional mask to prevent blur bleeding too far down
            // WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
            // maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
        }}
        layout // Animate position changes
    >
        {title}
    </motion.div>
);

// Main Task List Component
const TaskList: React.FC<TaskListProps> = ({ title, filter }) => {
    const filteredTasksValue = useAtomValue(filteredTasksAtom);
    const groupedTasksValue = useAtomValue(groupedAllTasksAtom);
    const [tasks, setTasks] = useAtom(tasksAtom);
    const [currentFilterInternal, setCurrentFilterInternal] = useAtom(currentFilterAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);

    useEffect(() => {
        if (filter !== currentFilterInternal) {
            setCurrentFilterInternal(filter);
        }
    }, [filter, currentFilterInternal, setCurrentFilterInternal]);

    const sortableItems: UniqueIdentifier[] = useMemo(() => {
        if (filter === 'all') {
            return Object.values(groupedTasksValue).flat().map(task => task.id); // Flatten all groups
        } else {
            return filteredTasksValue.map(task => task.id);
        }
    }, [filter, filteredTasksValue, groupedTasksValue]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id);
        if (task) setDraggingTask(task);
    }, [tasks]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingTask(null);

        if (over && active.id !== over.id) {
            const currentVisibleIds = sortableItems; // Use the memoized IDs for the current view

            setTasks((currentTasks) => {
                const oldVisibleIndex = currentVisibleIds.findIndex(id => id === active.id);
                const newVisibleIndex = currentVisibleIds.findIndex(id => id === over.id);

                if (oldVisibleIndex === -1 || newVisibleIndex === -1) {
                    // Fallback: If indices not found in visible list, try reordering based on full list order.
                    // This might happen if the list updates during drag, though less likely with stable IDs.
                    const oldFullIndex = currentTasks.findIndex(t => t.id === active.id);
                    const newFullIndex = currentTasks.findIndex(t => t.id === over.id);
                    if (oldFullIndex !== -1 && newFullIndex !== -1) {
                        const reordered = arrayMove(currentTasks, oldFullIndex, newFullIndex);
                        // Update order based on new array index (simple approach)
                        return reordered.map((t, i) => ({ ...t, order: i, updatedAt: Date.now() }));
                    }
                    return currentTasks; // No change
                }

                // Fractional Indexing: Find adjacent tasks based on VISIBLE order
                const targetTask = currentTasks.find(t => t.id === over.id)!; // Task we are dropping ON
                // Task visually BEFORE the drop target in the current view
                const prevTask = newVisibleIndex > 0 ? currentTasks.find(t => t.id === currentVisibleIds[newVisibleIndex - 1]) : null;

                const prevOrder = prevTask?.order;
                const nextOrder = targetTask?.order; // Order of the item we are dropping onto

                let newOrderValue: number;

                // Determine new order relative to the target item's position
                if (oldVisibleIndex < newVisibleIndex) {
                    // Dragging Down: Place *after* the target item
                    const afterTargetTask = currentTasks.find(t => t.id === currentVisibleIds[newVisibleIndex + 1]);
                    const afterTargetOrder = afterTargetTask?.order;
                    if (afterTargetOrder !== undefined && afterTargetOrder !== null) {
                        newOrderValue = (nextOrder + afterTargetOrder) / 2;
                    } else {
                        newOrderValue = nextOrder + 1; // Place after target
                    }
                } else {
                    // Dragging Up: Place *before* the target item
                    if (prevOrder !== undefined && prevOrder !== null) {
                        newOrderValue = (prevOrder + nextOrder) / 2; // Between prev and target
                    } else {
                        newOrderValue = nextOrder - 1; // Place before target (first item)
                    }
                }

                return currentTasks.map(task =>
                    task.id === active.id ? { ...task, order: newOrderValue, updatedAt: Date.now() } : task
                );
            });
        }
    }, [setTasks, sortableItems]); // Depend on current view order

    const handleAddTask = () => {
        const now = Date.now();
        let defaultList = 'Inbox'; let defaultDueDate: number | null = null; let defaultTags: string[] = [];

        if (filter.startsWith('list-') && filter !== 'list-Inbox') defaultList = filter.substring(5);
        else if (filter === 'today') defaultDueDate = startOfDay(now).getTime();
        else if (filter.startsWith('tag-')) defaultTags = [filter.substring(4)];

        const firstVisibleTask = sortableItems.length > 0 ? tasks.find(t => t.id === sortableItems[0]) : null;
        const newOrder = (firstVisibleTask?.order ?? 0) - 1;

        const newTask: Task = {
            id: `task-${now}-${Math.random().toString(16).slice(2)}`, title: '', completed: false,
            list: defaultList, dueDate: defaultDueDate, order: newOrder, createdAt: now, updatedAt: now,
            content: '', tags: defaultTags, priority: null,
        };

        setTasks(prev => [newTask, ...prev]);
        setSelectedTaskId(newTask.id);
        setTimeout(() => { (document.querySelector('.task-detail-title-input') as HTMLInputElement)?.focus(); }, 50); // Shorter delay
    };

    // Render Helper for Task Groups - Preserving the requested animation
    const renderTaskGroup = (groupTasks: Task[], groupKey: string | number) => (
        <AnimatePresence initial={false} key={`group-anim-${groupKey}`}>
            {groupTasks.map((task) => (
                <motion.div
                    key={task.id}
                    layout // ** KEEPING THIS for the requested animation **
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }} // Subtle exit
                    transition={{ duration: 0.2, ease: "easeOut" }} // Subtle entry
                    className="task-motion-wrapper"
                >
                    <TaskItem task={task} />
                </motion.div>
            ))}
        </AnimatePresence>
    );

    const isEmpty = useMemo(() => {
        if (filter === 'all') return Object.values(groupedTasksValue).every(group => group.length === 0);
        else return filteredTasksValue.length === 0;
    }, [filter, groupedTasksValue, filteredTasksValue]);


    // --- Main Render ---
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
            <div className="h-full flex flex-col bg-canvas">
                {/* Header with Glass Effect */}
                <div className="px-3 py-2 border-b border-border-color/60 flex justify-between items-center flex-shrink-0 h-11 bg-glass-200 backdrop-blur-sm z-10">
                    <h1 className="text-base font-semibold text-gray-800 truncate pr-2" title={title}>{title}</h1>
                    <div className="flex items-center space-x-1">
                        {filter !== 'completed' && filter !== 'trash' && (
                            <Button variant="primary" size="sm" icon="plus" onClick={handleAddTask} className="px-2.5"> Add </Button>
                        )}
                        {/* Use icon prop for Button */}
                        <Button variant="ghost" size="icon" icon="more-horizontal" aria-label="List options" className="w-7 h-7 text-muted-foreground" />
                    </div>
                </div>

                {/* Task List Area */}
                <div className="flex-1 overflow-y-auto styled-scrollbar relative">
                    {isEmpty ? (
                        // Subtle Empty State Animation
                        <motion.div
                            className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center pt-10"
                            initial={{ opacity: 0, y: 5 }} // Less dramatic slide
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }} // Faster duration
                        >
                            <Icon name={filter === 'trash' ? 'trash' : (filter === 'completed' ? 'check-square' : 'archive')} size={40} className="mb-3 text-gray-300 opacity-80" />
                            <p className="text-sm font-medium text-gray-500">
                                {filter === 'trash' ? 'Trash is empty' : (filter === 'completed' ? 'No completed tasks' : `No tasks in "${title}"`)}
                            </p>
                            {filter !== 'trash' && filter !== 'completed' && ( <p className="text-xs mt-1 text-muted">Click '+' to add a task.</p> )}
                        </motion.div>
                    ) : (
                        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                            {filter === 'all' ? (
                                <>
                                    {groupedTasksValue.overdue.length > 0 && ( <> <TaskGroupHeader title="Overdue" /> {renderTaskGroup(groupedTasksValue.overdue, 'overdue')} </> )}
                                    {groupedTasksValue.today.length > 0 && ( <> <TaskGroupHeader title="Today" /> {renderTaskGroup(groupedTasksValue.today, 'today')} </> )}
                                    {groupedTasksValue.next7days.length > 0 && ( <> <TaskGroupHeader title="Next 7 Days" /> {renderTaskGroup(groupedTasksValue.next7days, 'next7days')} </> )}
                                    {groupedTasksValue.later.length > 0 && ( <> <TaskGroupHeader title="Later" /> {renderTaskGroup(groupedTasksValue.later, 'later')} </> )}
                                    {groupedTasksValue.nodate.length > 0 && ( <> <TaskGroupHeader title="No Due Date" /> {renderTaskGroup(groupedTasksValue.nodate, 'nodate')} </> )}
                                </>
                            ) : (
                                <div className="pt-0.5"> {renderTaskGroup(filteredTasksValue, 'default-group')} </div>
                            )}
                        </SortableContext>
                    )}
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={null}>
                {draggingTask ? ( <TaskItem task={draggingTask} isOverlay style={{ boxShadow: '0 6px 10px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.08)' }} /> ) : null}
            </DragOverlay>
        </DndContext>
    );
};
export default TaskList;