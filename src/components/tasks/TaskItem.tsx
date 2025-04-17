// src/components/tasks/TaskItem.tsx
import React, {useMemo} from 'react';
import { Task } from '@/types';
import { formatRelativeDate, isOverdue, safeParseDate } from '@/utils/dateUtils';
import { useAtom } from 'jotai';
import { selectedTaskIdAtom, tasksAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from "@/components/common/Button";

interface TaskItemProps {
    task: Task;
    isOverlay?: boolean;
    style?: React.CSSProperties;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isOverlay = false, style: overlayStyle }) => {
    const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const [, setTasks] = useAtom(tasksAtom);
    const isSelected = selectedTaskId === task.id;
    const isSortable = !task.completed && task.list !== 'Trash';

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        disabled: !isSortable,
        data: { task, type: 'task-item' },
    });

    const style = {
        ...overlayStyle,
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 150ms ease', // Keep default dnd-kit transition
        ...(isDragging && !isOverlay && { opacity: 0.4, cursor: 'grabbing' }),
        ...(isOverlay && { cursor: 'grabbing', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', borderRadius: '6px' }),
        zIndex: isDragging || isOverlay ? 10 : 1,
    };

    const handleTaskClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, input, a') || task.list === 'Trash') return;
        setSelectedTaskId(task.id);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: e.target.checked, updatedAt: Date.now() } : t));
        if (e.target.checked && isSelected) setSelectedTaskId(null);
    };

    const dueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const overdue = useMemo(() => dueDate && !task.completed && isOverdue(dueDate), [dueDate, task.completed]);

    const baseClasses = twMerge(
        'task-item flex items-start px-2.5 py-2 border-b border-border-color/60 group relative min-h-[52px] transition-colors duration-100 ease-out cursor-pointer',
        isSelected && !isDragging && !isOverlay && 'bg-primary/5',
        !isSelected && !isDragging && !isOverlay && isSortable && 'hover:bg-gray-50/70',
        task.completed && 'opacity-70',
        task.list === 'Trash' && 'opacity-60 cursor-default hover:bg-transparent',
        isOverlay && 'bg-canvas border rounded-md',
        !isSortable && 'bg-canvas-alt/30 hover:bg-canvas-alt/30 cursor-default',
    );

    return (
        // The motion wrapper is handled in TaskList for entry/exit animation
        <div
            ref={setNodeRef} style={style} className={baseClasses} onClick={handleTaskClick}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTaskClick(e as any); }}
            aria-selected={isSelected}
        >
            {/* Drag Handle */}
            <div className="flex-shrink-0 h-full flex items-center mr-2">
                {isSortable ? (
                    <button
                        {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}
                        className={twMerge("text-muted cursor-grab p-1 -ml-1 opacity-0 group-hover:opacity-60 group-focus-within:opacity-60 focus-visible:opacity-100", "transition-opacity duration-150 outline-none", isDragging && "opacity-60")}
                        aria-label="Drag task to reorder" tabIndex={-1}
                    >
                        <Icon name="grip-vertical" size={15} strokeWidth={2} />
                    </button>
                ) : ( <div className="w-[27px]"></div> )}
            </div>

            {/* Checkbox */}
            <div className="flex-shrink-0 mr-2.5 pt-[3px]">
                <input
                    type="checkbox" id={`task-checkbox-${task.id}`} checked={task.completed}
                    onChange={handleCheckboxChange} onClick={(e) => e.stopPropagation()}
                    className={twMerge( "h-4 w-4 rounded border-2 transition duration-100 ease-in-out cursor-pointer", "focus:ring-primary/50 focus:ring-1 focus:ring-offset-1 focus:outline-none", task.completed ? 'bg-gray-300 border-gray-300 text-white hover:bg-gray-400 hover:border-gray-400' : 'text-primary border-gray-400/80 hover:border-primary/60 bg-canvas', task.list === 'Trash' && 'opacity-50 cursor-not-allowed border-gray-300 hover:border-gray-300' )}
                    aria-labelledby={`task-title-${task.id}`} disabled={task.list === 'Trash'}
                />
                <label htmlFor={`task-checkbox-${task.id}`} className="sr-only">Complete task</label>
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0 pt-[1px]">
                <p id={`task-title-${task.id}`} className={twMerge("text-sm text-gray-800 leading-snug", task.completed && "line-through text-muted", task.list === 'Trash' && "text-muted line-through")}>
                    {task.title || <span className="text-muted italic">Untitled Task</span>}
                </p>
                <div className="flex items-center flex-wrap text-[11px] text-muted space-x-2 mt-1 leading-tight">
                    {task.priority && task.priority <= 2 && !task.completed && task.list !== 'Trash' && (
                        <span className={clsx("flex items-center", {'text-red-600': task.priority === 1, 'text-orange-500': task.priority === 2})} title={`Priority ${task.priority}`}>
                            <Icon name="flag" size={11} strokeWidth={2.5}/>
                        </span>
                    )}
                    {dueDate && !task.completed && task.list !== 'Trash' && (
                        <span className={clsx('flex items-center whitespace-nowrap', overdue && 'text-red-600 font-medium')}>
                            <Icon name="calendar" size={11} className="mr-0.5 opacity-70" /> {formatRelativeDate(dueDate)}
                        </span>
                    )}
                    {task.list && task.list !== 'Inbox' && task.list !== 'Trash' && !task.completed && !isSelected && (
                        <span className="flex items-center whitespace-nowrap bg-gray-100 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[80px] truncate" title={task.list}>
                            <Icon name="list" size={10} className="mr-0.5 opacity-70 flex-shrink-0" />
                            <span className="truncate">{task.list}</span>
                        </span>
                    )}
                    {task.tags && task.tags.length > 0 && !task.completed && task.list !== 'Trash' && (
                        <span className="flex items-center space-x-1">
                            {task.tags.slice(0, 2).map(tag => ( <span key={tag} className="bg-gray-100 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[70px] truncate" title={tag}> #{tag} </span> ))}
                            {task.tags.length > 2 && <span className="text-muted text-[10px]">+{task.tags.length - 2}</span>}
                        </span>
                    )}
                </div>
            </div>

            {/* More Actions Button */}
            {isSortable && !isOverlay && (
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                    <Button
                        variant="ghost" size="icon" icon="more-horizontal" // Use icon prop
                        className="h-6 w-6 text-muted-foreground"
                        onClick={(e) => { e.stopPropagation(); console.log('More actions for task:', task.id); setSelectedTaskId(task.id); }}
                        aria-label={`More actions for ${task.title || 'task'}`} tabIndex={0}
                    />
                </div>
            )}
        </div>
    );
};

export default TaskItem;