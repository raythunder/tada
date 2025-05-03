// src/components/tasks/TaskDetail.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {selectedTaskAtom, selectedTaskIdAtom, tasksAtom, userListNamesAtom} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, {CodeMirrorEditorRef} from '../common/CodeMirrorEditor';
import {formatDateTime, formatRelativeDate, isOverdue, isValid, safeParseDate, startOfDay} from '@/utils/dateUtils';
import {Task} from '@/types';
import {motion} from 'framer-motion';
import {twMerge} from 'tailwind-merge';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
// Import the CONTENT component
import {CustomDatePickerContent} from '../common/CustomDatePickerPopover';
import ConfirmDeleteModalRadix from "@/components/common/ConfirmDeleteModal";
import {ProgressIndicator} from './TaskItem';
import {IconName} from "@/components/common/IconMap";
import MetaRow from "@/components/tasks/MetaRow.tsx";

// --- Helper TagPill Component ---
interface TagPillProps {
    tag: string;
    onRemove: () => void;
    disabled?: boolean;
}

const TagPill: React.FC<TagPillProps> = React.memo(({tag, onRemove, disabled}) => (
    <span
        className={twMerge(
            "inline-flex items-center bg-black/10 dark:bg-white/10 text-gray-700 dark:text-neutral-300 rounded-sm pl-1.5 pr-1 py-0.5 text-xs mr-1 mb-1 group/pill whitespace-nowrap",
            "transition-colors duration-100 ease-apple",
            disabled ? "opacity-70 cursor-not-allowed" : "hover:bg-black/20 dark:hover:bg-white/20"
        )}
        aria-label={`Tag: ${tag}${disabled ? ' (disabled)' : ''}`}
    >
        {tag}
        {!disabled && (
            <button type="button" onClick={(e) => {
                e.stopPropagation();
                onRemove();
            }}
                    className="ml-1 text-gray-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 opacity-50 group-hover/pill:opacity-100 focus:outline-none rounded-full p-0.5 -mr-0.5 flex items-center justify-center"
                    aria-label={`Remove tag ${tag}`} tabIndex={-1}>
                <Icon name="x" size={10} strokeWidth={3}/>
            </button>
        )}
    </span>
));
TagPill.displayName = 'TagPill';

// --- Reusable Radix Dropdown Menu Item Component ---
interface RadixMenuItemProps extends DropdownMenu.DropdownMenuItemProps {
    icon?: IconName;
    iconColor?: string;
    selected?: boolean;
    isDanger?: boolean;
}

const RadixMenuItem: React.FC<RadixMenuItemProps> = React.memo(({
                                                                    icon,
                                                                    iconColor,
                                                                    selected,
                                                                    children,
                                                                    className,
                                                                    isDanger = false,
                                                                    ...props
                                                                }) => (
    <DropdownMenu.Item
        className={twMerge(
            "relative flex cursor-pointer select-none items-center rounded-[3px] px-2.5 py-1 text-sm outline-none transition-colors data-[disabled]:pointer-events-none h-7",
            isDanger
                ? "text-red-600 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-700 dark:text-red-400 dark:data-[highlighted]:bg-red-500/20 dark:data-[highlighted]:text-red-300"
                : "focus:bg-black/15 data-[highlighted]:bg-black/15 dark:focus:bg-white/10 dark:data-[highlighted]:bg-white/10",
            selected && !isDanger && "bg-primary/20 text-primary data-[highlighted]:bg-primary/25 dark:bg-primary/30 dark:text-primary-light dark:data-[highlighted]:bg-primary/40",
            !selected && !isDanger && "text-gray-700 data-[highlighted]:text-gray-800 dark:text-neutral-300 dark:data-[highlighted]:text-neutral-100",
            "data-[disabled]:opacity-50",
            className
        )}
        {...props}
    >
        {icon && (
            <Icon name={icon} size={14} className={twMerge("mr-1.5 flex-shrink-0 opacity-80", iconColor)}
                  aria-hidden="true"/>
        )}
        {children}
    </DropdownMenu.Item>
));
RadixMenuItem.displayName = 'RadixMenuItem';


