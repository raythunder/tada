// src/components/tasks/TaskList.tsx
import React, { useCallback } from 'react';
import TaskItem from './TaskItem';
import { useAtom } from 'jotai';
import { filteredTasksAtom, tasksAtom, selectedTaskIdAtom, currentFilterAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import {Task, TaskFilter} from '@/types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import {startOfDay} from "date-fns";

interface TaskListProps {
    title: string;
    filter: TaskFilter;
}

const TaskList: React.FC<TaskListProps> = ({ title, filter }) => {
    const [tasks, setTasks] = useAtom(tasksAtom); // Get the raw tasks atom for modification
    // const [filteredTaskIds] = useAtom(filteredTasksAtom); // Get the full task objects for rendering
    const [filteredTasks] = useAtom(filteredTasksAtom); // Get the full task objects for rendering
    const filteredIds = filteredTasks.map(task => task.id); // Get IDs for SortableContext
    // const [listDisplayMode, setListDisplayMode] = useAtom(listDisplayModeAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const [, setCurrentFilter] = useAtom(currentFilterAtom);
    const [draggingTask, setDraggingTask] = React.useState<Task | null>(null);

    React.useEffect(() => {
        // Update the global filter state when this component mounts/updates
        // This ensures the correct tasks are fetched by filteredTasksAtom
        setCurrentFilter(filter);
    }, [filter, setCurrentFilter]);


    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                // Require pointer movement before starting drag
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) {
            setDraggingTask(task);
            setSelectedTaskId(task.id); // Select the task being dragged
        }
    }, [tasks, setSelectedTaskId]);


    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingTask(null); // Clear dragging task state

        if (over && active.id !== over.id) {
            setTasks((currentTasks) => {
                const oldIndex = currentTasks.findIndex((task) => task.id === active.id);
                const newIndex = currentTasks.findIndex((task) => task.id === over.id);

                if (oldIndex === -1 || newIndex === -1) {
                    console.warn("Could not find task indices for reordering.");
                    return currentTasks; // Should not happen if IDs are correct
                }

                // Use arrayMove from dnd-kit/utilities for immutable reordering
                const reorderedTasks = arrayMove(currentTasks, oldIndex, newIndex);

                // Update the 'order' property based on the new array index
                // This assumes 'order' directly maps to array index after sorting
                // A more robust approach might involve larger gaps or fractional indexing
                const updatedTasks = reorderedTasks.map((task, index) => ({
                    ...task,
                    order: index,
                    updatedAt: Date.now(), // Update timestamp on reorder
                }));

                return updatedTasks;
            });
        }
    }, [setTasks]);

    const handleAddTask = () => {
        const now = Date.now();
        const newTask: Task = {
            id: `task-${now}`, // Simple unique ID
            title: '', // Start with empty title for inline editing
            completed: false,
            list: filter === 'inbox' || filter === 'all' ? 'Inbox' : (filter.startsWith('list-') ? filter.substring(5) : 'Inbox'), // Assign to current list or Inbox
            dueDate: filter === 'today' ? startOfDay(now).getTime() : null, // Set due date if in Today view
            order: tasks.length, // Append to the end initially
            createdAt: now,
            updatedAt: now,
            content: '',
        };
        setTasks(prev => [...prev, newTask]);
        setSelectedTaskId(newTask.id); // Select the new task for editing
        // Consider scrolling the new task into view
    };


    // const toggleViewMode = () => {
    //     setListDisplayMode(listDisplayMode === 'expanded' ? 'compact' : 'expanded');
    // };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex flex-col bg-canvas">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-gray-200/80 flex justify-between items-center flex-shrink-0">
                    <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
                    <div className="flex items-center space-x-1">
                        {/* View Toggle could be added back if needed */}
                        {/* <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleViewMode}
                            title={listDisplayMode === 'expanded' ? 'Compact view' : 'Expanded view'}
                            aria-label={listDisplayMode === 'expanded' ? 'Switch to compact view' : 'Switch to expanded view'}
                        >
                            <Icon name={listDisplayMode === 'expanded' ? 'list' : 'grid'} size={18} />
                        </Button> */}
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="List options"
                        >
                            <Icon name="more-horizontal" size={18} />
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon="plus"
                            onClick={handleAddTask}
                            className="ml-1" // Add slight margin
                        >
                            Add Task
                        </Button>
                    </div>
                </div>

                {/* Task List Area */}
                <div className="flex-1 overflow-y-auto styled-scrollbar">
                    {/* Check if filter is still loading or empty */}
                    {filteredTasks.length === 0 && filter !== 'trash' && filter !== 'completed' ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center pt-10">
                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
                                <Icon name="check-square" size={48} className="mb-3 text-gray-300" />
                            </motion.div>
                            <p className="text-sm">No tasks here yet.</p>
                            <p className="text-xs mt-1">Add a task using the "+" button above.</p>
                        </div>
                    ) : (
                        <SortableContext items={filteredIds} strategy={verticalListSortingStrategy}>
                            <AnimatePresence initial={false}>
                                {filteredTasks.map((task) => (
                                    <motion.div
                                        key={task.id}
                                        layout // Animate layout changes
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }} // Slide out on exit
                                        transition={{ duration: 0.2 }}
                                    >
                                        <TaskItem task={task} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </SortableContext>
                    )}
                </div>
            </div>

            {/* Drag Overlay for smoother dragging visual */}
            <DragOverlay dropAnimation={null}>
                {draggingTask ? <TaskItem task={draggingTask} /> : null}
            </DragOverlay>
        </DndContext>
    );
};

export default TaskList;