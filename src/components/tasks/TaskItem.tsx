// src/components/tasks/TaskItem.tsx
import React from 'react';
import { Task } from '@/types';
import { formatRelativeDate, isOverdue } from '@/utils/dateUtils';
import { useAtom } from 'jotai';
import { selectedTaskIdAtom, tasksAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import Button from "@/components/common/Button.tsx";

interface TaskItemProps {
    task: Task;
}

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
    const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const [, setTasks] = useAtom(tasksAtom);
    const isSelected = selectedTaskId === task.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms ease', // Add default transition
        zIndex: isDragging ? 10 : undefined, // Ensure dragging item is on top
        opacity: isDragging ? 0.8 : 1,
    };


    const handleTaskClick = () => {
        setSelectedTaskId(task.id);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation(); // Prevent task selection when clicking checkbox
        const isChecked = e.target.checked;
        const now = Date.now();
        setTasks(prevTasks =>
            prevTasks.map(t =>
                t.id === task.id ? { ...t, completed: isChecked, updatedAt: now } : t
            )
        );
        // Optionally: If completing, clear selection? Or keep it selected?
        // if (isChecked && isSelected) {
        //   setSelectedTaskId(null);
        // }
    };

    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const overdue = dueDate && !task.completed && isOverdue(dueDate);

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className={twMerge(
                'task-item flex items-center px-3 py-2 border-b border-gray-100 group relative',
                isSelected && 'bg-primary/10', // Subtle selection background
                !isDragging && 'hover:bg-gray-50/80', // Hover effect only when not dragging
                isDragging && 'shadow-lg bg-white rounded-md border-gray-200' // Style for the item being dragged
            )}
            onClick={handleTaskClick}
            layout // Animate layout changes (like reordering)
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="text-muted cursor-grab mr-2 p-1 -ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 focus:outline-none"
                aria-label="Drag task"
            >
                <Icon name="grip-vertical" size={16} />
            </button>

            {/* Checkbox */}
            <div className="flex-shrink-0 mr-3">
                <input
                    type="checkbox"
                    id={`task-checkbox-${task.id}`}
                    checked={task.completed}
                    onChange={handleCheckboxChange}
                    onClick={(e) => e.stopPropagation()}
                    className={twMerge(
                        "h-4 w-4 rounded border-gray-300 focus:ring-primary focus:ring-2 focus:ring-offset-1",
                        task.completed ? 'text-primary' : 'text-primary', // Ensure color consistency
                        "transition-colors duration-150 ease-in-out cursor-pointer"
                    )}
                />
                <label htmlFor={`task-checkbox-${task.id}`} className="sr-only">Complete task {task.title}</label>
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0">
                <p className={twMerge(
                    "text-sm text-gray-800 truncate",
                    task.completed && "line-through text-muted"
                )}>
                    {task.title || "Untitled Task"}
                </p>
                {/* Subline for due date, list, tags etc. (Compact View) */}
                <div className="flex items-center text-xs text-muted space-x-2 mt-0.5">
                    {dueDate && !task.completed && (
                        <span className={clsx('flex items-center', overdue && 'text-red-600 font-medium')}>
                             <Icon name="calendar" size={12} className="mr-0.5" />
                            {formatRelativeDate(dueDate)}
                         </span>
                    )}
                    {task.list && task.list !== 'Inbox' && (
                        <span className="flex items-center">
                             <Icon name="list" size={12} className="mr-0.5" />
                            {task.list}
                         </span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                        <span className="flex items-center">
                            <Icon name="tag" size={12} className="mr-0.5" />
                            {task.tags.join(', ')}
                        </span>
                    )}
                </div>
            </div>

            {/* Priority Indicator */}
            {task.priority && !task.completed && (
                <div className={clsx("ml-2 w-1 h-4 rounded-full flex-shrink-0", {
                    'bg-red-500': task.priority === 1,
                    'bg-orange-400': task.priority === 2,
                    'bg-blue-400': task.priority === 3,
                    'bg-gray-300': task.priority === 4,
                })} title={`Priority ${task.priority}`}></div>
            )}

            {/* More Actions Button (optional, shown on hover) */}
            <Button
                variant="ghost"
                size="icon"
                className="ml-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 h-7 w-7"
                onClick={(e) => { e.stopPropagation(); console.log('More actions for', task.id); }}
                aria-label="More actions"
            >
                <Icon name="more-horizontal" size={16} />
            </Button>

        </motion.div>
    );
};

export default TaskItem;