// src/components/tasks/TaskItem.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Task, TaskGroupCategory} from '@/types';
import {formatDate, formatRelativeDate, isOverdue, isValid, safeParseDate} from '@/utils/dateUtils';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {searchTermAtom, selectedTaskIdAtom, tasksAtom, userListNamesAtom} from '@/store/atoms';
import Icon from '../common/Icon';
import {twMerge} from 'tailwind-merge';
import {clsx} from 'clsx';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import Button from "@/components/common/Button";
import Highlighter from "react-highlight-words";
import {IconName} from "@/components/common/IconMap";
import CustomDatePickerPopover from "@/components/common/CustomDatePickerPopover"; // Import the Radix-based Popover
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/common/Dropdown"; // Import Radix-based Dropdown parts
import {useTaskItemMenu} from '@/context/TaskItemMenuContext';
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal"; // Import Radix-based Dialog

interface TaskItemProps {
    task: Task;
    groupCategory?: TaskGroupCategory;
    isOverlay?: boolean;
    style?: React.CSSProperties;
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

// --- ENHANCED SVG Progress Indicator Component (Using Radix Checkbox for interaction) ---
interface ProgressIndicatorProps {
    percentage: number | null;
    isTrash: boolean;
    size?: number;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void; // Keep onClick for direct cycle
    onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void; // Keep onKeyDown
    ariaLabelledby?: string;
    taskId: string; // Needed for unique ID
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = React.memo(({
                                                                                   percentage,
                                                                                   isTrash,
                                                                                   size = 16,
                                                                                   className,
                                                                                   onClick,
                                                                                   onKeyDown,
                                                                                   ariaLabelledby,
                                                                               }) => {
    const normalizedPercentage = percentage ?? 0;
    const radius = size / 2 - 1.25;
    const circumference = 2 * Math.PI * radius;
    const strokeWidth = 2.5;
    const offset = circumference - (normalizedPercentage / 100) * circumference;
    const checkPath = `M ${size * 0.3} ${size * 0.55} L ${size * 0.45} ${size * 0.7} L ${size * 0.75} ${size * 0.4}`;

    const indicatorClasses = useMemo(() => twMerge(
        // Base styles for the button wrapper
        "relative flex-shrink-0 rounded-full transition-all duration-200 ease-apple focus:outline-none",
        "focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-current/50", // Use current color offset if possible
        !isTrash && "cursor-pointer",
        isTrash && "opacity-50 cursor-not-allowed",
        className
    ), [isTrash, className]);

    const buttonBgColor = useMemo(() => {
        if (isTrash) return "bg-gray-200/50 border-gray-300 dark:bg-neutral-700/50 dark:border-neutral-600";
        if (normalizedPercentage === 100) return "bg-primary/90 hover:bg-primary border-primary/90"; // Slightly brighter completed
        return "bg-white/40 hover:border-primary/60 border-gray-400/80 dark:bg-neutral-600/30 dark:border-neutral-500/80 dark:hover:border-primary/60"; // Default background
    }, [isTrash, normalizedPercentage]);

    const progressStrokeColor = useMemo(() => {
        if (isTrash) return "stroke-gray-400 dark:stroke-neutral-500";
        if (normalizedPercentage === 100) return "stroke-white dark:stroke-gray-100"; // Checkmark color
        if (normalizedPercentage >= 80) return "stroke-primary/90";
        if (normalizedPercentage >= 50) return "stroke-primary/80";
        if (normalizedPercentage > 0) return "stroke-primary/70";
        return "stroke-transparent";
    }, [isTrash, normalizedPercentage]);

    const progressLabel = normalizedPercentage === 100 ? "Mark as incomplete" : "Mark as complete";

    return (
        // Use a button for direct interaction, visually styling it like the checkbox
        <button
            type="button"
            onClick={onClick}
            onKeyDown={onKeyDown}
            disabled={isTrash}
            aria-labelledby={ariaLabelledby} // Link to task title
            aria-label={progressLabel} // Dynamic label based on state
            aria-pressed={normalizedPercentage === 100}
            className={twMerge(indicatorClasses, buttonBgColor, "border")}
            style={{width: size, height: size}}
        >
            {/* SVG for visual representation */}
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="absolute inset-0 w-full h-full transition-opacity duration-200 ease-apple"
                style={{opacity: normalizedPercentage > 0 ? 1 : 0}}
                aria-hidden="true"
            >
                {/* Progress Arc */}
                {normalizedPercentage > 0 && normalizedPercentage < 100 && (
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" strokeWidth={strokeWidth}
                        className={progressStrokeColor}
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        strokeLinecap="round"
                        style={{transition: 'stroke-dashoffset 0.3s ease-out'}}
                    />
                )}
                {/* Checkmark */}
                {normalizedPercentage === 100 && (
                    <>
                        {/* Optional solid background circle if needed */}
                        {/* <circle cx={size / 2} cy={size / 2} r={size / 2} className="fill-current text-primary/80"/> */}
                        <path
                            d={checkPath} fill="none" strokeWidth={strokeWidth * 0.9}
                            className={progressStrokeColor}
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{transition: 'opacity 0.2s ease-in 0.1s'}}
                        />
                    </>
                )}
            </svg>
        </button>
    );
});
ProgressIndicator.displayName = 'ProgressIndicator';

// Helper function to generate content snippet (keep as is)
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

// Priority Map (keep as is)
const priorityMap: Record<number, { label: string; iconColor: string }> = {
    1: {label: 'High', iconColor: 'text-red-500 dark:text-red-400'},
    2: {label: 'Medium', iconColor: 'text-orange-500 dark:text-orange-400'},
    3: {label: 'Low', iconColor: 'text-blue-500 dark:text-blue-400'},
    4: {label: 'Lowest', iconColor: 'text-gray-500 dark:text-gray-400'},
};


// TaskItem Component
const TaskItem: React.FC<TaskItemProps> = memo(({
                                                    task,
                                                    groupCategory,
                                                    isOverlay = false,
                                                    style: overlayStyle,
                                                }) => {
    // Hooks and state setup
    const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const setTasks = useSetAtom(tasksAtom);
    const [searchTerm] = useAtom(searchTermAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const {openItemId, setOpenItemId} = useTaskItemMenu(); // Context still useful for coordinating multiple items' menus/popovers
    const isSelected = useMemo(() => selectedTaskId === task.id, [selectedTaskId, task.id]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Refs for specific elements (needed for dnd-kit and potentially context menu trigger)
    const itemRef = useRef<HTMLDivElement>(null); // Ref for the main item div for dnd-kit

    // Derived states
    const isTrashItem = useMemo(() => task.list === 'Trash', [task.list]);
    const isCompleted = useMemo(() => (task.completionPercentage ?? 0) === 100 && !isTrashItem, [task.completionPercentage, isTrashItem]);
    const isSortable = useMemo(() => !isCompleted && !isTrashItem && !isOverlay, [isCompleted, isTrashItem, isOverlay]);

    // dnd-kit setup (remains the same)
    const {
        attributes,
        listeners,
        setNodeRef, // Use this ref for the draggable element
        transform,
        transition: dndTransition,
        isDragging
    } = useSortable({
        id: task.id,
        disabled: !isSortable,
        data: {task, type: 'task-item', groupCategory: groupCategory ?? task.groupCategory},
    });

    // Combine dnd-kit ref with local ref if necessary, or just use setNodeRef directly
    const combinedRef = (node: HTMLDivElement | null) => {
        setNodeRef(node); // Pass node to dnd-kit
        (itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node; // Assign to local ref too
    };


    // Style calculation for dnd-kit (remains the same)
    const style = useMemo(() => {
        const baseTransform = CSS.Transform.toString(transform);
        const calculatedTransition = dndTransition;
        if (isDragging && !isOverlay) {
            return {
                transform: baseTransform,
                transition: calculatedTransition,
                opacity: 0.4,
                cursor: 'grabbing',
                backgroundColor: 'hsla(210, 40%, 98%, 0.3)',
                boxShadow: 'none',
                border: '1px dashed hsla(0, 0%, 0%, 0.15)',
                zIndex: 1,
            };
        }
        if (isOverlay) {
            return {
                ...overlayStyle,
                transform: baseTransform,
                transition: calculatedTransition,
                cursor: 'grabbing',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                zIndex: 1000,
            };
        }
        return {
            ...overlayStyle,
            transform: baseTransform,
            transition: calculatedTransition || 'background-color 0.2s ease-apple, border-color 0.2s ease-apple, box-shadow 0.2s ease-apple', // Added shadow transition
            zIndex: isSelected ? 2 : 1,
            position: 'relative', // Needed for absolute positioning of actions button
        };
    }, [overlayStyle, transform, dndTransition, isDragging, isOverlay, isSelected]);


    // Close menus/popovers if another item's menu opens (context logic)
    useEffect(() => {
        if (openItemId !== task.id) {
            // Radix components handle their own open state based on interaction,
            // so explicit closing here might not be needed unless coordinating across multiple items.
            // For simplicity, we rely on Radix's default behavior (closing on click outside/escape).
        }
    }, [openItemId, task.id]);


    // Task interaction handlers
    const handleTaskClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        // Check if the click originated from interactive elements within the item
        if (target.closest('button, input, a, [role="menu"], [role="menuitem"], [role="dialog"], [data-radix-popper-content-wrapper]') || target.closest('.ignore-task-click')) {
            return; // Ignore clicks on buttons, inputs, links, menus, dialogs, or specifically marked elements
        }
        if (isDragging) {
            return; // Ignore clicks while dragging
        }
        setSelectedTaskId(id => (id === task.id ? null : task.id));
        // setOpenItemId(null); // Let Radix handle closing menus/popovers on selection change
    }, [setSelectedTaskId, task.id, isDragging]);

    // Update Task Logic (keep as is)
    const updateTask = useCallback((updates: Partial<Omit<Task, 'groupCategory' | 'completedAt' | 'completed'>>) => {
        setTasks(prevTasks => prevTasks.map(t => {
            if (t.id === task.id) {
                return {...t, ...updates, updatedAt: Date.now()};
            }
            return t;
        }));
    }, [setTasks, task.id]);

    // Progress Cycling Logic (for main indicator button)
    const cycleCompletionPercentage = useCallback((event?: React.MouseEvent<HTMLButtonElement>) => {
        event?.stopPropagation(); // Prevent task selection
        const currentPercentage = task.completionPercentage ?? 0;
        let nextPercentage: number | null = null;
        if (currentPercentage === 100) nextPercentage = null; // Toggle back to 0 (null)
        else nextPercentage = 100; // Toggle to 100
        updateTask({completionPercentage: nextPercentage});
        if (nextPercentage === 100 && isSelected) setSelectedTaskId(null); // Deselect if completed
        // setOpenItemId(null); // Let Radix handle menu closing
    }, [task.completionPercentage, updateTask, isSelected, setSelectedTaskId]);

    // Direct Progress Setting Logic (for menu item)
    const handleProgressChange = useCallback((newPercentage: number | null) => {
        updateTask({completionPercentage: newPercentage});
        if (newPercentage === 100 && isSelected) setSelectedTaskId(null);
        // No need to manually close dropdown, Radix DropdownMenuItem closes on click by default
    }, [updateTask, isSelected, setSelectedTaskId]);

    const handleProgressIndicatorKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            cycleCompletionPercentage();
        }
    }, [cycleCompletionPercentage]);


