// src/components/tasks/TaskDetail.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {selectedTaskAtom, selectedTaskIdAtom, tasksAtom, userListNamesAtom} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, {CodeMirrorEditorRef} from '../common/CodeMirrorEditor';
import {formatDateTime, formatRelativeDate, isOverdue, isValid, safeParseDate, startOfDay} from '@/utils/dateUtils';
import {Task} from '@/types';
import {motion} from 'framer-motion'; // Keep for entry/exit animation
import {twMerge} from 'tailwind-merge';
import CustomDatePickerPopover from '../common/CustomDatePickerPopover'; // Radix-based Popover
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from "@/components/common/Dropdown"; // Radix-based Dropdown
import MetaRow from "@/components/tasks/MetaRow";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal"; // Radix-based Dialog
import {ProgressIndicator} from './TaskItem'; // Use the enhanced indicator
import {IconName} from "@/components/common/IconMap";


// --- Helper TagPill Component (Refined Styling) ---
interface TagPillProps {
    tag: string;
    onRemove: () => void;
    disabled?: boolean;
}

const TagPill: React.FC<TagPillProps> = React.memo(({tag, onRemove, disabled}) => (
    <span
        className={twMerge(
            // Base styling
            "inline-flex items-center bg-black/10 dark:bg-white/10 text-gray-700 dark:text-neutral-300 rounded-sm pl-1.5 pr-1 py-0.5 text-xs mr-1 mb-1 group/pill whitespace-nowrap",
            "transition-colors duration-100 ease-apple",
            // Disabled state
            disabled && "opacity-70 cursor-not-allowed",
            // Hover state for remove button visibility
            !disabled && "hover:bg-black/20 dark:hover:bg-white/20"
        )}
        aria-label={`Tag: ${tag}${disabled ? ' (disabled)' : ''}`}
    >
        {tag}
        {!disabled && (
            // Remove button styling
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent container click
                    onRemove();
                }}
                className="ml-1 text-gray-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-500 opacity-0 group-hover/pill:opacity-100 focus:opacity-100 focus:outline-none rounded-full p-0.5 -mr-0.5 flex items-center justify-center transition-opacity"
                aria-label={`Remove tag ${tag}`}
                tabIndex={-1} // Don't include in normal tab order
            >
                <Icon name="x" size={10} strokeWidth={3}/>
            </button>
        )}
    </span>
));
TagPill.displayName = 'TagPill';


