// src/components/tasks/TaskItem.tsx
import React, { useMemo, useCallback } from 'react';
import { Task, TaskGroupCategory } from '@/types';
import {formatDate, formatRelativeDate, isOverdue, safeParseDate} from '@/utils/dateUtils';
import { useAtom, useSetAtom } from 'jotai';
import { selectedTaskIdAtom, tasksAtom, searchTermAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from "@/components/common/Button";
import Highlighter from "react-highlight-words";

interface TaskItemProps {
    task: Task;
    groupCategory?: TaskGroupCategory; // Category context for DND in 'All' view
    isOverlay?: boolean; // Flag for drag overlay rendering
    style?: React.CSSProperties; // Style passed by DragOverlay
}

const TaskItem: React.FC<TaskItemProps> = ({ task, groupCategory, isOverlay = false, style: overlayStyle }) => {
    const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const setTasks = useSetAtom(tasksAtom);
    const [searchTerm] = useAtom(searchTermAtom);
    const isSelected = selectedTaskId === task.id;

    const isTrashItem = task.list === 'Trash';
    // Task is sortable if not completed and not in trash
    const isSortable = !task.completed && !isTrashItem;

    // dnd-kit sortable hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition: dndTransition, // Rename to avoid conflict with CSS transition
        isDragging,
    } = useSortable({
        id: task.id,
        disabled: !isSortable, // Disable sorting for completed/trashed items
        data: { task, type: 'task-item', groupCategory: groupCategory ?? task.groupCategory }, // Pass data for drop logic
    });

    // Combine overlay style (positioning) with DND transform/transition
    const style = useMemo(() => ({
        ...overlayStyle, // Apply positioning from DragOverlay
        transform: CSS.Transform.toString(transform), // Apply DND transform
        // Apply DND's transition ONLY when dragging for smooth movement
        // Otherwise, allow CSS transitions for hover effects etc.
        transition: isDragging ? (dndTransition || 'transform 150ms ease-apple') : undefined,
        // Style overrides while item is being dragged (the original item becoming faint)
        ...(isDragging && !isOverlay && {
            opacity: 0.3,
            cursor: 'grabbing',
            backgroundColor: 'hsla(210, 40%, 98%, 0.5)', // Faint background
            backdropFilter: 'blur(2px)',
            boxShadow: 'none', // Remove shadow from original item
            border: '1px dashed hsla(0, 0%, 0%, 0.1)', // Dashed border indicator
        }),
        // Style for the drag overlay element itself
        ...(isOverlay && {
            cursor: 'grabbing',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)', // Stronger shadow for overlay
            // Inherit z-index from DragOverlay or set high
        }),
        // Ensure dragging items are visually on top
        zIndex: isDragging || isOverlay ? 10 : 1,
    }), [overlayStyle, transform, dndTransition, isDragging, isOverlay]);

    // Select task on click (if not clicking button/input)
    const handleTaskClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Ignore clicks on interactive elements within the item
        const target = e.target as HTMLElement;
        if (target.closest('button, input, a')) return;
        setSelectedTaskId(task.id === selectedTaskId ? null : task.id); // Toggle selection
    }, [setSelectedTaskId, task.id, selectedTaskId]);

    // Handle checkbox state change
    const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation(); // Prevent task selection click
        const isChecked = e.target.checked;
        setTasks(prevTasks =>
            prevTasks.map(t =>
                t.id === task.id ? { ...t, completed: isChecked, updatedAt: Date.now() } : t
            )
        );
        // If completing the currently selected task, deselect it
        if (isChecked && isSelected) {
            setSelectedTaskId(null);
        }
    }, [setTasks, task.id, isSelected, setSelectedTaskId]);

    // Memoized values for display logic
    const dueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const overdue = useMemo(() => dueDate && !task.completed && !isTrashItem && isOverdue(dueDate), [dueDate, task.completed, isTrashItem]);
    const searchWords = useMemo(() => searchTerm ? searchTerm.trim().toLowerCase().split(' ').filter(Boolean) : [], [searchTerm]);

    // Determine if content snippet needs highlighting
    const showContentHighlight = useMemo(() => {
        if (!searchTerm || !task.content) return false;
        const lowerContent = task.content.toLowerCase();
        const lowerTitle = task.title.toLowerCase();
        // Show snippet if a search word is in content BUT *not* also in the title
        return searchWords.some(word => lowerContent.includes(word) && !lowerTitle.includes(word));
    }, [searchTerm, task.content, task.title, searchWords]);


    // Base classes for the task item container
    const baseClasses = twMerge(
        'task-item flex items-start px-2.5 py-2 border-b border-black/10 group relative min-h-[52px]', // Layout and border
        // Background and hover states (only color transitions)
        'transition-colors duration-150 ease-apple',
        isOverlay // Special styling for the drag overlay version
            ? 'bg-glass-100 backdrop-blur-lg border rounded-md shadow-strong'
            : isSelected && !isDragging // Style when selected (and not the faint dragged item)
                ? 'bg-primary/20 backdrop-blur-sm'
                : isTrashItem // Style for trashed items
                    ? 'bg-glass-alt/30 backdrop-blur-xs opacity-50 cursor-pointer hover:bg-black/10'
                    : task.completed // Style for completed items
                        ? 'bg-glass-alt/30 backdrop-blur-xs opacity-60 hover:bg-black/10'
                        : isSortable // Style for active, sortable items
                            ? 'bg-transparent hover:bg-black/10 hover:backdrop-blur-sm'
                            : 'bg-transparent', // Default non-interactive style
        // Cursor states
        isDragging || isOverlay ? 'cursor-grabbing' : (isSortable ? 'cursor-grab' : 'cursor-pointer'), // Grab for sortable, grabbing when dragging, pointer otherwise
    );

    return (
        <div
            ref={setNodeRef} // Ref for dnd-kit
            style={style} // Apply combined DND/overlay styles
            className={baseClasses}
            onClick={handleTaskClick} // Handle selection
            role="button" // Semantics for clickability
            tabIndex={0} // Make focusable
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTaskClick(e as any); }} // Keyboard accessibility
            aria-selected={isSelected}
            aria-label={`Task: ${task.title || 'Untitled'}${task.completed ? ' (Completed)' : ''}`}
        >
            {/* Drag Handle */}
            <div className="flex-shrink-0 h-full flex items-center mr-2 self-stretch"> {/* Ensure handle stretches */}
                {isSortable ? (
                    <button
                        {...attributes} // DND attributes
                        {...listeners} // DND listeners
                        onClick={(e) => e.stopPropagation()} // Prevent task selection
                        className={twMerge(
                            "text-muted cursor-grab p-1 -ml-1 opacity-0 group-hover:opacity-50 group-focus-within:opacity-50 focus-visible:opacity-80", // Visibility and styling
                            "transition-opacity duration-150 ease-apple outline-none rounded focus-visible:ring-1 focus-visible:ring-primary/50", // Focus styling
                            isDragging && "opacity-50 cursor-grabbing" // Style while dragging via handle
                        )}
                        aria-label="Drag task to reorder"
                        tabIndex={-1} // Not focusable via keyboard navigation
                    >
                        <Icon name="grip-vertical" size={15} strokeWidth={2} />
                    </button>
                ) : (
                    // Placeholder to maintain alignment when handle is not present
                    <div className="w-[27px]" aria-hidden="true"></div>
                )}
            </div>

            {/* Checkbox */}
            <div className="flex-shrink-0 mr-2.5 pt-[3px]">
                <input
                    type="checkbox"
                    id={`task-checkbox-${task.id}`}
                    checked={task.completed}
                    onChange={handleCheckboxChange} // Handle state change
                    onClick={(e) => e.stopPropagation()} // Prevent task selection
                    className={twMerge(
                        "h-4 w-4 rounded border-2 transition-colors duration-150 ease-apple cursor-pointer appearance-none", // Base checkbox style
                        "focus:ring-primary/50 focus:ring-1 focus:ring-offset-1 focus:ring-offset-current/50 focus:outline-none", // Focus style
                        // Checkmark pseudo-element styles
                        'relative after:content-[""] after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-[60%]',
                        'after:h-2 after:w-1 after:rotate-45 after:border-b-2 after:border-r-2 after:border-solid after:border-transparent after:transition-opacity after:duration-100',
                        // State-specific styles
                        task.completed
                            ? 'bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400 after:border-white after:opacity-100' // Completed state
                            : 'bg-white/30 border-gray-400/80 hover:border-primary/60 backdrop-blur-sm after:opacity-0', // Incomplete state
                        isTrashItem && 'opacity-50 cursor-not-allowed !border-gray-300 hover:!border-gray-300 !bg-gray-200/50 after:!border-gray-400' // Trash state
                    )}
                    aria-labelledby={`task-title-${task.id}`} // Link checkbox to title for screen readers
                    disabled={isTrashItem} // Disable checkbox in trash
                />
                <label htmlFor={`task-checkbox-${task.id}`} className="sr-only">Complete task {task.title || 'Untitled'}</label>
            </div>

            {/* Task Info (Title, Meta) */}
            <div className="flex-1 min-w-0 pt-[1px]">
                {/* Title with Highlighter */}
                <Highlighter
                    highlightClassName="bg-yellow-300/70 font-semibold rounded-[2px] px-0.5 mx-[-0.5px] backdrop-blur-xs" // Highlight style
                    searchWords={searchWords} // Words to highlight from search term
                    autoEscape={true}
                    textToHighlight={task.title || 'Untitled Task'}
                    id={`task-title-${task.id}`}
                    className={twMerge(
                        "text-sm text-gray-800 leading-snug block", // Base title style
                        (task.completed || isTrashItem) && "line-through text-muted-foreground" // Style for completed/trash
                    )}
                />

                {/* Meta Information (Priority, Date, List, Tags, Content Snippet) */}
                <div className="flex items-center flex-wrap text-[11px] text-muted-foreground space-x-2 mt-1 leading-tight gap-y-0.5"> {/* Added gap-y for wrap */}
                    {/* Priority Flag */}
                    {task.priority && task.priority <= 2 && !task.completed && !isTrashItem && (
                        <span className={clsx("flex items-center", { 'text-red-600': task.priority === 1, 'text-orange-500': task.priority === 2 })} title={`Priority ${task.priority}`}>
                            <Icon name="flag" size={11} strokeWidth={2.5}/>
                        </span>
                    )}
                    {/* Due Date */}
                    {dueDate && !task.completed && !isTrashItem && (
                        <span className={clsx('flex items-center whitespace-nowrap', overdue && 'text-red-600 font-medium')} title={formatDate(dueDate)}>
                            <Icon name="calendar" size={11} className="mr-0.5 opacity-70" />
                            {formatRelativeDate(dueDate)}
                        </span>
                    )}
                    {/* List Name (show if not Inbox, not trash, not completed, and NOT selected OR if dragging) */}
                    {task.list && task.list !== 'Inbox' && !isTrashItem && !task.completed && (!isSelected || isDragging) && (
                        <span className="flex items-center whitespace-nowrap bg-black/10 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[80px] truncate backdrop-blur-sm" title={task.list}>
                            <Icon name="list" size={10} className="mr-0.5 opacity-70 flex-shrink-0" />
                            <span className="truncate">{task.list}</span>
                        </span>
                    )}
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && !task.completed && !isTrashItem && (
                        <span className="flex items-center space-x-1 flex-wrap gap-y-0.5"> {/* Allow tags to wrap */}
                            {task.tags.slice(0, 2).map(tag => ( // Show max 2 tags initially
                                <span key={tag} className="bg-black/10 text-muted-foreground px-1 py-0 rounded-[4px] text-[10px] max-w-[70px] truncate backdrop-blur-sm" title={tag}>
                                     #{tag}
                                 </span>
                            ))}
                            {task.tags.length > 2 && <span className="text-muted-foreground text-[10px]">+{task.tags.length - 2}</span>} {/* Show '+N' if more tags */}
                         </span>
                    )}
                    {/* Content Snippet Highlight */}
                    {showContentHighlight && (
                        <Highlighter
                            highlightClassName="bg-yellow-300/70 rounded-[2px] px-0.5 mx-[-0.5px] backdrop-blur-xs"
                            searchWords={searchWords}
                            autoEscape={true}
                            textToHighlight={generateContentSnippet(task.content!, searchTerm)} // Use helper function
                            className="block truncate text-xs text-muted italic w-full" // Allow snippet to take full width if needed
                        />
                    )}
                </div>
            </div>

            {/* More Actions Button (conditionally rendered) */}
            {isSortable && !isOverlay && (
                // Container positioned absolutely, appears on hover/focus
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ease-apple">
                    <Button
                        variant="ghost"
                        size="icon"
                        icon="more-horizontal"
                        className="h-6 w-6 text-muted-foreground hover:bg-black/15"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent task selection click
                            console.log('More actions for task:', task.id);
                            setSelectedTaskId(task.id); // Select the task to show details (where more actions might be)
                        }}
                        aria-label={`More actions for ${task.title || 'task'}`}
                        tabIndex={0} // Make focusable
                    />
                </div>
            )}
        </div>
    );
};

// Re-add the helper function used in TaskItem and Sidebar
function generateContentSnippet(content: string, term: string, length: number = 35): string {
    if (!content || !term) return '';
    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase().split(' ')[0]; // Use first word for simpler index finding
    const firstMatchIndex = lowerContent.indexOf(lowerTerm);

    if (firstMatchIndex === -1) return content.substring(0, length) + '...'; // Fallback

    const start = Math.max(0, firstMatchIndex - Math.floor(length / 3));
    const end = Math.min(content.length, firstMatchIndex + lowerTerm.length + Math.ceil(length * 2 / 3));
    let snippet = content.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
}


export default React.memo(TaskItem);