    // Other action handlers (Priority, List, Duplicate, Delete)
    const handlePriorityChange = useCallback((newPriority: number | null) => {
        updateTask({priority: newPriority});
    }, [updateTask]);

    const handleListChange = useCallback((newList: string) => {
        updateTask({list: newList});
    }, [updateTask]);

    const handleDuplicateTask = useCallback(() => {
        const now = Date.now();
        const newTaskData: Partial<Task> = {
            ...task,
            id: `task-${now}-${Math.random().toString(16).slice(2)}`,
            title: `${task.title} (Copy)`,
            order: task.order + 0.01,
            createdAt: now,
            updatedAt: now,
            completed: false, // Reset derived fields
            completedAt: null,
            completionPercentage: task.completionPercentage // Keep original percentage
        };
        delete newTaskData.groupCategory;

        setTasks(prev => {
            const index = prev.findIndex(t => t.id === task.id);
            const newTasks = [...prev];
            if (index !== -1) {
                newTasks.splice(index + 1, 0, newTaskData as Task);
            } else {
                newTasks.push(newTaskData as Task);
            }
            return newTasks;
        });
        setSelectedTaskId(newTaskData.id!); // Select the new task
    }, [task, setTasks, setSelectedTaskId]);

    const openDeleteConfirm = useCallback(() => {
        setIsDeleteDialogOpen(true);
    }, []);
    const closeDeleteConfirm = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);
    const confirmDeleteTask = useCallback(() => {
        updateTask({list: 'Trash', completionPercentage: null}); // Reset percentage on trash
        if (isSelected) {
            setSelectedTaskId(null);
        }
        // No need to call closeDeleteConfirm here, Radix Dialog handles it
    }, [updateTask, isSelected, setSelectedTaskId]);

    // Memoized display values and styles
    const dueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const isValidDueDate = useMemo(() => dueDate && isValid(dueDate), [dueDate]);
    const overdue = useMemo(() => isValidDueDate && !isCompleted && !isTrashItem && isOverdue(dueDate!), [isValidDueDate, isCompleted, isTrashItem, dueDate]);
    const searchWords = useMemo(() => searchTerm ? searchTerm.trim().toLowerCase().split(' ').filter(Boolean) : [], [searchTerm]);
    const highlighterProps = useMemo(() => ({
        highlightClassName: "bg-yellow-300/70 dark:bg-yellow-500/40 font-semibold rounded-[2px] px-0.5 mx-[-0.5px] backdrop-blur-xs text-black/80 dark:text-white/90",
        searchWords: searchWords,
        autoEscape: true,
    }), [searchWords]);
    const showContentHighlight = useMemo(() => {
        if (searchWords.length === 0 || !task.content?.trim()) return false;
        const lc = task.content.toLowerCase();
        const lt = task.title.toLowerCase();
        return searchWords.some(w => lc.includes(w)) && !searchWords.every(w => lt.includes(w));
    }, [searchWords, task.content, task.title]);

    const baseClasses = useMemo(() => twMerge(
        'task-item flex items-start px-3 py-2 border-b border-black/10 dark:border-white/10 group relative min-h-[52px]', // Adjusted padding
        isOverlay
            ? 'bg-glass-100 dark:bg-neutral-800/80 backdrop-blur-lg border rounded-md shadow-strong'
            : isSelected && !isDragging
                ? 'bg-primary/15 dark:bg-primary/25 backdrop-blur-sm shadow-sm ring-1 ring-inset ring-primary/20' // Subtle ring for selection
                : isTrashItem
                    ? 'bg-neutral-100/50 dark:bg-neutral-800/30 backdrop-blur-xs opacity-60 hover:bg-black/10 dark:hover:bg-white/5'
                    : isCompleted
                        ? 'bg-neutral-100/50 dark:bg-neutral-800/30 backdrop-blur-xs opacity-70 hover:bg-black/10 dark:hover:bg-white/5'
                        : 'bg-transparent hover:bg-black/[.06] dark:hover:bg-white/[.06] hover:backdrop-blur-sm', // Default state
        isDragging ? 'cursor-grabbing' : (isSortable ? 'cursor-grab' : 'cursor-pointer')
    ), [isOverlay, isSelected, isDragging, isTrashItem, isCompleted, isSortable]);

    const titleClasses = useMemo(() => twMerge(
        "text-sm text-gray-800 dark:text-gray-100 leading-snug block",
        (isCompleted || isTrashItem) && "line-through text-muted-foreground dark:text-neutral-500"
    ), [isCompleted, isTrashItem]);

    const listIcon: IconName = useMemo(() => task.list === 'Inbox' ? 'inbox' : (task.list === 'Trash' ? 'trash' : 'list'), [task.list]);
    const availableLists = useMemo(() => userLists.filter(l => l !== 'Trash'), [userLists]);

    const progressLabel = useMemo(() => {
        const p = task.completionPercentage;
        if (p && p > 0 && p < 100 && !isTrashItem) {
            return `[${p}%]`;
        }
        return null;
    }, [task.completionPercentage, isTrashItem]);

    const progressMenuItems = useMemo(() => [
        {label: 'Not Started', value: null, icon: 'circle' as IconName},
        {label: 'Started (20%)', value: 20, icon: 'circle-dot-dashed' as IconName},
        {label: 'Halfway (50%)', value: 50, icon: 'circle-dot' as IconName},
        {label: 'Almost Done (80%)', value: 80, icon: 'circle-slash' as IconName},
        {label: 'Completed (100%)', value: 100, icon: 'circle-check' as IconName},
    ], []);

    return (
        <>
            <div
                ref={combinedRef} // Use the combined ref for dnd-kit and local access
                style={style as React.CSSProperties}
                className={baseClasses}
                {...(isSortable ? attributes : {})}
                {...(isSortable ? listeners : {})} // Apply listeners only if sortable
                onClick={handleTaskClick}
                role={isSortable ? "listitem" : "button"} // Adjust role based on sortability
                tabIndex={0} // Make it focusable
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        // Prevent Enter/Space activating dnd-kit drag AND task selection
                        if (!isSortable || !(e.target as HTMLElement).closest('[role="button"], a, input')) {
                            e.preventDefault();
                            handleTaskClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                        }
                    } else if (e.key === 'ArrowRight' && !isTrashItem) {
                        // Example: Open context menu on ArrowRight
                        // Find the trigger button and click it programmatically
                        const menuTrigger = itemRef.current?.querySelector<HTMLButtonElement>('[data-radix-dropdown-menu-trigger]');
                        menuTrigger?.focus();
                        // Radix often handles opening on Enter/Space after focus, clicking might not be needed
                        // menuTrigger?.click();
                    }
                }}
                aria-selected={isSelected}
                aria-labelledby={`task-title-${task.id}`}
            >
                {/* Progress Indicator */}
                <div className="flex-shrink-0 mr-3 pt-[3px] pl-[2px]">
                    <ProgressIndicator
                        taskId={task.id}
                        percentage={task.completionPercentage}
                        isTrash={isTrashItem}
                        onClick={cycleCompletionPercentage}
                        onKeyDown={handleProgressIndicatorKeyDown}
                        ariaLabelledby={`task-title-${task.id}`}
                    />
                </div>

                {/* Task Info */}
                <div className="flex-1 min-w-0 pt-[1px] pb-[1px]">
                    {/* Title and Progress Label */}
                    <div className="flex items-baseline">
                        <Highlighter
                            {...highlighterProps}
                            textToHighlight={task.title || 'Untitled Task'}
                            id={`task-title-${task.id}`}
                            className={titleClasses}
                        />
                        {progressLabel && (
                            <span
                                className="ml-1.5 text-[10px] text-primary/90 dark:text-primary/70 opacity-90 font-medium select-none flex-shrink-0">
                                {progressLabel}
                            </span>
                        )}
                    </div>
                    {/* Metadata */}
                    <div
                        className="flex items-center flex-wrap text-[11px] text-muted-foreground dark:text-neutral-400 space-x-2 mt-1 leading-tight gap-y-0.5 min-h-[17px]">
                        {/* Priority Indicator */}
                        {!!task.priority && task.priority <= 4 && !isCompleted && !isTrashItem && (
                            <span className={clsx("flex items-center", priorityMap[task.priority]?.iconColor)}
                                  title={`Priority ${priorityMap[task.priority]?.label}`}>
                                <Icon name="flag" size={11} strokeWidth={2.5}/>
                            </span>
                        )}
                        {/* Due Date & Reschedule Button */}
                        {isValidDueDate && (
                            <span className="flex items-center task-item-reschedule">
                                <span
                                    className={clsx(
                                        'whitespace-nowrap flex items-center', // Ensure icon aligns
                                        overdue && 'text-red-600 dark:text-red-400 font-medium',
                                        (isCompleted || isTrashItem) && 'line-through opacity-70'
                                    )}
                                    title={formatDate(dueDate!)}
                                >
                                    <Icon name="calendar" size={11} className="mr-0.5 opacity-70 flex-shrink-0"/>
                                    {formatRelativeDate(dueDate!)}
                                </span>
                                {/* Reschedule trigger using Radix Popover */}
                                {overdue && !isOverlay && !isCompleted && !isTrashItem && (
                                    <CustomDatePickerPopover
                                        initialDate={dueDate ?? undefined}
                                        onSelect={(date) => updateTask({dueDate: date ? date.getTime() : null})}
                                    >
                                        <button
                                            className="ml-1 p-0.5 rounded hover:bg-red-500/15 dark:hover:bg-red-400/15 focus-visible:ring-1 focus-visible:ring-red-400 outline-none ignore-task-click" // Prevent task selection
                                            onClick={(e) => e.stopPropagation()} // Stop propagation just in case
                                            aria-label="Reschedule task"
                                            title="Reschedule"
                                        >
                                            <Icon name="calendar-plus" size={12}
                                                  className="text-red-500 dark:text-red-400 opacity-70 group-hover/task-item-reschedule:opacity-100"/>
                                        </button>
                                    </CustomDatePickerPopover>
                                )}
                            </span>
                        )}
                        {/* List Name */}
                        {task.list && task.list !== 'Inbox' && (
                            <span
                                className={clsx(
                                    "flex items-center whitespace-nowrap bg-black/10 dark:bg-white/10 text-muted-foreground dark:text-neutral-400 px-1 py-0 rounded-[4px] text-[10px] max-w-[90px] truncate backdrop-blur-sm",
                                    (isCompleted || isTrashItem) && 'line-through opacity-70'
                                )}
                                title={task.list}
                            >
                                <Icon name={listIcon} size={10} className="mr-0.5 opacity-70 flex-shrink-0"/>
                                <span className="truncate">{task.list}</span>
                            </span>
                        )}
                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <span
                                className={clsx("flex items-center space-x-1 flex-wrap gap-y-0.5", (isCompleted || isTrashItem) && 'opacity-70')}>
                                {task.tags.slice(0, 2).map(tag => (
                                    <span key={tag}
                                          className={clsx("bg-black/10 dark:bg-white/10 text-muted-foreground dark:text-neutral-400 px-1 py-0 rounded-[4px] text-[10px] max-w-[70px] truncate backdrop-blur-sm", (isCompleted || isTrashItem) && 'line-through')}
                                          title={tag}>
                                        #{tag}
                                    </span>
                                ))}
                                {task.tags.length > 2 && <span
                                    className="text-muted-foreground dark:text-neutral-500 text-[10px]">+{task.tags.length - 2}</span>}
                            </span>
                        )}
                        {/* Content Snippet Highlight */}
                        {showContentHighlight && (
                            <Highlighter {...highlighterProps}
                                         textToHighlight={generateContentSnippet(task.content!, searchTerm)}
                                         className={clsx("block truncate text-[11px] text-muted italic w-full mt-0.5", (isCompleted || isTrashItem) && 'line-through')}/>
                        )}
                    </div>
                </div>

                {/* More Actions Button & Dropdown using Radix */}
                {!isOverlay && !isTrashItem && (
                    // Use a div to control positioning and visibility, marked to ignore task click
                    <div
                        className="task-item-actions absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ease-apple z-10 ignore-task-click"
                        onClick={(e) => e.stopPropagation()} // Prevent task selection
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <DropdownMenu onOpenChange={(open) => setOpenItemId(open ? task.id : null)}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    icon="more-horizontal"
                                    className="h-6 w-6 text-muted-foreground dark:text-neutral-400 hover:bg-black/15 dark:hover:bg-white/10 data-[state=open]:bg-black/15 dark:data-[state=open]:bg-white/15"
                                    aria-label={`More actions for ${task.title || 'task'}`}
                                    disabled={isTrashItem}
                                    // No need for manual tabIndex if it's naturally focusable
                                />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-52" align="end"> {/* Align menu to the end */}
                                <DropdownMenuLabel>Set Progress</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={String(task.completionPercentage ?? 'null')}
                                                        onValueChange={(val) => handleProgressChange(val === 'null' ? null : Number(val))}>
                                    {progressMenuItems.map(item => (
                                        <DropdownMenuRadioItem key={item.label} value={String(item.value ?? 'null')}
                                                               disabled={isTrashItem || isCompleted}>
                                            <Icon name={item.icon} size={14} className="mr-2 flex-shrink-0 opacity-80"
                                                  aria-hidden="true"/>
                                            {item.label}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>

                                <DropdownMenuSeparator/>

                                {/* Date Picker Popover within Dropdown */}
                                <CustomDatePickerPopover
                                    initialDate={dueDate ?? undefined}
                                    onSelect={(date) => updateTask({dueDate: date ? date.getTime() : null})}
                                >
                                    {/* Use a DropdownMenuItem styled as a button */}
                                    <DropdownMenuItem
                                        icon="calendar-plus"
                                        disabled={isCompleted}
                                        onSelect={(e) => e.preventDefault()} // Prevent DropdownMenu closing immediately
                                        className="w-full cursor-pointer" // Ensure it feels clickable
                                    >
                                        Set Due Date...
                                    </DropdownMenuItem>
                                </CustomDatePickerPopover>

                                <DropdownMenuSeparator/>

                                {/* Priority Sub Menu */}
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={isCompleted}>
                                        <Icon name="flag" size={14} className="mr-2 flex-shrink-0"/>
                                        <span>Set Priority</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuRadioGroup value={String(task.priority ?? 'null')}
                                                                    onValueChange={(val) => handlePriorityChange(val === 'null' ? null : Number(val))}>
                                                <DropdownMenuRadioItem value="null">None</DropdownMenuRadioItem>
                                                {[1, 2, 3, 4].map(p => (
                                                    <DropdownMenuRadioItem key={p} value={String(p)}>
                                                        <Icon name="flag" size={14}
                                                              className={twMerge("mr-2 flex-shrink-0", priorityMap[p]?.iconColor)}/>
                                                        P{p} {priorityMap[p]?.label}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>

                                {/* List Sub Menu */}
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={isCompleted}>
                                        <Icon name="list" size={14} className="mr-2 flex-shrink-0 opacity-70"/>
                                        <span>Move to List</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent
                                            className="max-h-40 overflow-y-auto styled-scrollbar-thin"> {/* Limit height and add scroll */}
                                            <DropdownMenuRadioGroup value={task.list} onValueChange={handleListChange}>
                                                {availableLists.map(list => (
                                                    <DropdownMenuRadioItem key={list} value={list}>
                                                        <Icon name={list === 'Inbox' ? 'inbox' : 'list'} size={14}
                                                              className="mr-2 flex-shrink-0 opacity-70"/>
                                                        {list}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>

                                <DropdownMenuSeparator/>

                                <DropdownMenuItem icon="copy-plus" onClick={handleDuplicateTask} disabled={isCompleted}>
                                    Duplicate Task
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    icon="trash"
                                    className="!text-red-600 dark:!text-red-500 hover:!bg-red-500/10 dark:hover:!bg-red-500/15"
                                    onClick={openDeleteConfirm} // Open the confirmation modal
                                >
                                    Move to Trash
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

            </div>
            {/* Delete Confirmation Modal (Radix Dialog) */}
            <ConfirmDeleteModal
                isOpen={isDeleteDialogOpen}
                onClose={closeDeleteConfirm}
                onConfirm={confirmDeleteTask}
                taskTitle={task.title || 'Untitled Task'}
            />
        </>
    );
});
TaskItem.displayName = 'TaskItem';
export default TaskItem;