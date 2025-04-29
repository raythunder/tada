// src/components/tasks/TaskItem.tsx
import React, {memo, useCallback, useMemo, useState} from 'react';
import {Task, TaskGroupCategory} from '@/types';
import {formatRelativeDate, isOverdue, isValid, safeParseDate, startOfDay} from '@/lib/utils/dateUtils';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {searchTermAtom, selectedTaskIdAtom, tasksAtom, userListNamesAtom} from '@/store/atoms';
import Icon from '../common/Icon';
import {cn} from '@/lib/utils';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox"; // Use Checkbox for progress indicator trigger area
import {Badge} from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
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
} from "@/components/ui/dropdown-menu";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import CustomDatePickerPopover from "@/components/common/CustomDatePickerPopover"; // Use refactored picker
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal"; // Use refactored dialog
import Highlighter from "react-highlight-words";
import {IconName} from "@/components/common/IconMap";

interface TaskItemProps {
    task: Task;
    groupCategory?: TaskGroupCategory;
    isOverlay?: boolean;
    style?: React.CSSProperties;
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

// --- SVG Progress Indicator Component ---
// Keeping the highly custom SVG indicator for visual consistency, but wrapping interaction with Checkbox
interface ProgressIndicatorProps {
    percentage: number | null;
    isTrash: boolean;
    taskId: string; // Use taskId for unique ID
    checked: boolean; // Controlled by parent
    onCheckedChange: (checked: boolean | 'indeterminate') => void; // Use shadcn Checkbox handler type
    size?: number;
    className?: string;
    ariaLabelledby?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = React.memo(({
                                                                                   percentage,
                                                                                   isTrash,
                                                                                   taskId,
                                                                                   checked,
                                                                                   onCheckedChange,
                                                                                   size = 18,
                                                                                   className,
                                                                                   ariaLabelledby
                                                                               }) => {
    const normalizedPercentage = percentage ?? 0;
    const radius = size / 2 - 1.25;
    const circumference = 2 * Math.PI * radius;
    const strokeWidth = 2.5;
    const offset = circumference - (normalizedPercentage / 100) * circumference;
    const checkPath = `M ${size * 0.3} ${size * 0.55} L ${size * 0.45} ${size * 0.7} L ${size * 0.75} ${size * 0.4}`;

    const svgClasses = useMemo(() => cn(
        "absolute inset-0 w-full h-full transition-opacity duration-200 ease-apple pointer-events-none", // SVG itself shouldn't capture clicks
        normalizedPercentage > 0 ? "opacity-100" : "opacity-0"
    ), [normalizedPercentage]);

    const progressStrokeColor = useMemo(() => {
        if (isTrash) return "stroke-muted-foreground/50";
        if (normalizedPercentage === 100) return "stroke-primary-foreground";
        if (normalizedPercentage >= 80) return "stroke-primary/90";
        if (normalizedPercentage >= 50) return "stroke-primary/80";
        if (normalizedPercentage > 0) return "stroke-primary/70";
        return "stroke-transparent";
    }, [isTrash, normalizedPercentage]);

    return (
        <div className={cn("relative flex-shrink-0", className)} style={{width: size, height: size}}>
            {/* Use shadcn Checkbox for interaction and accessibility */}
            <Checkbox
                id={`progress-checkbox-${taskId}`}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={isTrash}
                aria-labelledby={ariaLabelledby}
                className={cn(
                    "absolute inset-0 w-full h-full rounded-full border-2 transition-all duration-200 ease-apple", // Base Checkbox styles
                    // Apply background and border based on state, similar to original SVG button
                    isTrash ? "bg-muted/20 border-muted/30 cursor-not-allowed" :
                        checked ? "bg-primary border-primary hover:bg-primary/90" :
                            "bg-background/40 border-muted/50 hover:border-primary/60 data-[state=unchecked]:bg-background/40",
                    "!ring-offset-0 !ring-0 focus-visible:!ring-1 focus-visible:!ring-ring focus-visible:!ring-offset-1 focus-visible:!ring-offset-background" // Custom focus for circle
                )}
            />
            {/* SVG is purely visual now */}
            <svg viewBox={`0 0 ${size} ${size}`} className={svgClasses} aria-hidden="true">
                {/* Progress Arc */}
                {normalizedPercentage > 0 && normalizedPercentage < 100 && (
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
                            className={progressStrokeColor} strokeDasharray={circumference} strokeDashoffset={offset}
                            transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round"
                            style={{transition: 'stroke-dashoffset 0.3s ease-out'}}/>
                )}
                {/* Checkmark (only shown for 100%) */}
                {normalizedPercentage === 100 && (
                    <path d={checkPath} fill="none" strokeWidth={strokeWidth * 0.9} className={progressStrokeColor}
                          strokeLinecap="round" strokeLinejoin="round"
                          style={{transition: 'opacity 0.2s ease-in 0.1s'}}/>
                )}
            </svg>
        </div>
    );
});
ProgressIndicator.displayName = 'ProgressIndicator';

// Snippet Function (remains the same)
function generateContentSnippet(content: string, term: string, length: number = 35): string { /* ... */
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

// Priority Map (remains the same)
const priorityMap: Record<number, { label: string; iconColor: string }> = {
    1: {
        label: 'High',
        iconColor: 'text-red-500'
    },
    2: {label: 'Medium', iconColor: 'text-orange-500'},
    3: {label: 'Low', iconColor: 'text-blue-500'},
    4: {label: 'Lowest', iconColor: 'text-gray-500'},
};

// TaskItem Component Refactored
const TaskItem: React.FC<TaskItemProps> = memo(({
                                                    task,
                                                    groupCategory,
                                                    isOverlay = false,
                                                    style: overlayStyle,
                                                }) => {
    const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const setTasks = useSetAtom(tasksAtom);
    const [searchTerm] = useAtom(searchTermAtom);
    const userLists = useAtomValue(userListNamesAtom);
    // const { openItemId, setOpenItemId } = useTaskItemMenu(); // Potentially remove if not needed
    const isSelected = useMemo(() => selectedTaskId === task.id, [selectedTaskId, task.id]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const isTrashItem = useMemo(() => task.list === 'Trash', [task.list]);
    const isCompleted = useMemo(() => (task.completionPercentage ?? 0) === 100 && !isTrashItem, [task.completionPercentage, isTrashItem]);
    const isSortable = useMemo(() => !isCompleted && !isTrashItem && !isOverlay, [isCompleted, isTrashItem, isOverlay]);

    // DND Hook (remains the same)
    const {attributes, listeners, setNodeRef, transform, transition: dndTransition, isDragging} = useSortable({
        id: task.id,
        disabled: !isSortable,
        data: {task, type: 'task-item', groupCategory: groupCategory ?? task.groupCategory},
    });

    // DND Styles (adjusted for potentially simpler structure)
    const style = useMemo(() => {
        const baseTransform = CSS.Transform.toString(transform);
        const calculatedTransition = dndTransition; // Use dnd-kit's transition
        const baseStyle: React.CSSProperties = {
            transform: baseTransform,
            transition: calculatedTransition || 'background-color 0.15s ease-out, border-color 0.15s ease-out, box-shadow 0.15s ease-out',
            zIndex: isDragging ? 100 : (isSelected ? 2 : 1),
            position: 'relative', // Needed for z-index and absolute positioning of actions button maybe
            cursor: isDragging ? 'grabbing' : (isSortable ? 'grab' : 'pointer'),
            touchAction: isSortable ? 'none' : 'auto', // Prevent scrolling on draggable items on touch devices
            backgroundColor: 'transparent', // Default background handled by cn
            opacity: 1,
        };

        if (isDragging) {
            if (isOverlay) {
                // Style for the DragOverlay item
                return {
                    ...baseStyle,
                    ...overlayStyle, // Apply any overlay styles passed in
                    boxShadow: '0 8px 20px -5px rgba(0, 0, 0, 0.15), 0 4px 8px -6px rgba(0, 0, 0, 0.1)',
                    cursor: 'grabbing',
                    backgroundColor: 'hsl(var(--card))', // Ensure it has a background
                };
            } else {
                // Style for the original item being dragged (placeholder)
                return {
                    ...baseStyle,
                    opacity: 0.4,
                    boxShadow: 'none',
                    border: '1px dashed hsl(var(--border))', // Dashed border for placeholder
                };
            }
        }

        return {...baseStyle, ...overlayStyle};

    }, [transform, dndTransition, isDragging, isSelected, isSortable, isOverlay, overlayStyle]);


    // Task Click Handler (remains the same)
    const handleTaskClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        // Ignore clicks on interactive elements within the item
        if (target.closest('button, input, a, [role="button"], [role="checkbox"], [role="menuitem"], [role="menuitemradio"]')) {
            return;
        }
        if (isDragging) return; // Don't select during drag
        setSelectedTaskId(id => (id === task.id ? null : task.id));
        // setOpenItemId(null); // Close any other menus
    }, [setSelectedTaskId, task.id, isDragging]);


    // Update Task Logic (remains the same)
    const updateTask = useCallback((updates: Partial<Omit<Task, 'groupCategory' | 'completedAt' | 'completed'>>) => {
        setTasks(prevTasks => prevTasks.map(t => {
            if (t.id === task.id) return {...t, ...updates, updatedAt: Date.now()};
            return t;
        }));
    }, [setTasks, task.id]);

    // Progress Cycling Logic (using checkbox handler now)
    const cycleCompletion = useCallback((checked: boolean | 'indeterminate') => {
        // Checkbox gives boolean, 'indeterminate' isn't passed here
        const isNowChecked = !!checked; // Coerce to boolean
        let nextPercentage: number | null;

        if (isNowChecked) {
            nextPercentage = 100; // Mark as complete
        } else {
            // Unchecking: If it was 100%, revert to 0 (or null), otherwise keep current % (shouldn't happen with simple checkbox)
            nextPercentage = null; // Mark as incomplete (0%)
        }

        updateTask({completionPercentage: nextPercentage});
        if (nextPercentage === 100 && isSelected) setSelectedTaskId(null);
    }, [task.completionPercentage, updateTask, isSelected, setSelectedTaskId]);


    // Actions Handlers (adapted for DropdownMenu)
    const handleProgressChange = useCallback((newPercentage: number | null) => {
        updateTask({completionPercentage: newPercentage});
        if (newPercentage === 100 && isSelected) setSelectedTaskId(null);
        // Dropdown closes automatically
    }, [updateTask, isSelected, setSelectedTaskId]);

    const handleDateSelect = useCallback((date: Date | undefined) => {
        const newDueDate = date && isValid(date) ? startOfDay(date).getTime() : null;
        updateTask({dueDate: newDueDate});
        // Popover within Dropdown closes automatically
    }, [updateTask]);

    const handlePriorityChange = useCallback((newPriority: string) => { // Value from RadioItem is string
        updateTask({priority: newPriority === 'null' ? null : parseInt(newPriority, 10)});
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
            completed: false,
            completedAt: null,
            completionPercentage: task.completionPercentage
        };
        delete newTaskData.groupCategory;
        setTasks(prev => {
            const index = prev.findIndex(t => t.id === task.id);
            const newTasks = [...prev];
            if (index !== -1) newTasks.splice(index + 1, 0, newTaskData as Task);
            else newTasks.push(newTaskData as Task);
            return newTasks;
        });
        setSelectedTaskId(newTaskData.id!);
    }, [task, setTasks, setSelectedTaskId]);

    const openDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(true), []);
    const closeDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(false), []);
    const confirmDeleteTask = useCallback(() => {
        updateTask({list: 'Trash', completionPercentage: null});
        if (isSelected) setSelectedTaskId(null);
        closeDeleteConfirm(); // Closes the modal itself
    }, [updateTask, isSelected, setSelectedTaskId, closeDeleteConfirm]);

