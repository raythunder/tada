// src/components/tasks/TaskItem.tsx
import React, { useMemo } from 'react';
import { Task, TaskGroupCategory } from '@/types';
import { formatRelativeDate, isOverdue, safeParseDate } from '@/utils/dateUtils';
import { useAtom, useSetAtom } from 'jotai'; // Changed to useSetAtom
import { selectedTaskIdAtom, tasksAtom, searchTermAtom } from '@/store/atoms'; // Added searchTermAtom
import Icon from '../common/Icon';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from "@/components/common/Button";
import Highlighter from "react-highlight-words"; // For search highlighting

interface TaskItemProps {
    task: Task;
    groupCategory?: TaskGroupCategory;
    isOverlay?: boolean;
    style?: React.CSSProperties;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, groupCategory, isOverlay = false, style: overlayStyle }) => {
    const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const setTasks = useSetAtom(tasksAtom); // Use setter only
    const [searchTerm] = useAtom(searchTermAtom); // Get search term for highlighting
    const isSelected = selectedTaskId === task.id;

    const isSortable = !task.completed && task.list !== 'Trash';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        disabled: !isSortable,
        data: { task, type: 'task-item', groupCategory: groupCategory ?? task.groupCategory },
    });

    const style = {
        ...overlayStyle,
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 150ms ease-apple',
        ...(isDragging && !isOverlay && {
            opacity: 0.3,
            cursor: 'grabbing',
            // backgroundColor: 'hsla(210, 40%, 98%, 0.5)', // Placeholder glass
            // backdropFilter: 'blur(2px)',
        }),
        ...(isOverlay && {
            cursor: 'grabbing',
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '6px',
            border: '1px solid rgba(0, 0, 0, 0.05)'
        }),
        zIndex: isDragging || isOverlay ? 10 : 1,
    };

    const handleTaskClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Allow clicking on Trash items to view details
        const target = e.target as HTMLElement;
        if (target.closest('button, input, a')) { // Check if click is on interactive element
            return;
        }
        // Only prevent selection if clicking interactive elements *inside* a non-trash item
        // if (!isTrashItem && target.closest('button, input, a')) {
        //     return;
        // }
        setSelectedTaskId(task.id);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const isChecked = e.target.checked;
        setTasks(prevTasks =>
            prevTasks.map(t =>
                t.id === task.id ? { ...t, completed: isChecked, updatedAt: Date.now() } : t
            )
        );
        if (isChecked && isSelected) {
            setSelectedTaskId(null);
        }
    };

    const dueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const overdue = useMemo(() => dueDate && !task.completed && isOverdue(dueDate), [dueDate, task.completed]);

    const isTrashItem = task.list === 'Trash';

    const baseClasses = twMerge(
        'task-item flex items-start px-2.5 py-2 border-b border-black/10 group relative min-h-[52px] transition-colors duration-100 ease-out', // Darker border for glass
        isSelected && !isDragging && !isOverlay && 'bg-primary/15 backdrop-blur-sm', // Glassy selection
        !isSelected && !isDragging && !isOverlay && isSortable && 'hover:bg-black/5 hover:backdrop-blur-xs cursor-pointer', // Subtle hover glass
        task.completed && !isTrashItem && 'opacity-60', // Dim completed tasks
        isTrashItem && 'opacity-50 cursor-pointer hover:bg-black/5 hover:backdrop-blur-xs', // Allow clicking trash items, add hover
        isOverlay && 'bg-glass-100 backdrop-blur-md border rounded-md shadow-strong', // Overlay specific glass style
        !isSortable && !isOverlay && !isTrashItem && 'bg-canvas-alt/10 backdrop-blur-sm hover:bg-canvas-alt/10 cursor-default', // Different background for non-sortable (completed) + glass
        isSortable && !isOverlay && 'bg-transparent', // Make default sortable items transparent
    );

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={baseClasses}
            onClick={handleTaskClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTaskClick(e as any); }}
            aria-selected={isSelected}
        >
            {/* Drag Handle */}
            <div className="flex-shrink-0 h-full flex items-center mr-2">
                {isSortable ? (
                    <button
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className={twMerge(
                            "text-muted cursor-grab p-1 -ml-1 opacity-0 group-hover:opacity-50 group-focus-within:opacity-50 focus-visible:opacity-80",
                            "transition-opacity duration-150 outline-none rounded",
                            isDragging && "opacity-50"
                        )}
                        aria-label="Drag task to reorder"
                        tabIndex={-1}
                    >
                        <Icon name="grip-vertical" size={15} strokeWidth={2} />
                    </button>
                ) : (
                    <div className="w-[27px]"></div>
                )}
            </div>

            {/* Checkbox */}
            <div className="flex-shrink-0 mr-2.5 pt-[3px]">
                <input
                    type="checkbox"
                    id={`task-checkbox-${task.id}`}
                    checked={task.completed}
                    onChange={handleCheckboxChange}
                    onClick={(e) => e.stopPropagation()}
                    className={twMerge(
                        "h-4 w-4 rounded border-2 transition duration-100 ease-in-out cursor-pointer appearance-none",
                        "focus:ring-primary/50 focus:ring-1 focus:ring-offset-1 focus:ring-offset-canvas/50 focus:outline-none", // Adjust offset for glass
                        task.completed
                            ? 'bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400'
                            : 'bg-white/30 border-gray-400/80 hover:border-primary/60 backdrop-blur-sm', // Glassy unchecked
                        'relative after:content-[""] after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2',
                        'after:h-2 after:w-1 after:rotate-45 after:border-b-2 after:border-r-2 after:border-solid after:border-transparent after:transition-opacity after:duration-100',
                        task.completed ? 'after:border-white after:opacity-100' : 'after:opacity-0',
                        isTrashItem && 'opacity-50 cursor-not-allowed !border-gray-300 hover:!border-gray-300 !bg-gray-200/50 after:!border-gray-400' // Glassy disabled
                    )}
                    aria-labelledby={`task-title-${task.id}`}
                    disabled={isTrashItem}
                />
                <label htmlFor={`task-checkbox-${task.id}`} className="sr-only">Complete task</label>
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0 pt-[1px]">
                {/* Task Title with Highlighting */}
                <Highlighter
                    highlightClassName="bg-yellow-200/80 font-semibold rounded-[2px] px-0.5 mx-[-0.5px] backdrop-blur-xs" // Glassy highlight
                    searchWords={searchTerm ? searchTerm.split(' ') : []} // Split search term for multi-word highlight
                    autoEscape={true}
                    textToHighlight={task.title || 'Untitled Task'}
                    id={`task-title-${task.id}`}
                    className={twMerge(
                        "text-sm text-gray-800 leading-snug block", // Ensure it's a block for Highlighter
                        (task.completed || isTrashItem) && "line-through text-muted-foreground"
                    )}
                />

                {/* Subline */}
                <div className="flex items-center flex-wrap text-[11px] text-muted-foreground space-x-2 mt-1 leading-tight">
                    {task.priority && task.priority <= 2 && !task.completed && !isTrashItem && (
                        <span className={clsx("flex items-center", { 'text-red-600': task.priority === 1, 'text-orange-500': task.priority === 2 })} title={`Priority ${task.priority}`}>
                            <Icon name="flag" size={11} strokeWidth={2.5}/>
                        </span>
                    )}
                    {dueDate && !task.completed && !isTrashItem && (
                        <span className={clsx('flex items-center whitespace-nowrap', overdue && 'text-red-600 font-medium')}>
                            <Icon name="calendar" size={11} className="mr-0.5 opacity-70" />
                            {formatRelativeDate(dueDate)}
                        </span>
                    )}
                    {task.list && task.list !== 'Inbox' && !isTrashItem && !task.completed && !isSelected && (
                        <span className="flex items-center whitespace-nowrap bg-black/5 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[80px] truncate backdrop-blur-xs" title={task.list}> {/* Glassy badge */}
                            <Icon name="list" size={10} className="mr-0.5 opacity-70 flex-shrink-0" />
                            <span className="truncate">{task.list}</span>
                        </span>
                    )}
                    {task.tags && task.tags.length > 0 && !task.completed && !isTrashItem && (
                        <span className="flex items-center space-x-1">
                             {task.tags.slice(0, 2).map(tag => (
                                 <span key={tag} className="bg-black/5 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[70px] truncate backdrop-blur-xs" title={tag}> {/* Glassy badge */}
                                     #{tag}
                                 </span>
                             ))}
                            {task.tags.length > 2 && <span className="text-muted-foreground text-[10px]">+{task.tags.length - 2}</span>}
                         </span>
                    )}
                    {/* Optionally highlight content matches if title didn't match */}
                    {searchTerm && task.content && task.content.toLowerCase().includes(searchTerm.toLowerCase()) && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) && (
                        <Highlighter
                            highlightClassName="bg-yellow-200/80 rounded-[2px] px-0.5 mx-[-0.5px] backdrop-blur-xs"
                            searchWords={searchTerm.split(' ')}
                            autoEscape={true}
                            textToHighlight={'...' + task.content.substring(task.content.toLowerCase().indexOf(searchTerm.toLowerCase()), task.content.toLowerCase().indexOf(searchTerm.toLowerCase()) + 30) + '...'} // Show snippet
                            className="block truncate text-xs text-muted mt-0.5 italic"
                        />
                    )}
                </div>
            </div>

            {/* More Actions Button */}
            {isSortable && !isOverlay && (
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                    <Button
                        variant="ghost"
                        size="icon"
                        icon="more-horizontal" // Use icon prop
                        className="h-6 w-6 text-muted-foreground hover:bg-black/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('More actions for task:', task.id);
                            setSelectedTaskId(task.id); // Select task when opening actions
                        }}
                        aria-label={`More actions for ${task.title || 'task'}`}
                        tabIndex={0}
                    />
                </div>
            )}
        </div>
    );
};

// Memoize TaskItem for performance, especially in long lists
export default React.memo(TaskItem);