// --- TaskDetail Component ---
const TaskDetail: React.FC = () => {
    // Hooks and state setup (Mostly unchanged logic)
    const [selectedTask] = useAtom(selectedTaskAtom);
    const setTasks = useSetAtom(tasksAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const [localTitle, setLocalTitle] = useState('');
    const [localContent, setLocalContent] = useState('');
    const [localDueDate, setLocalDueDate] = useState<Date | undefined>(undefined);
    const [localTags, setLocalTags] = useState('');
    const [tagInputValue, setTagInputValue] = useState('');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const titleInputRef = useRef<HTMLInputElement>(null);
    const tagInputElementRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const latestTitleRef = useRef(localTitle);
    const latestContentRef = useRef(localContent);
    const latestTagsRef = useRef(localTags);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasUnsavedChangesRef = useRef(false);
    const isMountedRef = useRef(true);

    // Mount/Unmount Effect (Unchanged)
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
                // Optionally trigger one last save on unmount
                // savePendingChanges(); // Be cautious here
            }
        };
    }, []);

    // Debounced Save Logic (Unchanged)
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
        const currentDueDate = localDueDate;
        const currentTagsString = latestTagsRef.current;

        const processedTitle = currentTitle.trim();
        const processedDueDate = currentDueDate && isValid(currentDueDate) ? currentDueDate.getTime() : null;
        const processedTags = currentTagsString.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

        const originalTaskState = selectedTask;
        const changesToSave: Partial<Task> = {};

        if (processedTitle !== originalTaskState.title) changesToSave.title = processedTitle;
        if (currentContent !== (originalTaskState.content || '')) changesToSave.content = currentContent;
        const originalDueTime = originalTaskState.dueDate ?? null;
        if (processedDueDate !== originalDueTime) changesToSave.dueDate = processedDueDate;

        const originalTagsSorted = (originalTaskState.tags ?? []).slice().sort();
        const processedTagsSorted = processedTags.slice().sort();
        if (JSON.stringify(processedTagsSorted) !== JSON.stringify(originalTagsSorted)) changesToSave.tags = processedTags;

        if (Object.keys(changesToSave).length > 0) {
            changesToSave.updatedAt = Date.now();
            setTasks(prevTasks =>
                prevTasks.map((t) => {
                    if (t.id === originalTaskState.id) {
                        // Preserve existing properties not being changed
                        return {...t, ...changesToSave};
                    }
                    return t;
                })
            );
            // console.log("Saved changes for task:", selectedTask.id, changesToSave);
        }
        hasUnsavedChangesRef.current = false;

    }, [selectedTask, setTasks, localDueDate]);

    // Sync Local State from Atom (Minor adjustments for focus logic)
    useEffect(() => {
        if (selectedTask) {
            const activeEl = document.activeElement;
            const isTitleFocused = titleInputRef.current === activeEl;
            const isTagsFocused = tagInputElementRef.current === activeEl;
            const isContentFocused = editorRef.current?.getView()?.hasFocus ?? false;

            // Only update if not focused
            if (!isTitleFocused) {
                setLocalTitle(selectedTask.title);
                latestTitleRef.current = selectedTask.title;
            }
            if (!isContentFocused) {
                const taskContent = selectedTask.content || '';
                setLocalContent(taskContent);
                latestContentRef.current = taskContent;
            }
            if (!isTagsFocused) {
                const taskTagsString = (selectedTask.tags ?? []).join(', ');
                setLocalTags(taskTagsString);
                latestTagsRef.current = taskTagsString;
                setTagInputValue(''); // Clear any leftover input
            }

            // Always sync due date display
            const taskDueDate = safeParseDate(selectedTask.dueDate);
            const validTaskDueDate = taskDueDate && isValid(taskDueDate) ? taskDueDate : undefined;
            setLocalDueDate(validTaskDueDate);

            // Clear pending save and unsaved flag
            hasUnsavedChangesRef.current = false;
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }

            // Auto-focus title if new task (title is empty and nothing else is focused)
            if (selectedTask.title === '' && !isTitleFocused && !isContentFocused && !isTagsFocused) {
                const timer = setTimeout(() => {
                    if (isMountedRef.current && titleInputRef.current) {
                        titleInputRef.current.focus();
                        titleInputRef.current.select();
                    }
                }, 350); // Delay slightly for animation/render
                return () => clearTimeout(timer);
            }

        } else {
            // Clear local state if no task is selected
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
            setIsDeleteConfirmOpen(false); // Close delete confirm if open
        }
        // Only re-sync when the selected task ID changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask?.id]);


    // Update Refs on Local State Change (Unchanged)
    useEffect(() => {
        latestTitleRef.current = localTitle;
    }, [localTitle]);
    useEffect(() => {
        latestContentRef.current = localContent;
    }, [localContent]);
    useEffect(() => {
        latestTagsRef.current = localTags;
    }, [localTags]);

    // Debounced Save Trigger (Unchanged)
    const triggerSave = useCallback(() => {
        if (!selectedTask || !isMountedRef.current) return;
        hasUnsavedChangesRef.current = true;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            savePendingChanges();
        }, 600); // 600ms debounce
    }, [selectedTask, savePendingChanges]);

    // Direct Update Function (Unchanged)
    const updateTask = useCallback((updates: Partial<Omit<Task, 'groupCategory' | 'completedAt' | 'completed'>>) => {
        if (!selectedTask || !isMountedRef.current) return;
        // Save any pending text/tag changes immediately before applying direct updates
        if (hasUnsavedChangesRef.current) {
            savePendingChanges();
        }
        // Clear any existing save timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        hasUnsavedChangesRef.current = false; // Reset flag after potential save

        setTasks(prevTasks => prevTasks.map(t => {
            if (t.id === selectedTask.id) {
                return {...t, ...updates, updatedAt: Date.now()};
            }
            return t;
        }));
    }, [selectedTask, setTasks, savePendingChanges]);


    // --- Event Handlers ---
    const handleClose = useCallback(() => {
        savePendingChanges(); // Save any pending changes before closing
        setSelectedTaskId(null);
    }, [setSelectedTaskId, savePendingChanges]);

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTitle(e.target.value);
        triggerSave();
    }, [triggerSave]);

    const handleContentChange = useCallback((newValue: string) => {
        setLocalContent(newValue);
        triggerSave();
    }, [triggerSave]);

    // Date picker selection (now uses the callback from the Popover component)
    const handleDatePickerSelect = useCallback((date: Date | undefined) => {
        const newDate = date && isValid(date) ? startOfDay(date) : undefined;
        setLocalDueDate(newDate); // Update local state for immediate visual feedback
        updateTask({dueDate: newDate ? newDate.getTime() : null}); // Update the atom state
        // Popover closes itself via its internal logic or the OK/Clear buttons
    }, [updateTask]);

    // List change (uses callback from Radix DropdownMenu)
    const handleListChange = useCallback((newList: string) => {
        updateTask({list: newList});
        // Dropdown closes itself
    }, [updateTask]);

    // Priority change (uses callback from Radix DropdownMenu)
    const handlePriorityChange = useCallback((newPriority: number | null) => {
        updateTask({priority: newPriority});
        // Dropdown closes itself
    }, [updateTask]);

    // Cycle completion (for direct click on indicator)
    const cycleCompletionPercentage = useCallback(() => {
        if (!selectedTask || selectedTask.list === 'Trash') return;
        const currentPercentage = selectedTask.completionPercentage ?? 0;
        let nextPercentage: number | null = null;
        if (currentPercentage === 100) nextPercentage = null;
        else nextPercentage = 100;
        updateTask({completionPercentage: nextPercentage});
        if (nextPercentage === 100) setSelectedTaskId(null); // Deselect if completed
    }, [selectedTask, updateTask, setSelectedTaskId]);

    // Handle progress change from dropdown menu
    const handleProgressChange = useCallback((newPercentage: number | null) => {
        updateTask({completionPercentage: newPercentage});
        if (newPercentage === 100) setSelectedTaskId(null); // Deselect if completed
        // Dropdown closes itself
    }, [updateTask, setSelectedTaskId]);

    // Keyboard interaction for progress indicator
    const handleProgressIndicatorKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            cycleCompletionPercentage();
        }
    }, [cycleCompletionPercentage]);

    // Delete/Restore Handling (Open Radix Dialog)
    const openDeleteConfirm = useCallback(() => setIsDeleteConfirmOpen(true), []);
    const closeDeleteConfirm = useCallback(() => setIsDeleteConfirmOpen(false), []); // For manual close if needed
    const confirmDelete = useCallback(() => {
        if (!selectedTask) return;
        updateTask({list: 'Trash', completionPercentage: null}); // Reset progress when trashing
        setSelectedTaskId(null); // Deselect after trashing
        // No need to close modal here, Radix Dialog handles it via onConfirm prop potentially
    }, [selectedTask, updateTask, setSelectedTaskId]);

    const handleRestore = useCallback(() => {
        if (!selectedTask || selectedTask.list !== 'Trash') return;
        updateTask({list: 'Inbox'}); // Restore to Inbox by default
    }, [selectedTask, updateTask]);

    // Input KeyDown Handlers
    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            savePendingChanges(); // Save immediately on Enter
            titleInputRef.current?.blur(); // Blur input
        } else if (e.key === 'Escape' && selectedTask) {
            e.preventDefault();
            // Revert if changed
            if (localTitle !== selectedTask.title) {
                setLocalTitle(selectedTask.title);
                latestTitleRef.current = selectedTask.title;
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                hasUnsavedChangesRef.current = false;
            }
            titleInputRef.current?.blur(); // Blur input
        }
    }, [selectedTask, localTitle, savePendingChanges]);


    // --- Tag Input Specific Logic (Unchanged logic, styling adjusted) ---
    const tagsArray = useMemo(() => localTags.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i), [localTags]);
    const isTrash = useMemo(() => selectedTask?.list === 'Trash', [selectedTask?.list]);
    const isCompleted = useMemo(() => (selectedTask?.completionPercentage ?? 0) === 100 && !isTrash, [selectedTask?.completionPercentage, isTrash]);
    const isTagHandlingDisabled = useMemo(() => isTrash || isCompleted, [isTrash, isCompleted]);

    const addTag = useCallback((tagToAdd: string) => {
        const trimmedTag = tagToAdd.trim();
        if (!trimmedTag || isTagHandlingDisabled) return;
        const currentTags = localTags.split(',').map(t => t.trim()).filter(Boolean);
        if (currentTags.includes(trimmedTag)) {
            setTagInputValue('');
            return; // Clear input even if duplicate
        }
        const newTagsString = [...currentTags, trimmedTag].join(', ');
        setLocalTags(newTagsString);
        setTagInputValue('');
        triggerSave();
    }, [localTags, isTagHandlingDisabled, triggerSave]);

    const removeTag = useCallback((tagToRemove: string) => {
        if (isTagHandlingDisabled) return;
        const newTagsArray = tagsArray.filter(t => t !== tagToRemove);
        setLocalTags(newTagsArray.join(', '));
        triggerSave();
        tagInputElementRef.current?.focus();
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
            addTag(value); // Adds and triggers save
        }
        // Also ensure any other pending changes are saved if focus leaves entirely
        // savePendingChanges(); // Be careful not to cause infinite loops with focus changes
    }, [tagInputValue, addTag, isTagHandlingDisabled]); // Removed savePendingChanges to avoid potential loops

    const handleTagContainerClick = useCallback(() => {
        if (!isTagHandlingDisabled) tagInputElementRef.current?.focus();
    }, [isTagHandlingDisabled]);

    // Memos for Display Logic (Adjusted styling references)
    const priorityMap: Record<number, { label: string; iconColor: string }> = useMemo(() => ({
        1: {label: 'High', iconColor: 'text-red-500 dark:text-red-400'},
        2: {label: 'Medium', iconColor: 'text-orange-500 dark:text-orange-400'},
        3: {label: 'Low', iconColor: 'text-blue-500 dark:text-blue-400'},
        4: {label: 'Lowest', iconColor: 'text-gray-500 dark:text-gray-400'},
    }), []);

    const displayDueDateForPicker = useMemo(() => localDueDate, [localDueDate]); // Use local state for picker default
    const displayDueDateForRender = useMemo(() => localDueDate ?? safeParseDate(selectedTask?.dueDate), [localDueDate, selectedTask?.dueDate]);
    const overdue = useMemo(() => displayDueDateForRender && isValid(displayDueDateForRender) && !isCompleted && !isTrash && isOverdue(displayDueDateForRender), [displayDueDateForRender, isCompleted, isTrash]);
    const displayPriority = selectedTask?.priority;
    const displayList = selectedTask?.list;
    const displayCreatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.createdAt) : '', [selectedTask?.createdAt]);
    const displayUpdatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.updatedAt) : '', [selectedTask?.updatedAt]);
    const availableLists = useMemo(() => userLists.filter(l => l !== 'Trash'), [userLists]);

    // Refined ClassNames
    const titleInputClasses = useMemo(() => twMerge(
        "w-full text-lg font-semibold border-none focus:ring-0 focus:outline-none bg-transparent p-0 m-0 leading-tight",
        "placeholder:text-muted-foreground dark:placeholder:text-neutral-500 placeholder:font-normal",
        (isCompleted || isTrash) && "line-through text-muted-foreground dark:text-neutral-500",
        "text-gray-900 dark:text-gray-50", // Ensure text color contrast
        "task-detail-title-input" // Keep custom class if needed elsewhere
    ), [isCompleted, isTrash]);

    const editorClasses = useMemo(() => twMerge(
        "!min-h-[150px] h-full text-sm",
        "!bg-transparent", // Ensure CodeMirror bg is transparent
        (isCompleted || isTrash) && "opacity-70",
        isTrash && "pointer-events-none"
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
        // Base layout
        "flex items-center flex-wrap bg-transparent rounded-sm w-full min-h-[28px] px-1.5 py-1 cursor-text", // Adjusted padding, cursor
        // Interaction styles
        "transition-colors duration-150 ease-apple",
        // Disabled state
        isTagHandlingDisabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-black/10 dark:hover:bg-white/10 focus-within:bg-black/10 dark:focus-within:bg-white/10" // Subtle hover/focus-within
    ), [isTagHandlingDisabled]);

    // Return null if no task is selected
    if (!selectedTask) return null;

    return (
        <>
            {/* Main container with Framer Motion for entry/exit */}
            <motion.div
                key={selectedTask.id} // Key ensures animation runs when task changes
                className={twMerge(
                    "border-l border-black/10 dark:border-white/10 w-[420px] shrink-0 h-full flex flex-col shadow-xl z-20",
                    "bg-glass-100 dark:bg-neutral-800/80 backdrop-blur-xl" // Adjusted glass effect
                )}
                initial={{x: '100%'}}
                animate={{x: 0}}
                exit={{x: '100%'}}
                transition={{duration: 0.3, ease: "easeOut"}} // Keep existing smooth transition
            >
                {/* Header */}
                <div
                    className="px-3 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center flex-shrink-0 h-11 bg-neutral-100/60 dark:bg-neutral-900/60 backdrop-blur-lg">
                    <div className="w-20 flex justify-start">
                        {isTrash ? (
                            // Restore Button
                            <Button variant="ghost" size="sm" icon="arrow-left" onClick={handleRestore}
                                    className="text-green-600 dark:text-green-500 hover:bg-green-400/10 dark:hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-400 text-xs px-1.5">
                                Restore
                            </Button>
                        ) : (
                            // Delete Button (triggers dialog)
                            <Button variant="ghost" size="icon" icon="trash" onClick={openDeleteConfirm}
                                    className="text-red-600 dark:text-red-500 hover:bg-red-400/10 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 w-7 h-7"
                                    aria-label="Move task to Trash"/>
                        )}
                    </div>
                    <div className="flex-1 text-center h-4"></div>
                    {/* Spacer */}
                    <div className="w-20 flex justify-end">
                        {/* Close Button */}
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
                            taskId={selectedTask.id} // Pass task ID
                            percentage={selectedTask.completionPercentage}
                            isTrash={isTrash}
                            onClick={cycleCompletionPercentage}
                            onKeyDown={handleProgressIndicatorKeyDown}
                            size={20}
                            className="mt-[3px]" // Align with baseline of title
                            ariaLabelledby={`task-title-input-${selectedTask.id}`}
                        />
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={localTitle}
                            onChange={handleTitleChange}
                            onKeyDown={handleTitleKeyDown}
                            onBlur={savePendingChanges} // Save on blur
                            className={titleInputClasses}
                            placeholder="Task title..."
                            disabled={isTrash}
                            aria-label="Task title"
                            id={`task-title-input-${selectedTask.id}`}
                        />
                    </div>

                    {/* Metadata Section */}
                    <div
                        className="space-y-1 border-t border-b border-black/10 dark:border-white/10 py-2.5 my-4 flex-shrink-0">
                        {/* Progress Row (using Radix Dropdown) */}
                        <MetaRow icon="circle-gauge" label="Progress" disabled={isTrash}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={isTrash}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={twMerge(
                                            "text-xs h-7 px-1.5 w-full text-left justify-start font-normal truncate hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-sm",
                                            isCompleted ? "text-primary" : "text-gray-700 dark:text-gray-200",
                                            isTrash && "text-muted line-through !bg-transparent hover:!bg-transparent cursor-not-allowed disabled:opacity-60" // Ensure disabled styles apply
                                        )}
                                        disabled={isTrash} // Explicitly disable button
                                    >
                                        {progressStatusText}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuRadioGroup
                                        value={String(selectedTask.completionPercentage ?? 'null')}
                                        onValueChange={(val) => handleProgressChange(val === 'null' ? null : Number(val))}
                                    >
                                        {progressMenuItems.map(item => (
                                            <DropdownMenuRadioItem key={item.label}
                                                                   value={String(item.value ?? 'null')}>
                                                <Icon name={item.icon} size={14}
                                                      className="mr-2 flex-shrink-0 opacity-80" aria-hidden="true"/>
                                                {item.label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </MetaRow>

                        {/* Due Date Row (using Radix Popover) */}
                        <MetaRow icon="calendar" label="Due Date" disabled={isTrash}>
                            <CustomDatePickerPopover
                                initialDate={displayDueDateForPicker}
                                onSelect={handleDatePickerSelect}
                                align="end"
                            >
                                {/* Trigger Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isTrash}
                                    className={twMerge(
                                        "text-xs h-7 px-1.5 w-full text-left justify-start font-normal truncate hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-sm",
                                        displayDueDateForRender ? 'text-gray-700 dark:text-gray-200' : 'text-muted-foreground dark:text-neutral-400',
                                        overdue && 'text-red-600 dark:text-red-400 font-medium',
                                        isTrash && 'text-muted line-through !bg-transparent hover:!bg-transparent cursor-not-allowed disabled:opacity-60',
                                        isCompleted && !isTrash && "line-through text-muted-foreground dark:text-neutral-500"
                                    )}
                                >
                                    {displayDueDateForRender && isValid(displayDueDateForRender)
                                        ? formatRelativeDate(displayDueDateForRender)
                                        : 'Set date'}
                                </Button>
                            </CustomDatePickerPopover>
                        </MetaRow>

                        {/* List Row (using Radix Dropdown) */}
                        <MetaRow icon="list" label="List" disabled={isTrash}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={isTrash}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isTrash}
                                        className={twMerge(
                                            "text-xs h-7 px-1.5 w-full text-left justify-start text-gray-700 dark:text-gray-200 font-normal truncate hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-sm",
                                            isTrash && "text-muted line-through !bg-transparent hover:!bg-transparent cursor-not-allowed disabled:opacity-60"
                                        )}
                                    >
                                        {displayList}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end"
                                                     className="max-h-48 overflow-y-auto styled-scrollbar-thin">
                                    <DropdownMenuRadioGroup value={displayList} onValueChange={handleListChange}>
                                        {availableLists.map(list => (
                                            <DropdownMenuRadioItem key={list} value={list}>
                                                <Icon name={list === 'Inbox' ? 'inbox' : 'list'} size={14}
                                                      className="mr-2 opacity-70"/>
                                                {list}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </MetaRow>

                        {/* Priority Row (using Radix Dropdown) */}
                        <MetaRow icon="flag" label="Priority" disabled={isTagHandlingDisabled}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={isTagHandlingDisabled}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isTagHandlingDisabled}
                                        icon={displayPriority ? 'flag' : undefined}
                                        className={twMerge(
                                            "text-xs h-7 px-1.5 w-full text-left justify-start font-normal truncate hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-sm",
                                            displayPriority ? priorityMap[displayPriority]?.iconColor : 'text-gray-700 dark:text-gray-200',
                                            isTagHandlingDisabled && '!bg-transparent hover:!bg-transparent cursor-not-allowed disabled:opacity-60'
                                        )}
                                    >
                                        {displayPriority ? `P${displayPriority} ${priorityMap[displayPriority]?.label}` : 'Set Priority'}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuRadioGroup value={String(displayPriority ?? 'null')}
                                                            onValueChange={(val) => handlePriorityChange(val === 'null' ? null : Number(val))}>
                                        {[null, 1, 2, 3, 4].map(p => (
                                            <DropdownMenuRadioItem key={p ?? 'none'} value={String(p ?? 'null')}>
                                                {p ? (
                                                    <>
                                                        <Icon name="flag" size={14}
                                                              className={twMerge("mr-1.5 flex-shrink-0", priorityMap[p]?.iconColor)}/>
                                                        P{p} {priorityMap[p]?.label}
                                                    </>
                                                ) : (
                                                    'None'
                                                )}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </MetaRow>

                        {/* Tags Row (Custom Input) */}
                        <MetaRow icon="tag" label="Tags" disabled={isTagHandlingDisabled}>
                            <div
                                className={tagInputContainerClasses}
                                onClick={handleTagContainerClick}
                                aria-disabled={isTagHandlingDisabled}
                            >
                                {/* Render existing tags */}
                                {tagsArray.map((tag) => (
                                    <TagPill
                                        key={tag} tag={tag}
                                        onRemove={() => removeTag(tag)}
                                        disabled={isTagHandlingDisabled}
                                    />
                                ))}
                                {/* Input for new tags */}
                                <input
                                    ref={tagInputElementRef}
                                    type="text"
                                    value={tagInputValue}
                                    onChange={(e) => setTagInputValue(e.target.value)}
                                    onKeyDown={handleTagInputKeyDown}
                                    onBlur={handleTagInputBlur}
                                    placeholder={tagsArray.length === 0 ? "Add tag..." : ""}
                                    className={twMerge(
                                        // Base input styles
                                        "flex-1 text-xs border-none focus:ring-0 bg-transparent p-0 m-0 h-[22px] min-w-[60px] self-center outline-none",
                                        "placeholder:text-muted dark:placeholder:text-neutral-500 placeholder:font-normal",
                                        "text-gray-800 dark:text-gray-100", // Text color
                                        // Disabled state
                                        "disabled:bg-transparent disabled:cursor-not-allowed"
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
                            ref={editorRef}
                            value={localContent}
                            onChange={handleContentChange}
                            onBlur={savePendingChanges} // Save on blur
                            placeholder="Add notes, links, or details here... Markdown is supported."
                            className={editorClasses} // Pass refined classes
                            readOnly={isTrash}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-4 py-2 border-t border-black/10 dark:border-white/10 flex justify-end items-center flex-shrink-0 h-9 bg-neutral-100/70 dark:bg-neutral-900/70 backdrop-blur-lg">
                    <div className="text-[11px] text-muted-foreground dark:text-neutral-400 space-x-4">
                        <span>Created: {displayCreatedAt}</span>
                        <span>Updated: {displayUpdatedAt}</span>
                    </div>
                </div>
            </motion.div>

            {/* Delete Confirmation Modal (Uses Radix Dialog) */}
            <ConfirmDeleteModal
                isOpen={isDeleteConfirmOpen}
                onClose={closeDeleteConfirm}
                onConfirm={confirmDelete}
                taskTitle={selectedTask.title || 'Untitled Task'}
            />
        </>
    );
};
TaskDetail.displayName = 'TaskDetail';
export default TaskDetail;