    // Memoized display values
    const dueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const isValidDueDate = useMemo(() => dueDate && isValid(dueDate), [dueDate]);
    const overdue = useMemo(() => isValidDueDate && !isCompleted && !isTrashItem && isOverdue(dueDate!), [isValidDueDate, isCompleted, isTrashItem, dueDate]);
    const searchWords = useMemo(() => searchTerm ? searchTerm.trim().toLowerCase().split(' ').filter(Boolean) : [], [searchTerm]);
    const highlighterProps = useMemo(() => ({
        highlightClassName: "bg-primary/20 text-inherit font-semibold rounded-[1px] px-0",
        searchWords: searchWords, autoEscape: true, textToHighlight: '' // Placeholder, set below
    }), [searchWords]);
    const showContentHighlight = useMemo(() => { /* ... (same logic) ... */
        if (searchWords.length === 0 || !task.content?.trim()) return false;
        const lc = task.content.toLowerCase();
        const lt = task.title.toLowerCase();
        return searchWords.some(w => lc.includes(w)) && !searchWords.every(w => lt.includes(w));
    }, [searchWords, task.content, task.title]);

    // Task Item Container Styling
    const baseClasses = cn(
        'task-item flex items-start px-2.5 py-2 border-b border-border/50 group relative min-h-[52px]', // Layout and border
        'transition-colors duration-150 ease-apple', // Hover transition
        isOverlay
            ? 'bg-card backdrop-blur-sm border rounded-md shadow-lg' // Overlay style
            : isSelected && !isDragging
                ? 'bg-accent dark:bg-accent/70' // Selected style
                : isTrashItem
                    ? 'bg-secondary/30 opacity-60 hover:bg-secondary/50' // Trashed style
                    : isCompleted
                        ? 'bg-secondary/30 opacity-70 hover:bg-secondary/50' // Completed style
                        : 'hover:bg-accent/50', // Default hover
        // isDragging style is handled in the `style` object
    );

