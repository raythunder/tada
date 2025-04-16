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
import Button from "@/components/common/Button.tsx"; // Ensure Button is imported

interface TaskItemProps {
    task: Task;
    isOverlay?: boolean; // To style the item when rendered in DragOverlay
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isOverlay = false }) => {
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
    } = useSortable({ id: task.id, disabled: task.completed }); // Disable sorting for completed tasks

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 150ms ease', // Smoother transition
        // Apply styles directly for overlay or dragging state
        ...(isOverlay && { // Styles for the item when in DragOverlay
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'grabbing',
        }),
        ...(isDragging && !isOverlay && { // Styles for the original item while dragging (becomes placeholder)
            opacity: 0.4,
            // backgroundColor: 'transparent', // Make it seem like it left
        }),
    };


    const handleTaskClick = (e: React.MouseEvent) => {
        // Prevent click propagation if clicking on interactive elements inside
        if ((e.target as HTMLElement).closest('button, input')) {
            return;
        }
        if (!task.completed) { // Don't select completed tasks? Or allow viewing? Allow for now.
            setSelectedTaskId(task.id);
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation(); // Prevent task selection
        const isChecked = e.target.checked;
        const now = Date.now();
        setTasks(prevTasks =>
            prevTasks.map(t =>
                t.id === task.id ? { ...t, completed: isChecked, updatedAt: now } : t
            )
        );
        // Deselect if completing the currently selected task
        if (isChecked && isSelected) {
            setSelectedTaskId(null);
        }
    };

    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const overdue = dueDate && !task.completed && isOverdue(dueDate);

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className={twMerge(
                'task-item flex items-start px-2.5 py-2 border-b border-gray-100/80 group relative min-h-[52px]', // min-height helps with layout shifts
                isSelected && !isDragging && !isOverlay && 'bg-primary/5', // Very subtle selection, only when not dragging/overlay
                !isDragging && !isOverlay && !task.completed && 'hover:bg-gray-50/50', // Hover effect only when not dragging/overlay/completed
                isOverlay && 'bg-canvas rounded-md border border-gray-200/80', // Style for overlay
            )}
            onClick={handleTaskClick}
            layout="position" // Animate position changes smoothly
        >
            {/* Drag Handle - show on hover, always present but maybe hidden */}
            {!task.completed && ( // Only show handle for non-completed tasks
                <button
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()} // Prevent task click when using handle
                    className="text-muted cursor-grab mr-2 p-1 -ml-1 opacity-0 group-hover:opacity-50 focus-visible:opacity-100 transition-opacity duration-150 outline-none"
                    aria-label="Drag task to reorder"
                    tabIndex={-1} // Avoid tab stop on handle itself, keyboard users use space on item
                >
                    <Icon name="grip-vertical" size={15} />
                </button>
            )}
            {/* Add padding compensation if handle is hidden */}
            {task.completed && <div className="w-[23px] mr-2 flex-shrink-0"></div>}


            {/* Checkbox */}
            <div className="flex-shrink-0 mr-2.5 pt-0.5">
                <input
                    type="checkbox"
                    id={`task-checkbox-${task.id}`}
                    checked={task.completed}
                    onChange={handleCheckboxChange}
                    onClick={(e) => e.stopPropagation()} // Prevent task click
                    className={twMerge(
                        "h-4 w-4 rounded border-gray-300 focus:ring-primary/50 focus:ring-1 focus:ring-offset-1",
                        task.completed ? 'text-gray-400 border-gray-300 bg-gray-100' : 'text-primary border-gray-400/80 hover:border-primary/50', // Custom styling
                        "transition duration-100 ease-in-out cursor-pointer"
                    )}
                />
                <label htmlFor={`task-checkbox-${task.id}`} className="sr-only">Complete task {task.title}</label>
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={twMerge(
                    "text-sm text-gray-700", // Default text color
                    task.completed && "line-through text-muted",
                    // No truncate here, allow wrapping for better readability
                    // "truncate",
                )}>
                    {/* Use dangerouslySetInnerHTML carefully if title could contain HTML, otherwise just render text */}
                    {task.title || <span className="text-muted italic">Untitled Task</span>}
                </p>
                {/* Subline - Show relevant info subtly */}
                <div className="flex items-center flex-wrap text-[11px] text-muted space-x-2 mt-0.5 leading-tight">
                    {/* Priority */}
                    {task.priority && !task.completed && (
                        <span className={clsx("flex items-center font-medium", {
                            'text-red-600': task.priority === 1,
                            'text-orange-500': task.priority === 2,
                            'text-blue-500': task.priority === 3, // Example color for P3
                            // P4 might not need explicit styling or use muted
                        })} title={`Priority ${task.priority}`}>
                             <Icon name="flag" size={11} className="mr-0.5" />
                            {/* P{task.priority} */}
                         </span>
                    )}
                    {/* Due Date */}
                    {dueDate && !task.completed && (
                        <span className={clsx('flex items-center whitespace-nowrap', overdue && 'text-red-600 font-medium')}>
                             <Icon name="calendar" size={11} className="mr-0.5" />
                            {formatRelativeDate(dueDate)}
                         </span>
                    )}
                    {/* List Name (if not 'Inbox' or the current list filter?) */}
                    {task.list && task.list !== 'Inbox' && (
                        <span className="flex items-center whitespace-nowrap">
                             <Icon name="list" size={11} className="mr-0.5" />
                            {task.list}
                         </span>
                    )}
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && !task.completed && (
                        <span className="flex items-center space-x-1">
                             {/* <Icon name="tag" size={11} className="mr-0.5" /> */}
                            {task.tags.map(tag => (
                                <span key={tag} className="bg-gray-100 text-muted-foreground px-1 py-0 rounded text-[10px]">#{tag}</span>
                            ))}
                         </span>
                    )}
                    {/* Add other info like subtasks count etc. here */}
                </div>
            </div>

            {/* More Actions Button (optional, shown on hover/focus) */}
            <div className="absolute top-1.5 right-1.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className={twMerge(
                        "ml-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 h-6 w-6",
                        isSelected && "opacity-100" // Keep visible if selected
                    )}
                    onClick={(e) => { e.stopPropagation(); console.log('More actions for', task.id); /* Implement dropdown menu */ }}
                    aria-label="More actions"
                >
                    <Icon name="more-horizontal" size={16} />
                </Button>
            </div>

        </motion.div>
    );
};

export default TaskItem;