// --- TaskDetail Component ---
const TaskDetail: React.FC = () => {
    const [selectedTask] = useAtom(selectedTaskAtom);
    const setTasks = useSetAtom(tasksAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const [localTitle, setLocalTitle] = useState('');
    const [localContent, setLocalContent] = useState('');
    const [localDueDate, setLocalDueDate] = useState<Date | undefined>(undefined);
    const [localTags, setLocalTags] = useState('');
    const [tagInputValue, setTagInputValue] = useState('');

    // State for Radix controls
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isProgressDropdownOpen, setIsProgressDropdownOpen] = useState(false);

    const titleInputRef = useRef<HTMLInputElement>(null);
    const tagInputElementRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const latestTitleRef = useRef(localTitle);
    const latestContentRef = useRef(localContent);
    const latestTagsRef = useRef(localTags);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasUnsavedChangesRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            // Ensure any pending changes are saved when component unmounts or task changes
            savePendingChanges();
        };
    }, []); // Run only on mount/unmount

    // Debounced Save Logic
    const savePendingChanges = useCallback(() => {
        if (!selectedTask || !hasUnsavedChangesRef.current || !isMountedRef.current) {
            return;
        }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        const currentTitle = latestTitleRef.current;
        const currentContent = latestContentRef.current;
        const currentDueDate = localDueDate; // Use the state directly
        const currentTagsString = latestTagsRef.current;

        const processedTitle = currentTitle.trim();
        const processedDueDate = currentDueDate && isValid(currentDueDate) ? startOfDay(currentDueDate).getTime() : null;
        const processedTags = currentTagsString.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

        const originalTaskState = selectedTask; // Capture state at time of save call
        const changesToSave: Partial<Task> = {};

        // Compare processed values with the original task state
        if (processedTitle !== originalTaskState.title) changesToSave.title = processedTitle;
        if (currentContent !== (originalTaskState.content || '')) changesToSave.content = currentContent;
        const originalDueTime = originalTaskState.dueDate ?? null;
        if (processedDueDate !== originalDueTime) changesToSave.dueDate = processedDueDate;
        const originalTagsSorted = (originalTaskState.tags ?? []).slice().sort();
        const processedTagsSorted = processedTags.slice().sort();
        if (JSON.stringify(processedTagsSorted) !== JSON.stringify(originalTagsSorted)) changesToSave.tags = processedTags;

        // If there are changes, update the task atom
        if (Object.keys(changesToSave).length > 0) {
            changesToSave.updatedAt = Date.now(); // Set update timestamp
            setTasks(prevTasks =>
                prevTasks.map((t) => (t.id === originalTaskState.id ? {...t, ...changesToSave} : t))
            );
        }
        hasUnsavedChangesRef.current = false; // Reset unsaved changes flag

    }, [selectedTask, setTasks, localDueDate]); // Depend on localDueDate

    // Sync Local State from Atom when selectedTask changes
    useEffect(() => {
        // Force save any pending changes from the *previous* task before switching
        savePendingChanges();

        if (selectedTask) {
            const isTitleFocused = titleInputRef.current === document.activeElement;
            const isTagsFocused = tagInputElementRef.current === document.activeElement;
            const isContentFocused = editorRef.current?.getView()?.hasFocus ?? false;

            // Sync title if not focused
            if (!isTitleFocused) {
                setLocalTitle(selectedTask.title);
                latestTitleRef.current = selectedTask.title;
            }
            // Sync content if not focused
            const taskContent = selectedTask.content || '';
            if (!isContentFocused) {
                setLocalContent(taskContent);
                latestContentRef.current = taskContent;
            }
            // Sync due date (always sync, picker handles its own state)
            const taskDueDate = safeParseDate(selectedTask.dueDate);
            const validTaskDueDate = taskDueDate && isValid(taskDueDate) ? startOfDay(taskDueDate) : undefined; // Use startOfDay for consistency
            setLocalDueDate(validTaskDueDate);

            // Sync tags if not focused
            const taskTagsString = (selectedTask.tags ?? []).join(', ');
            if (!isTagsFocused) {
                setLocalTags(taskTagsString);
                latestTagsRef.current = taskTagsString;
                setTagInputValue(''); // Clear input on task switch
            }

            hasUnsavedChangesRef.current = false; // Reset flag after loading new task
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }

            // Auto-focus title if it's new and empty
            if (selectedTask.title === '' && !isTitleFocused && !isContentFocused && !isTagsFocused) {
                const timer = setTimeout(() => {
                    if (isMountedRef.current && titleInputRef.current) {
                        titleInputRef.current.focus();
                        titleInputRef.current.select();
                    }
                }, 350); // Delay slightly for transition
                return () => clearTimeout(timer);
            }
        } else {
            // Reset local state if no task is selected
            setLocalTitle('');
            latestTitleRef.current = '';
            setLocalContent('');
            latestContentRef.current = '';
            setLocalDueDate(undefined);
            setLocalTags('');
            latestTagsRef.current = '';
            setTagInputValue('');
            hasUnsavedChangesRef.current = false;
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            // Close any open popups/modals associated with the detail view
            setIsDeleteDialogOpen(false);
            setIsDatePickerOpen(false);
            setIsListDropdownOpen(false);
            setIsPriorityDropdownOpen(false);
            setIsProgressDropdownOpen(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask?.id]); // Rerun ONLY when the selected task ID changes


    // Update Refs on Local State Change
    useEffect(() => {
        latestTitleRef.current = localTitle;
    }, [localTitle]);
    useEffect(() => {
        latestContentRef.current = localContent;
    }, [localContent]);
    useEffect(() => {
        latestTagsRef.current = localTags;
    }, [localTags]);

    // Debounced Save Trigger
    const triggerSave = useCallback(() => {
        if (!selectedTask || !isMountedRef.current) return;
        hasUnsavedChangesRef.current = true;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            savePendingChanges();
        }, 600); // 600ms debounce delay
    }, [selectedTask, savePendingChanges]);

    // Direct Update Function (for immediate changes like priority, list, date)
    const updateTask = useCallback((updates: Partial<Omit<Task, 'groupCategory' | 'completedAt' | 'completed'>>) => {
        if (!selectedTask || !isMountedRef.current) return;
        // Save any pending debounced changes immediately before applying direct update
        if (hasUnsavedChangesRef.current) {
            savePendingChanges();
        }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current); // Clear any pending debounce timer
            saveTimeoutRef.current = null;
        }
        hasUnsavedChangesRef.current = false; // Direct update means changes are saved

        // Apply the direct update
        setTasks(prevTasks => prevTasks.map(t => (t.id === selectedTask.id ? {
            ...t, ...updates,
            updatedAt: Date.now() // Ensure updatedAt is set for direct changes
        } : t)));
    }, [selectedTask, setTasks, savePendingChanges]);

    // Event Handlers
    const handleClose = useCallback(() => {
        savePendingChanges(); // Ensure pending changes are saved on close
        setSelectedTaskId(null);
    }, [setSelectedTaskId, savePendingChanges]);

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTitle(e.target.value);
        triggerSave(); // Trigger debounced save for title
    }, [triggerSave]);

    const handleContentChange = useCallback((newValue: string) => {
        setLocalContent(newValue);
        triggerSave(); // Trigger debounced save for content
    }, [triggerSave]);

    // Date Picker Handlers
    const handleDatePickerSelect = useCallback((date: Date | undefined) => {
        const newDate = date && isValid(date) ? startOfDay(date) : undefined;
        // Update local state immediately for visual feedback
        setLocalDueDate(newDate);
        // Apply the change directly using updateTask (no debounce needed for date)
        updateTask({dueDate: newDate ? newDate.getTime() : null});
        // Popover closes automatically via the closePopover callback passed to CustomDatePickerContent
    }, [updateTask]);

    // Callback passed to CustomDatePickerContent to close the popover
    const closeDatePickerPopover = useCallback(() => {
        setIsDatePickerOpen(false);
    }, []);

    // Dropdown Select Handlers (Radix closes dropdown automatically)
    const handleListChange = useCallback((newList: string) => {
        updateTask({list: newList});
    }, [updateTask]);
    const handlePriorityChange = useCallback((newPriority: number | null) => {
        updateTask({priority: newPriority});
    }, [updateTask]);
    const handleProgressChange = useCallback((newPercentage: number | null) => {
        updateTask({completionPercentage: newPercentage});
    }, [updateTask]);

    // Direct Progress Cycle (from checkbox)
    const cycleCompletionPercentage = useCallback(() => {
        if (!selectedTask || selectedTask.list === 'Trash') return;
        const currentPercentage = selectedTask.completionPercentage ?? 0;
        let nextPercentage: number | null = null;
        if (currentPercentage === 100) nextPercentage = null; // Cycle back to 0 (null)
        else nextPercentage = 100; // Cycle to 100
        updateTask({completionPercentage: nextPercentage});
    }, [selectedTask, updateTask]);

    const handleProgressIndicatorKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            cycleCompletionPercentage();
        }
    }, [cycleCompletionPercentage]);

    // Delete/Restore Handling
    const openDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(true), []);
    const closeDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(false), []);
    const confirmDelete = useCallback(() => {
        if (!selectedTask) return;
        updateTask({list: 'Trash', completionPercentage: null}); // Move to Trash, clear progress
        setSelectedTaskId(null); // Deselect task after moving
        // Dialog closes automatically
    }, [selectedTask, updateTask, setSelectedTaskId]);
    const handleRestore = useCallback(() => {
        if (!selectedTask || selectedTask.list !== 'Trash') return;
        updateTask({list: 'Inbox'}); // Restore to Inbox
    }, [selectedTask, updateTask]);

    // Input KeyDown Handlers
    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            savePendingChanges(); // Force save on Enter
            titleInputRef.current?.blur(); // Blur input
        } else if (e.key === 'Escape' && selectedTask) {
            e.preventDefault();
            // Revert to original title if changed
            if (localTitle !== selectedTask.title) {
                setLocalTitle(selectedTask.title);
                latestTitleRef.current = selectedTask.title;
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                hasUnsavedChangesRef.current = false; // Discard unsaved changes
            }
            titleInputRef.current?.blur(); // Blur input
        }
    }, [selectedTask, localTitle, savePendingChanges]);


    // --- Tag Input Specific Logic ---
    const tagsArray = useMemo(() => {
        return localTags.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
    }, [localTags]);
    const isTrash = useMemo(() => selectedTask?.list === 'Trash', [selectedTask?.list]);
    const isCompleted = useMemo(() => (selectedTask?.completionPercentage ?? 0) === 100 && !isTrash, [selectedTask?.completionPercentage, isTrash]);
    const isTagHandlingDisabled = useMemo(() => isTrash || isCompleted, [isTrash, isCompleted]);

    const addTag = useCallback((tagToAdd: string) => {
        const trimmedTag = tagToAdd.trim();
        if (!trimmedTag || isTagHandlingDisabled) return;
        const currentTags = localTags.split(',').map(t => t.trim()).filter(Boolean);
        if (!currentTags.includes(trimmedTag)) {
            // Update local state and trigger debounced save
            const newTagsString = [...currentTags, trimmedTag].join(', ');
            setLocalTags(newTagsString);
            triggerSave();
        }
        setTagInputValue(''); // Clear input regardless
    }, [localTags, isTagHandlingDisabled, triggerSave]);

    const removeTag = useCallback((tagToRemove: string) => {
        if (isTagHandlingDisabled) return;
        const newTagsArray = tagsArray.filter(t => t !== tagToRemove);
        setLocalTags(newTagsArray.join(', ')); // Update local state
        triggerSave(); // Trigger debounced save
        tagInputElementRef.current?.focus(); // Keep focus on tag area
    }, [tagsArray, isTagHandlingDisabled, triggerSave]);

    const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isTagHandlingDisabled) return;
        const value = tagInputValue.trim();
        if ((e.key === 'Enter' || e.key === ',') && value) {
            e.preventDefault();
            addTag(value);
        } else if (e.key === 'Backspace' && tagInputValue === '' && tagsArray.length > 0) {
            e.preventDefault();
            removeTag(tagsArray[tagsArray.length - 1]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setTagInputValue('');
            (e.target as HTMLInputElement).blur();
        }
    }, [tagInputValue, tagsArray, addTag, removeTag, isTagHandlingDisabled]);

    const handleTagInputBlur = useCallback(() => {
        const value = tagInputValue.trim();
        if (value && !isTagHandlingDisabled) {
            addTag(value); // Add any remaining input as a tag on blur
        }
        savePendingChanges(); // Force save on blur
    }, [tagInputValue, addTag, isTagHandlingDisabled, savePendingChanges]);

    const handleTagContainerClick = useCallback(() => {
        if (!isTagHandlingDisabled) {
            tagInputElementRef.current?.focus();
        }
    }, [isTagHandlingDisabled]);


    // --- Memos for Display Logic ---
    const priorityMap: Record<number, { label: string; iconColor: string }> = useMemo(() => ({
        1: {label: 'High', iconColor: 'text-red-500'},
        2: {label: 'Medium', iconColor: 'text-orange-500'},
        3: {label: 'Low', iconColor: 'text-blue-500'},
        4: {label: 'Lowest', iconColor: 'text-gray-500'},
    }), []);

    // Use localDueDate for picker consistency, but rely on selectedTask for initial render if local isn't set yet
    const displayDueDateForPicker = useMemo(() => localDueDate, [localDueDate]);
    const displayDueDateForRender = useMemo(() => localDueDate ?? safeParseDate(selectedTask?.dueDate), [localDueDate, selectedTask?.dueDate]);
    const overdue = useMemo(() => displayDueDateForRender && isValid(displayDueDateForRender) && !isCompleted && !isTrash && isOverdue(displayDueDateForRender), [displayDueDateForRender, isCompleted, isTrash]);
    const displayPriority = selectedTask?.priority;
    const displayList = selectedTask?.list;
    const displayCreatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.createdAt) : '', [selectedTask?.createdAt]);
    const displayUpdatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.updatedAt) : '', [selectedTask?.updatedAt]);
    const availableLists = useMemo(() => userLists.filter(l => l !== 'Trash'), [userLists]);

    const titleInputClasses = useMemo(() => twMerge(
        "w-full text-lg font-medium border-none focus:ring-0 focus:outline-none bg-transparent p-0 m-0 leading-tight",
        "placeholder:text-muted dark:placeholder:text-neutral-500 placeholder:font-normal",
        (isCompleted || isTrash) && "line-through text-muted-foreground dark:text-neutral-500",
        "task-detail-title-input dark:text-neutral-100"
    ), [isCompleted, isTrash]);

    const editorClasses = useMemo(() => twMerge(
        "!min-h-[150px] h-full text-sm",
        "!bg-transparent", // Make CM background transparent
        (isCompleted || isTrash) && "opacity-70",
        isTrash && "pointer-events-none",
        // Ensure text color adapts to theme
        "dark:!text-neutral-300"
    ), [isCompleted, isTrash]);


    const progressStatusText = useMemo(() => {
        const p = selectedTask?.completionPercentage;
        if (p === 100) return "Completed";
        if (p === 80) return "Almost Done (80%)";
        if (p === 50) return "Halfway (50%)";
        if (p === 20) return "Started (20%)";
        return "Not Started";
    }, [selectedTask?.completionPercentage]);

    const progressMenuItems = useMemo(() => [
        {label: 'Not Started', value: null, icon: 'circle' as IconName},
        {label: 'Started (20%)', value: 20, icon: 'circle-dot-dashed' as IconName},
        {label: 'Halfway (50%)', value: 50, icon: 'circle-dot' as IconName},
        {label: 'Almost Done (80%)', value: 80, icon: 'circle-slash' as IconName},
        {label: 'Completed (100%)', value: 100, icon: 'circle-check' as IconName},
    ], []);

    const tagInputContainerClasses = useMemo(() => twMerge(
        "flex items-center flex-wrap bg-transparent rounded-sm w-full min-h-[28px] px-1.5 py-1",
        "transition-colors duration-100 ease-apple backdrop-blur-sm",
        isTagHandlingDisabled
            ? "opacity-60 cursor-not-allowed bg-transparent"
            : "hover:bg-white/15 dark:hover:bg-white/5 focus-within:bg-white/20 dark:focus-within:bg-white/10 cursor-text"
    ), [isTagHandlingDisabled]);

    // --- Dropdown Menu Content Class ---
    const dropdownContentClasses = "min-w-[180px] z-50 bg-glass-100 dark:bg-neutral-800/95 backdrop-blur-xl rounded-lg shadow-strong border border-black/10 dark:border-white/10 p-1 data-[state=open]:animate-slideUpAndFade data-[state=closed]:animate-slideDownAndFade";
    const datePickerContentClasses = "z-[60] p-0 border-0 shadow-none bg-transparent data-[state=open]:animate-slideUpAndFade data-[state=closed]:animate-slideDownAndFade"; // Date picker popover doesn't need extra styling


    if (!selectedTask) return null; // Render nothing if no task selected

    return (
        <>
            <motion.div key={selectedTask.id} // Animate based on task ID change
                        className={twMerge(
                            "border-l border-black/10 dark:border-white/10 w-[420px] shrink-0 h-full flex flex-col shadow-xl z-20",
                            "bg-glass-100 dark:bg-neutral-900/80 backdrop-blur-xl" // Semi-transparent background
                        )}
                        initial={{x: '100%'}} animate={{x: 0}} exit={{x: '100%'}}
                        transition={{duration: 0.3, ease: "easeOut"}}>

                {/* Header */}
                <div
                    className="px-3 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center flex-shrink-0 h-11 bg-glass-alt-100 dark:bg-neutral-800/70 backdrop-blur-lg">
                    <div className="w-20 flex justify-start">
                        {isTrash ? (
                            <Button variant="ghost" size="sm" icon="arrow-left" onClick={handleRestore}
                                    className="text-green-600 hover:bg-green-400/20 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-500/20 dark:hover:text-green-300 text-xs px-1.5"> Restore </Button>
                        ) : (
                            // Radix Dialog Trigger for delete confirmation
                            <Button variant="ghost" size="icon" icon="trash" onClick={openDeleteConfirm}
                                    className="text-red-600 hover:bg-red-400/20 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300 w-7 h-7"
                                    aria-label="Move task to Trash"/>
                        )}
                    </div>
                    <div className="flex-1 text-center h-4"></div>
                    {/* Spacer */}
                    <div className="w-20 flex justify-end">
                        <Button variant="ghost" size="icon" icon="x" onClick={handleClose}
                                aria-label="Close task details"
                                className="text-muted-foreground dark:text-neutral-400 hover:bg-black/15 dark:hover:bg-white/10 w-7 h-7"/>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 styled-scrollbar flex flex-col">
                    {/* Progress Indicator and Title */}
                    <div className="flex items-start space-x-3 mb-4 flex-shrink-0">
                        <ProgressIndicator
                            percentage={selectedTask.completionPercentage} isTrash={isTrash}
                            onClick={cycleCompletionPercentage} onKeyDown={handleProgressIndicatorKeyDown}
                            size={20} className="mt-[3px]" ariaLabelledby={`task-title-input-${selectedTask.id}`}
                        />
                        <input
                            ref={titleInputRef} type="text" value={localTitle} onChange={handleTitleChange}
                            onKeyDown={handleTitleKeyDown} onBlur={savePendingChanges}
                            className={titleInputClasses} placeholder="Task title..." disabled={isTrash}
                            aria-label="Task title" id={`task-title-input-${selectedTask.id}`}
                        />
                    </div>

                    {/* Metadata Section */}
                    <div
                        className="space-y-1.5 text-sm border-t border-b border-black/10 dark:border-white/10 py-2.5 my-4 flex-shrink-0">
                        {/* --- Progress Row (Using Radix Dropdown) --- */}
                        <MetaRow icon="circle-gauge" label="Progress" disabled={isTrash}>
                            <DropdownMenu.Root open={isProgressDropdownOpen} onOpenChange={setIsProgressDropdownOpen}>
                                <DropdownMenu.Trigger asChild disabled={isTrash}>
                                    <Button variant="ghost" size="sm"
                                            className={twMerge(
                                                "text-xs h-7 px-1.5 w-full text-left justify-start font-normal disabled:text-muted dark:disabled:text-neutral-500 disabled:line-through truncate hover:bg-black/10 dark:hover:bg-white/5 backdrop-blur-sm disabled:hover:!bg-transparent disabled:cursor-not-allowed",
                                                isCompleted ? "text-primary dark:text-primary-light" : "text-gray-700 dark:text-neutral-300"
                                            )}>
                                        {progressStatusText}
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content className={dropdownContentClasses} sideOffset={5} align="end">
                                        {progressMenuItems.map(item => (
                                            <RadixMenuItem
                                                key={item.label} icon={item.icon}
                                                selected={selectedTask?.completionPercentage === item.value || (selectedTask?.completionPercentage === null && item.value === null)}
                                                onSelect={() => handleProgressChange(item.value)}>
                                                {item.label}
                                            </RadixMenuItem>
                                        ))}
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </MetaRow>

                        {/* --- Due Date Row (Using Radix Popover) --- */}
                        <MetaRow icon="calendar" label="Due Date" disabled={isTrash}>
                            <Popover.Root open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <Popover.Trigger asChild disabled={isTrash}>
                                    <Button variant="ghost" size="sm"
                                            className={twMerge(
                                                "text-xs h-7 px-1.5 w-full text-left justify-start font-normal truncate hover:bg-black/10 dark:hover:bg-white/5 backdrop-blur-sm",
                                                displayDueDateForRender ? 'text-gray-700 dark:text-neutral-300' : 'text-muted-foreground dark:text-neutral-500',
                                                overdue && 'text-red-600 dark:text-red-400 font-medium',
                                                isTrash && 'text-muted dark:text-neutral-500 line-through !bg-transparent hover:!bg-transparent cursor-not-allowed',
                                                isCompleted && !isTrash && "line-through text-muted-foreground dark:text-neutral-500"
                                            )}>
                                        {displayDueDateForRender && isValid(displayDueDateForRender) ? formatRelativeDate(displayDueDateForRender) : 'Set date'}
                                    </Button>
                                </Popover.Trigger>
                                <Popover.Portal>
                                    <Popover.Content
                                        className={datePickerContentClasses}
                                        sideOffset={5}
                                        align="end"
                                        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
                                    >
                                        {/* Render the CONTENT component, passing close function */}
                                        <CustomDatePickerContent
                                            initialDate={displayDueDateForPicker}
                                            onSelect={handleDatePickerSelect}
                                            closePopover={closeDatePickerPopover}
                                        />
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                        </MetaRow>

                        {/* --- List Row (Using Radix Dropdown) --- */}
                        <MetaRow icon="list" label="List" disabled={isTrash}>
                            <DropdownMenu.Root open={isListDropdownOpen} onOpenChange={setIsListDropdownOpen}>
                                <DropdownMenu.Trigger asChild disabled={isTrash}>
                                    <Button variant="ghost" size="sm"
                                            className="text-xs h-7 px-1.5 w-full text-left justify-start text-gray-700 dark:text-neutral-300 font-normal disabled:text-muted dark:disabled:text-neutral-500 disabled:line-through truncate hover:bg-black/10 dark:hover:bg-white/5 backdrop-blur-sm disabled:hover:!bg-transparent disabled:cursor-not-allowed">
                                        {displayList}
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                        className={twMerge(dropdownContentClasses, "max-h-48 overflow-y-auto styled-scrollbar-thin")}
                                        sideOffset={5} align="end">
                                        <DropdownMenu.RadioGroup value={displayList} onValueChange={handleListChange}>
                                            {availableLists.map(list => (
                                                <DropdownMenu.RadioItem
                                                    key={list} value={list}
                                                    className={twMerge(
                                                        "relative flex cursor-pointer select-none items-center rounded-[3px] px-2.5 py-1 text-sm outline-none transition-colors data-[disabled]:pointer-events-none h-7",
                                                        "focus:bg-black/15 data-[highlighted]:bg-black/15 dark:focus:bg-white/10 dark:data-[highlighted]:bg-white/10",
                                                        "data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary data-[state=checked]:font-medium data-[highlighted]:bg-primary/25 dark:data-[state=checked]:bg-primary/30 dark:data-[state=checked]:text-primary-light dark:data-[highlighted]:bg-primary/40",
                                                        "text-gray-700 data-[highlighted]:text-gray-800 dark:text-neutral-300 dark:data-[highlighted]:text-neutral-100",
                                                        "data-[disabled]:opacity-50"
                                                    )}>
                                                    <Icon name={list === 'Inbox' ? 'inbox' : 'list'} size={14}
                                                          className="mr-1.5 flex-shrink-0 opacity-70"/>
                                                    {list}
                                                </DropdownMenu.RadioItem>
                                            ))}
                                        </DropdownMenu.RadioGroup>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </MetaRow>


                        {/* --- Priority Row (Using Radix Dropdown) --- */}
                        <MetaRow icon="flag" label="Priority" disabled={isTagHandlingDisabled}>
                            <DropdownMenu.Root open={isPriorityDropdownOpen} onOpenChange={setIsPriorityDropdownOpen}>
                                <DropdownMenu.Trigger asChild disabled={isTagHandlingDisabled}>
                                    <Button variant="ghost" size="sm"
                                            className={twMerge(
                                                "text-xs h-7 px-1.5 w-full text-left justify-start font-normal disabled:text-muted dark:disabled:text-neutral-500 disabled:line-through truncate hover:bg-black/10 dark:hover:bg-white/5 backdrop-blur-sm",
                                                displayPriority ? priorityMap[displayPriority]?.iconColor : 'text-gray-700 dark:text-neutral-300',
                                                isTagHandlingDisabled && 'hover:!bg-transparent cursor-not-allowed'
                                            )}
                                            icon={displayPriority ? 'flag' : undefined}>
                                        {displayPriority ? `P${displayPriority} ${priorityMap[displayPriority]?.label}` : 'Set Priority'}
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content className={dropdownContentClasses} sideOffset={5} align="end">
                                        <DropdownMenu.RadioGroup value={String(displayPriority ?? 'none')}
                                                                 onValueChange={(value) => handlePriorityChange(value === 'none' ? null : Number(value))}>
                                            {[null, 1, 2, 3, 4].map(p => (
                                                <DropdownMenu.RadioItem
                                                    key={p ?? 'none'} value={String(p ?? 'none')}
                                                    className={twMerge(
                                                        "relative flex cursor-pointer select-none items-center rounded-[3px] px-2.5 py-1 text-sm outline-none transition-colors data-[disabled]:pointer-events-none h-7",
                                                        "focus:bg-black/15 data-[highlighted]:bg-black/15 dark:focus:bg-white/10 dark:data-[highlighted]:bg-white/10",
                                                        p && priorityMap[p]?.iconColor, // Apply color to text
                                                        "data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary data-[state=checked]:font-medium data-[highlighted]:bg-primary/25 dark:data-[state=checked]:bg-primary/30 dark:data-[state=checked]:text-primary-light dark:data-[highlighted]:bg-primary/40",
                                                        !p && "text-gray-700 data-[highlighted]:text-gray-800 dark:text-neutral-300 dark:data-[highlighted]:text-neutral-100",
                                                        "data-[disabled]:opacity-50"
                                                    )}>
                                                    {p &&
                                                        <Icon name="flag" size={14} className="mr-1.5 flex-shrink-0"/>}
                                                    {p ? `P${p} ${priorityMap[p]?.label}` : 'None'}
                                                </DropdownMenu.RadioItem>
                                            ))}
                                        </DropdownMenu.RadioGroup>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </MetaRow>


                        {/* --- Tags Row --- */}
                        <MetaRow icon="tag" label="Tags" disabled={isTagHandlingDisabled}>
                            <div className={tagInputContainerClasses} onClick={handleTagContainerClick}
                                 aria-disabled={isTagHandlingDisabled}>
                                {tagsArray.map((tag) => (
                                    <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)}
                                             disabled={isTagHandlingDisabled}/>
                                ))}
                                <input
                                    ref={tagInputElementRef} type="text" value={tagInputValue}
                                    onChange={(e) => setTagInputValue(e.target.value)} onKeyDown={handleTagInputKeyDown}
                                    onBlur={handleTagInputBlur}
                                    placeholder={tagsArray.length === 0 ? "Add tag..." : ""}
                                    className={twMerge(
                                        "flex-1 text-xs border-none focus:ring-0 bg-transparent p-0 m-0 h-[22px] min-w-[60px] self-center",
                                        "placeholder:text-muted dark:placeholder:text-neutral-500 placeholder:font-normal",
                                        "disabled:bg-transparent disabled:cursor-not-allowed",
                                        "dark:text-neutral-300" // Input text color
                                    )}
                                    disabled={isTagHandlingDisabled}
                                    aria-label="Add a new tag (use comma or Enter to confirm)"
                                />
                            </div>
                        </MetaRow>
                    </div>

                    {/* Content Editor */}
                    <div className="task-detail-content-editor flex-1 min-h-[150px] flex flex-col mb-4">
                        <CodeMirrorEditor
                            ref={editorRef} value={localContent} onChange={handleContentChange}
                            onBlur={savePendingChanges} // Force save on blur
                            placeholder="Add notes, links, or details here... Markdown is supported."
                            className={editorClasses} readOnly={isTrash}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-4 py-2 border-t border-black/10 dark:border-white/10 flex justify-end items-center flex-shrink-0 h-9 bg-glass-alt-200 dark:bg-neutral-800/80 backdrop-blur-lg">
                    <div className="text-[11px] text-muted-foreground dark:text-neutral-400 space-x-4">
                        <span>Created: {displayCreatedAt}</span>
                        <span>Updated: {displayUpdatedAt}</span>
                    </div>
                </div>
            </motion.div>

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModalRadix
                isOpen={isDeleteDialogOpen}
                onClose={closeDeleteConfirm}
                onConfirm={confirmDelete}
                taskTitle={selectedTask.title || 'Untitled Task'}
            />
        </>
    );
};
TaskDetail.displayName = 'TaskDetail';
export default TaskDetail;