    const listIcon: IconName = useMemo(() => task.list === 'Inbox' ? 'inbox' : (task.list === 'Trash' ? 'trash' : 'list'), [task.list]);
    const availableLists = useMemo(() => userLists.filter(l => l !== 'Trash'), [userLists]);
    const progressLabel = useMemo(() => { /* ... (same logic) ... */
        const p = task.completionPercentage;
        if (p && p > 0 && p < 100 && !isTrashItem) return `[${p}%]`;
        return null;
    }, [task.completionPercentage, isTrashItem]);

    return (
        <>
            <div
                ref={setNodeRef} style={style} className={baseClasses}
                {...(isSortable ? attributes : {})}
                // Apply listeners only if sortable, otherwise use onClick for selection
                {...(isSortable ? listeners : {onClick: handleTaskClick})}
                // Use div role for non-interactive drag handle, button role for clickable item
                role={isSortable ? "listitem" : "button"}
                tabIndex={0} // Make it focusable
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                    if (!isSortable && (e.key === 'Enter' || e.key === ' ')) { // Handle click for non-sortable items
                        e.preventDefault();
                        handleTaskClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                    }
                    // DND Kit's KeyboardSensor handles keyboard dragging when sortable
                }}
                aria-selected={isSelected}
                aria-labelledby={`task-title-${task.id}`}
            >
                {/* Progress Indicator */}
                <div className="flex-shrink-0 mr-2.5 pt-[3px] pl-[2px]">
                    <ProgressIndicator
                        percentage={task.completionPercentage}
                        isTrash={isTrashItem}
                        taskId={task.id}
                        checked={isCompleted}
                        onCheckedChange={cycleCompletion}
                        ariaLabelledby={`task-title-${task.id}`}
                    />
                </div>

                {/* Task Info */}
                <div className="flex-1 min-w-0 pt-[1px] pb-[1px]">
                    {/* Title and Progress Label */}
                    <div className="flex items-baseline">
                        <Highlighter {...highlighterProps} textToHighlight={task.title || 'Untitled Task'}
                                     id={`task-title-${task.id}`}
                                     className={cn(
                                         "text-sm text-foreground leading-snug block",
                                         (isCompleted || isTrashItem) && "line-through text-muted-foreground"
                                     )}
                        />
                        {progressLabel && (
                            <span className="ml-1.5 text-[10px] text-primary/90 font-medium select-none">
                                 {progressLabel}
                             </span>
                        )}
                    </div>
                    {/* Metadata */}
                    <div
                        className="flex items-center flex-wrap text-[11px] text-muted-foreground gap-x-2 gap-y-0.5 mt-1 min-h-[17px]">
                        {/* Priority */}
                        {!!task.priority && task.priority <= 4 && !isCompleted && !isTrashItem && (
                            <span className={cn("flex items-center", priorityMap[task.priority]?.iconColor)}
                                  title={`Priority ${priorityMap[task.priority]?.label}`}>
                                <Icon name="flag" size={11} strokeWidth={2.5}/>
                            </span>
                        )}
                        {/* Due Date */}
                        {isValidDueDate && (
                            <Popover>
                                <PopoverTrigger asChild disabled={isTrashItem || isCompleted || isOverlay}>
                                    <button
                                        className={cn(
                                            'flex items-center whitespace-nowrap group/date disabled:opacity-70 disabled:cursor-not-allowed disabled:line-through',
                                            overdue && 'text-destructive font-medium',
                                            (isCompleted || isTrashItem) && 'line-through opacity-70',
                                            isTrashItem || isCompleted || isOverlay ? '' : 'hover:text-primary'
                                        )}
                                        disabled={isTrashItem || isCompleted || isOverlay}
                                        aria-label={`Due date: ${formatRelativeDate(dueDate!)}`}
                                    >
                                        <Icon name="calendar" size={11}
                                              className="mr-0.5 opacity-70 group-hover/date:opacity-90"/>
                                        {formatRelativeDate(dueDate!)}
                                        {/* Reschedule Icon */}
                                        {(overdue || !isOverlay) && !isCompleted && !isTrashItem && (
                                            <Icon name="calendar-plus" size={12}
                                                  className="ml-1 opacity-0 group-hover/date:opacity-70 transition-opacity text-primary/80"/>
                                        )}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CustomDatePickerPopover
                                        initialDate={dueDate ?? undefined}
                                        onSelect={handleDateSelect}
                                        trigger={<></>} // Trigger is handled by PopoverTrigger above
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                        {/* List */}
                        {task.list && task.list !== 'Inbox' && (
                            <Badge variant="secondary"
                                   className={cn("px-1 py-0 text-[10px] font-normal h-[16px]", (isCompleted || isTrashItem) && 'opacity-70')}
                                   title={task.list}>
                                <Icon name={listIcon} size={10} className="mr-0.5 opacity-70 flex-shrink-0"/>
                                <span className="truncate max-w-[80px]">{task.list}</span>
                            </Badge>
                        )}
                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <span
                                className={cn("flex items-center gap-1 flex-wrap", (isCompleted || isTrashItem) && 'opacity-70')}>
                                {task.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="outline"
                                           className="px-1 py-0 text-[10px] font-normal h-[16px] border-border/50"
                                           title={tag}>
                                        #{tag}
                                    </Badge>
                                ))}
                                {task.tags.length > 2 && <span
                                    className="text-[10px] text-muted-foreground/80">+{task.tags.length - 2}</span>}
                            </span>
                        )}
                        {/* Content Snippet */}
                        {showContentHighlight && (
                            <Highlighter {...highlighterProps}
                                         textToHighlight={generateContentSnippet(task.content!, searchTerm)}
                                         className={cn("block truncate text-[11px] text-muted-foreground italic w-full mt-0.5", (isCompleted || isTrashItem) && 'line-through')}/>
                        )}
                    </div>
                </div>

                {/* More Actions Button & DropdownMenu */}
                {!isOverlay && !isTrashItem && (
                    <div className={cn(
                        "absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-100 ease-out",
                        // Ensure it doesn't block clicks on the main item unless focused/hovered
                        "pointer-events-none [&>*]:pointer-events-auto"
                    )}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:bg-accent"
                                    aria-label={`More actions for ${task.title || 'task'}`}
                                    // Prevent click from selecting the task item itself
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <Icon name="more-horizontal" size={16}/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end"
                                                 className="w-48 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl"
                                // Prevent clicks inside from selecting task
                                                 onClick={(e) => e.stopPropagation()}
                                                 onMouseDown={(e) => e.stopPropagation()}
                            >
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-xs">Set Progress</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup
                                        value={(task.completionPercentage ?? 'null').toString()} // Ensure value is string or undefined
                                        onValueChange={(value) => handleProgressChange(value === 'null' ? null : parseInt(value, 10))}
                                    >
                                        {[
                                            {label: 'Not Started', value: 'null', icon: 'circle'},
                                            {label: 'Started (20%)', value: '20', icon: 'circle-dot-dashed'},
                                            {label: 'Halfway (50%)', value: '50', icon: 'circle-dot'},
                                            {label: 'Almost Done (80%)', value: '80', icon: 'circle-slash'},
                                            {label: 'Completed (100%)', value: '100', icon: 'circle-check'},
                                        ].map(item => (
                                            <DropdownMenuRadioItem key={item.value} value={item.value}
                                                                   disabled={isCompleted && item.value !== '100'}
                                                                   className="cursor-pointer">
                                                <Icon name={item.icon as IconName} size={14}
                                                      className="mr-1.5 opacity-80"/>
                                                {item.label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator/>
                                {/* Due Date Popover inside Dropdown */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isCompleted}
                                                          className="cursor-pointer">
                                            <Icon name="calendar-plus" size={14} className="mr-1.5 opacity-80"/> Set Due
                                            Date...
                                        </DropdownMenuItem>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start" side="right" sideOffset={5}>
                                        <CustomDatePickerPopover
                                            initialDate={dueDate ?? undefined}
                                            onSelect={handleDateSelect}
                                            trigger={<></>} // Trigger handled by PopoverTrigger above
                                        />
                                    </PopoverContent>
                                </Popover>
                                <DropdownMenuSeparator/>
                                {/* Priority Submenu */}
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={isCompleted}>
                                        <Icon name="flag" size={14} className="mr-1.5 opacity-80"/> Priority
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent
                                            className="bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                                            <DropdownMenuRadioGroup value={(task.priority ?? 'null').toString()}
                                                                    onValueChange={handlePriorityChange}>
                                                {[
                                                    {label: 'None', value: 'null', iconColor: undefined},
                                                    {
                                                        label: `P1 ${priorityMap[1].label}`,
                                                        value: '1',
                                                        iconColor: priorityMap[1].iconColor
                                                    },
                                                    {
                                                        label: `P2 ${priorityMap[2].label}`,
                                                        value: '2',
                                                        iconColor: priorityMap[2].iconColor
                                                    },
                                                    {
                                                        label: `P3 ${priorityMap[3].label}`,
                                                        value: '3',
                                                        iconColor: priorityMap[3].iconColor
                                                    },
                                                    {
                                                        label: `P4 ${priorityMap[4].label}`,
                                                        value: '4',
                                                        iconColor: priorityMap[4].iconColor
                                                    },
                                                ].map(p => (
                                                    <DropdownMenuRadioItem key={p.value} value={p.value}
                                                                           className="cursor-pointer">
                                                        <Icon name="flag" size={14}
                                                              className={cn("mr-1.5 opacity-80", p.iconColor)}/> {p.label}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                {/* Move to List Submenu */}
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={isCompleted}>
                                        <Icon name="list" size={14} className="mr-1.5 opacity-80"/> Move to List
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent
                                            className="max-h-48 overflow-y-auto styled-scrollbar-thin bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                                            <DropdownMenuRadioGroup value={task.list} onValueChange={handleListChange}>
                                                {availableLists.map(list => (
                                                    <DropdownMenuRadioItem key={list} value={list}
                                                                           className="cursor-pointer">
                                                        <Icon name={list === 'Inbox' ? 'inbox' : 'list'} size={14}
                                                              className="mr-1.5 opacity-80"/> {list}
                                                    </DropdownMenuRadioItem>
                                                ))}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem onClick={handleDuplicateTask} disabled={isCompleted}
                                                  className="cursor-pointer">
                                    <Icon name="copy-plus" size={14} className="mr-1.5 opacity-80"/> Duplicate Task
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={openDeleteConfirm}
                                                  className="!text-destructive focus:!bg-destructive/10 focus:!text-destructive cursor-pointer">
                                    <Icon name="trash" size={14} className="mr-1.5 opacity-80"/> Move to Trash
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

            </div>
            {/* Delete Confirmation Dialog */}
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