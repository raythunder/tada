// src/components/tasks/TaskItem.tsx
import React, { useCallback, useMemo, memo } from 'react';
import { Task, TaskGroupCategory } from '@/types';
import { formatDate, formatRelativeDate, isOverdue, safeParseDate, isValid } from '@/utils/dateUtils';
import { useAtom, useSetAtom } from 'jotai';
import { searchTermAtom, selectedTaskIdAtom, tasksAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from "@/components/common/Button";
import Highlighter from "react-highlight-words";
import { IconName } from "@/components/common/IconMap";

interface TaskItemProps {
    task: Task;
    groupCategory?: TaskGroupCategory; // Category context for DND in 'All' view
    isOverlay?: boolean; // Flag for drag overlay rendering
    style?: React.CSSProperties; // Style passed by DragOverlay
}

// Helper function for snippet generation (remains the same)
function generateContentSnippet(content: string, term: string, length: number = 35): string {
    if (!content || !term) return '';
    const lowerContent = content.toLowerCase();
    const searchWords = term.toLowerCase().split(' ').filter(Boolean);
    let firstMatchIndex = -1;
    let matchedWord = '';

    for (const word of searchWords) {
        const index = lowerContent.indexOf(word);
        if (index !== -1) {
            firstMatchIndex = index;
            matchedWord = word;
            break;
        }
    }

    if (firstMatchIndex === -1) {
        return content.substring(0, length) + (content.length > length ? '...' : '');
    }

    const start = Math.max(0, firstMatchIndex - Math.floor(length / 3));
    const end = Math.min(content.length, firstMatchIndex + matchedWord.length + Math.ceil(length * 2 / 3));
    let snippet = content.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
}

// Performance: Memoize TaskItem
const TaskItem: React.FC<TaskItemProps> = memo(({ task, groupCategory, isOverlay = false, style: overlayStyle }) => {
    const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const setTasks = useSetAtom(tasksAtom);
    const [searchTerm] = useAtom(searchTermAtom);
    const isSelected = useMemo(() => selectedTaskId === task.id, [selectedTaskId, task.id]);

    // Memoize derived states
    const isTrashItem = useMemo(() => task.list === 'Trash', [task.list]);
    const isCompleted = useMemo(() => task.completed && !isTrashItem, [task.completed, isTrashItem]);
    const isSortable = useMemo(() => !isCompleted && !isTrashItem, [isCompleted, isTrashItem]);

    // dnd-kit sortable hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition: dndTransition,
        isDragging,
    } = useSortable({
        id: task.id,
        disabled: !isSortable,
        data: { task, type: 'task-item', groupCategory: groupCategory ?? task.groupCategory },
    });

    // Memoize style calculation
    const style = useMemo(() => ({
        ...overlayStyle,
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? (dndTransition || 'transform 50ms ease-apple') : undefined,
        ...(isDragging && !isOverlay && {
            opacity: 0.3,
            cursor: 'grabbing',
            backgroundColor: 'hsla(210, 40%, 98%, 0.5)',
            backdropFilter: 'blur(2px)',
            boxShadow: 'none',
            border: '1px dashed hsla(0, 0%, 0%, 0.1)',
        }),
        ...(isOverlay && {
            cursor: 'grabbing',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
            zIndex: 1000, // Ensure overlay is on top
        }),
        zIndex: isDragging || isOverlay ? 10 : 1,
    }), [overlayStyle, transform, dndTransition, isDragging, isOverlay]);

    // Memoize click handler
    const handleTaskClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, a, .task-item-actions button')) return;
        setSelectedTaskId(id => (id === task.id ? null : task.id));
    }, [setSelectedTaskId, task.id]);

    // Memoize checkbox handler
    const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const isChecked = e.target.checked;
        setTasks(prevTasks =>
            prevTasks.map(t =>
                t.id === task.id ? {
                    ...t,
                    completed: isChecked,
                    updatedAt: Date.now()
                } : t
            )
        );
        if (isChecked && isSelected) {
            setSelectedTaskId(null);
        }
    }, [setTasks, task.id, isSelected, setSelectedTaskId]);

    // Memoize date and overdue calculation
    const dueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const isValidDueDate = useMemo(() => dueDate && isValid(dueDate), [dueDate]);
    const overdue = useMemo(() => isValidDueDate && !isCompleted && !isTrashItem && isOverdue(dueDate!), [isValidDueDate, isCompleted, isTrashItem, dueDate]);

    // Memoize search term processing
    const searchWords = useMemo(() => searchTerm ? searchTerm.trim().toLowerCase().split(' ').filter(Boolean) : [], [searchTerm]);
    const highlighterProps = useMemo(() => ({
        highlightClassName: "bg-yellow-300/70 font-semibold rounded-[2px] px-0.5 mx-[-0.5px] backdrop-blur-xs",
        searchWords: searchWords,
        autoEscape: true,
    }), [searchWords]);

    // Memoize check for showing content highlight
    const showContentHighlight = useMemo(() => {
        if (searchWords.length === 0 || !task.content?.trim()) return false;
        const lowerContent = task.content.toLowerCase();
        const lowerTitle = task.title.toLowerCase();
        return searchWords.some(word => lowerContent.includes(word)) &&
            !searchWords.every(word => lowerTitle.includes(word));
    }, [searchWords, task.content, task.title]);

    // Fix 2: Remove the unused hasVisibleMetadata variable
    // const hasVisibleMetadata = useMemo(() => {
    //     return isValidDueDate || (task.list && task.list !== 'Inbox') || (task.tags && task.tags.length > 0) || showContentHighlight;
    // }, [isValidDueDate, task.list, task.tags, showContentHighlight]);

    // Class calculations
    const baseClasses = useMemo(() => twMerge(
        'task-item flex items-start px-2.5 py-2 border-b border-black/10 group relative min-h-[52px]', // Layout, ensures min height
        isOverlay
            ? 'bg-glass-100 backdrop-blur-lg border rounded-md shadow-strong'
            : isSelected && !isDragging
                ? 'bg-primary/20 backdrop-blur-sm'
                : isTrashItem
                    ? 'bg-glass-alt/30 backdrop-blur-xs opacity-60 hover:bg-black/10'
                    : isCompleted
                        ? 'bg-glass-alt/30 backdrop-blur-xs opacity-60 hover:bg-black/10'
                        : 'bg-transparent hover:bg-black/10 hover:backdrop-blur-sm',
        isDragging || isOverlay ? 'cursor-grabbing' : (isSortable ? 'cursor-grab' : 'cursor-pointer'),
    ), [isOverlay, isSelected, isDragging, isTrashItem, isCompleted, isSortable]);

    const checkboxClasses = useMemo(() => twMerge(
        "h-4 w-4 rounded border-2 transition-colors duration-30 ease-apple cursor-pointer appearance-none",
        "focus:ring-primary/50 focus:ring-1 focus:ring-offset-1 focus:ring-offset-current/50 focus:outline-none",
        'relative after:content-[""] after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-[60%]',
        'after:h-2 after:w-1 after:rotate-45 after:border-b-2 after:border-r-2 after:border-solid after:border-transparent after:transition-opacity after:duration-100',
        task.completed
            ? 'bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400 after:border-white after:opacity-100'
            : 'bg-white/30 border-gray-400/80 hover:border-primary/60 backdrop-blur-sm after:opacity-0',
        isTrashItem && 'opacity-50 cursor-not-allowed !border-gray-300 hover:!border-gray-300 !bg-gray-200/50 after:!border-gray-400'
    ), [task.completed, isTrashItem]);

    const titleClasses = useMemo(() => twMerge(
        "text-sm text-gray-800 leading-snug block",
        (isCompleted || isTrashItem) && "line-through text-muted-foreground"
    ), [isCompleted, isTrashItem]);

    const dragHandleClasses = useMemo(() => twMerge(
        "text-muted cursor-grab p-1 -ml-1 opacity-0 group-hover:opacity-50 group-focus-within:opacity-50 focus-visible:opacity-80",
        "transition-opacity duration-30 ease-apple outline-none rounded focus-visible:ring-1 focus-visible:ring-primary/50",
        isDragging && "opacity-50 cursor-grabbing"
    ), [isDragging]);

    const listIcon: IconName = useMemo(() => task.list === 'Inbox' ? 'inbox' : (task.list === 'Trash' ? 'trash' : 'list'), [task.list]);

    const handleMoreActionsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!isSelected) {
            setSelectedTaskId(task.id);
        }
    }, [task.id, isSelected, setSelectedTaskId]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={baseClasses}
            onClick={handleTaskClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTaskClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
            }}
            aria-selected={isSelected}
            aria-label={`Task: ${task.title || 'Untitled'}${task.completed ? ' (Completed)' : ''}`}
        >
            {/* Drag Handle */}
            <div className="flex-shrink-0 h-full flex items-center mr-2 self-stretch">
                {isSortable ? (
                    <button
                        {...attributes} {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className={dragHandleClasses}
                        aria-label="Drag task to reorder"
                        tabIndex={-1}
                    >
                        <Icon name="grip-vertical" size={15} strokeWidth={2}/>
                    </button>
                ) : (
                    <div className="w-[27px]" aria-hidden="true"></div>
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
                    className={checkboxClasses}
                    aria-labelledby={`task-title-${task.id}`}
                    disabled={isTrashItem}
                />
                <label htmlFor={`task-checkbox-${task.id}`} className="sr-only">
                    Complete task {task.title || 'Untitled'}
                </label>
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0 pt-[1px] pb-[1px]">
                {/* Title */}
                <Highlighter
                    {...highlighterProps}
                    textToHighlight={task.title || 'Untitled Task'}
                    id={`task-title-${task.id}`}
                    className={titleClasses}
                />
                {/* Metadata row (always rendered with min-height for alignment) */}
                <div className="flex items-center flex-wrap text-[11px] text-muted-foreground space-x-2 mt-1 leading-tight gap-y-0.5 min-h-[17px]">
                    {/* Priority Indicator */}
                    {!!task.priority && task.priority <= 2 && !isCompleted && !isTrashItem && (
                        <span className={clsx("flex items-center", {
                            'text-red-600': task.priority === 1,
                            'text-orange-500': task.priority === 2
                        })} title={`Priority ${task.priority === 1 ? 'High' : 'Medium'}`}>
                            <Icon name="flag" size={11} strokeWidth={2.5}/>
                        </span>
                    )}
                    {/* Due Date */}
                    {isValidDueDate && (
                        <span
                            className={clsx('flex items-center whitespace-nowrap',
                                overdue && !isCompleted && !isTrashItem && 'text-red-600 font-medium',
                                (isCompleted || isTrashItem) && 'line-through opacity-70'
                            )}
                            title={formatDate(dueDate!)}>
                            <Icon name="calendar" size={11} className="mr-0.5 opacity-70"/>
                            {formatRelativeDate(dueDate!)}
                        </span>
                    )}
                    {/* List Name */}
                    {task.list && task.list !== 'Inbox' && (
                        <span
                            className={clsx(
                                "flex items-center whitespace-nowrap bg-black/10 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[80px] truncate backdrop-blur-sm",
                                (isCompleted || isTrashItem) && 'line-through opacity-70'
                            )}
                            title={task.list}>
                            <Icon name={listIcon} size={10} className="mr-0.5 opacity-70 flex-shrink-0"/>
                            <span className="truncate">{task.list}</span>
                        </span>
                    )}
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <span className={clsx("flex items-center space-x-1 flex-wrap gap-y-0.5", (isCompleted || isTrashItem) && 'opacity-70')}>
                            {task.tags.slice(0, 2).map(tag => (
                                <span key={tag}
                                      className={clsx(
                                          "bg-black/10 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[70px] truncate backdrop-blur-sm",
                                          (isCompleted || isTrashItem) && 'line-through'
                                      )}
                                      title={tag}>
                                     #{tag}
                                 </span>
                            ))}
                            {task.tags.length > 2 &&
                                <span className="text-muted-foreground text-[10px]">+{task.tags.length - 2}</span>}
                         </span>
                    )}
                    {/* Content Snippet Highlight */}
                    {showContentHighlight && (
                        <Highlighter
                            {...highlighterProps}
                            textToHighlight={generateContentSnippet(task.content!, searchTerm)}
                            className={clsx(
                                "block truncate text-[11px] text-muted italic w-full mt-0.5",
                                (isCompleted || isTrashItem) && 'line-through'
                            )}
                        />
                    )}
                </div>
            </div>

            {/* More Actions Button */}
            {(isSortable || isTrashItem) && !isOverlay && (
                <div
                    className="task-item-actions absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-30 ease-apple">
                    <Button
                        variant="ghost"
                        size="icon"
                        icon="more-horizontal"
                        className="h-6 w-6 text-muted-foreground hover:bg-black/15"
                        onClick={handleMoreActionsClick}
                        aria-label={`More actions for ${task.title || 'task'}`}
                        tabIndex={0}
                    />
                </div>
            )}
        </div>
    );
});
TaskItem.displayName = 'TaskItem';
export default TaskItem;