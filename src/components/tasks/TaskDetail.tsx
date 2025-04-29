// src/components/tasks/TaskDetail.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {selectedTaskAtom, selectedTaskIdAtom, tasksAtom, userListNamesAtom} from '@/store/atoms';
import {Task} from '@/types';
import {cn} from '@/lib/utils';
import {formatDateTime, formatRelativeDate, isOverdue, isValid, safeParseDate, startOfDay} from '@/lib/utils/dateUtils';
import Icon from '../common/Icon';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label'; // Use Label
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import CodeMirrorEditor, {CodeMirrorEditorRef} from '../common/CodeMirrorEditor';
import CustomDatePickerPopover from "@/components/common/CustomDatePickerPopover"; // Use refactored picker
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal"; // Use refactored dialog
import {IconName} from "@/components/common/IconMap";
import {motion} from 'framer-motion';
import {ProgressIndicator} from './TaskItem'; // Reuse the visual indicator


// Helper TagPill Component (Refined Styling)
interface TagPillProps {
    tag: string;
    onRemove: () => void;
    disabled?: boolean;
}

const TagPill: React.FC<TagPillProps> = React.memo(({tag, onRemove, disabled}) => (
    <Badge
        variant="secondary" // Use secondary badge style
        className={cn(
            "inline-flex items-center rounded-sm pl-1.5 pr-1 py-0.5 text-xs mr-1 mb-1 group/pill whitespace-nowrap h-5",
            "transition-colors duration-100 ease-apple",
            disabled ? "opacity-70 cursor-not-allowed" : "hover:bg-muted/80", // Adjust hover
            "border border-border/50" // Add subtle border
        )}
        aria-label={`Tag: ${tag}${disabled ? ' (disabled)' : ''}`}
    >
        <span className="truncate">{tag}</span>
        {!disabled && (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className={cn(
                    "ml-1 text-muted-foreground hover:text-destructive opacity-50 group-hover/pill:opacity-100",
                    "focus:outline-none rounded-full p-0.5 -mr-0.5 flex items-center justify-center focus-visible:ring-1 focus-visible:ring-ring"
                )}
                aria-label={`Remove tag ${tag}`}
                tabIndex={-1}
            >
                <Icon name="x" size={10} strokeWidth={3}/>
            </button>
        )}
    </Badge>
));
TagPill.displayName = 'TagPill';


// TaskDetail Component Refactored
const TaskDetail: React.FC = () => {
    // Hooks and state setup (mostly unchanged)
    const [selectedTask] = useAtom(selectedTaskAtom);
    const setTasks = useSetAtom(tasksAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const [localTitle, setLocalTitle] = useState('');
    const [localContent, setLocalContent] = useState('');
    const [localDueDate, setLocalDueDate] = useState<Date | undefined>(undefined);
    const [localTags, setLocalTags] = useState('');
    const [tagInputValue, setTagInputValue] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const titleInputRef = useRef<HTMLInputElement>(null);
    const tagInputElementRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const latestTitleRef = useRef(localTitle);
    const latestContentRef = useRef(localContent);
    const latestTagsRef = useRef(localTags);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasUnsavedChangesRef = useRef(false);
    const isMountedRef = useRef(true);


    // Mount/Unmount Effect (unchanged)
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);
    // Debounced Save Logic (unchanged)
    const savePendingChanges = useCallback(() => { /* ... */
        if (!selectedTask || !hasUnsavedChangesRef.current || !isMountedRef.current) return;
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
            setTasks(prevTasks => prevTasks.map(t => (t.id === originalTaskState.id) ? {...t, ...changesToSave} : t));
        }
        hasUnsavedChangesRef.current = false;
    }, [selectedTask, setTasks, localDueDate]);
    // Sync Local State from Atom (unchanged)
    useEffect(() => { /* ... */
        if (selectedTask) {
            const isTitleFocused = titleInputRef.current === document.activeElement;
            const isTagsFocused = tagInputElementRef.current === document.activeElement;
            const isContentFocused = editorRef.current?.getView()?.hasFocus ?? false;

            if (!isTitleFocused) {
                setLocalTitle(selectedTask.title);
                latestTitleRef.current = selectedTask.title;
            }
            const taskContent = selectedTask.content || '';
            if (!isContentFocused) {
                setLocalContent(taskContent);
                latestContentRef.current = taskContent;
            }
            const taskDueDate = safeParseDate(selectedTask.dueDate);
            setLocalDueDate(taskDueDate && isValid(taskDueDate) ? taskDueDate : undefined);
            const taskTagsString = (selectedTask.tags ?? []).join(', ');
            if (!isTagsFocused) {
                setLocalTags(taskTagsString);
                latestTagsRef.current = taskTagsString;
                setTagInputValue('');
            }
            hasUnsavedChangesRef.current = false;
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            if (selectedTask.title === '' && !isTitleFocused && !isContentFocused && !isTagsFocused) {
                const timer = setTimeout(() => {
                    if (isMountedRef.current && titleInputRef.current) {
                        titleInputRef.current.focus();
                        titleInputRef.current.select();
                    }
                }, 350);
                return () => clearTimeout(timer);
            }
        } else {
            setLocalTitle('');
            latestTitleRef.current = '';
            setLocalContent('');
            latestContentRef.current = '';
            setLocalDueDate(undefined);
            setLocalTags('');
            latestTagsRef.current = '';
            setTagInputValue('');
            hasUnsavedChangesRef.current = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            setIsDeleteDialogOpen(false);
        }
    }, [selectedTask?.id]); // Keep dep on ID only
    // Update Refs (unchanged)
    useEffect(() => {
        latestTitleRef.current = localTitle;
    }, [localTitle]);
    useEffect(() => {
        latestContentRef.current = localContent;
    }, [localContent]);
    useEffect(() => {
        latestTagsRef.current = localTags;
    }, [localTags]);
    // Trigger Save (unchanged)
    const triggerSave = useCallback(() => { /* ... */
        if (!selectedTask || !isMountedRef.current) return;
        hasUnsavedChangesRef.current = true;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => savePendingChanges(), 600);
    }, [selectedTask, savePendingChanges]);
    // Direct Update (unchanged)
    const updateTask = useCallback((updates: Partial<Omit<Task, 'groupCategory' | 'completedAt' | 'completed'>>) => { /* ... */
        if (!selectedTask || !isMountedRef.current) return;
        if (hasUnsavedChangesRef.current) savePendingChanges();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        hasUnsavedChangesRef.current = false;
        setTasks(prevTasks => prevTasks.map(t => (t.id === selectedTask.id) ? {
            ...t, ...updates,
            updatedAt: Date.now()
        } : t));
    }, [selectedTask, setTasks, savePendingChanges]);
    // Event Handlers (Mostly unchanged logic, adapted for new components)
    const handleClose = useCallback(() => {
        savePendingChanges();
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
    const handleDatePickerSelect = useCallback((date: Date | undefined) => {
        const newDate = date && isValid(date) ? startOfDay(date) : undefined;
        setLocalDueDate(newDate);
        updateTask({dueDate: newDate ? newDate.getTime() : null});
    }, [updateTask]);
    const handleListChange = useCallback((newList: string) => {
        updateTask({list: newList});
    }, [updateTask]); // DropdownMenu handles closing
    const handlePriorityChange = useCallback((newPriority: string) => {
        updateTask({priority: newPriority === 'null' ? null : parseInt(newPriority, 10)});
    }, [updateTask]); // Value is string
    // Progress Cycling logic for main indicator
    const cycleCompletion = useCallback((checked: boolean | 'indeterminate') => {
        const isNowChecked = !!checked;
        const nextPercentage = isNowChecked ? 100 : null;
        updateTask({completionPercentage: nextPercentage});
    }, [updateTask]);
    // Progress setting from dropdown
    const handleProgressChange = useCallback((newPercentage: string) => {
        updateTask({completionPercentage: newPercentage === 'null' ? null : parseInt(newPercentage, 10)});
    }, [updateTask]);
    // Delete/Restore Handling (unchanged logic)
    const openDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(true), []);
    const closeDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(false), []);
    const confirmDelete = useCallback(() => {
        if (!selectedTask) return;
        updateTask({list: 'Trash', completionPercentage: null});
        setSelectedTaskId(null);
        closeDeleteConfirm();
    }, [selectedTask, updateTask, setSelectedTaskId, closeDeleteConfirm]);
    const handleRestore = useCallback(() => {
        if (!selectedTask || selectedTask.list !== 'Trash') return;
        updateTask({list: 'Inbox'});
    }, [selectedTask, updateTask]);
    // KeyDown Handlers (unchanged logic)
    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => { /* ... */
        if (e.key === 'Enter') {
            e.preventDefault();
            savePendingChanges();
            titleInputRef.current?.blur();
        } else if (e.key === 'Escape' && selectedTask) {
            e.preventDefault();
            if (localTitle !== selectedTask.title) {
                setLocalTitle(selectedTask.title);
                latestTitleRef.current = selectedTask.title;
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                hasUnsavedChangesRef.current = false;
            }
            titleInputRef.current?.blur();
        }
    }, [selectedTask, localTitle, savePendingChanges]);

    // Tag Input Specific Logic (logic unchanged, styling adapted)
    const tagsArray = useMemo(() => localTags.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i), [localTags]);
    const isTrash = useMemo(() => selectedTask?.list === 'Trash', [selectedTask?.list]);
    const isCompleted = useMemo(() => (selectedTask?.completionPercentage ?? 0) === 100 && !isTrash, [selectedTask?.completionPercentage, isTrash]);
    const isTagHandlingDisabled = useMemo(() => isTrash || isCompleted, [isTrash, isCompleted]);
    const addTag = useCallback((tagToAdd: string) => { /* ... */
        const trimmedTag = tagToAdd.trim();
        if (!trimmedTag || isTagHandlingDisabled) return;
        const currentTags = localTags.split(',').map(t => t.trim()).filter(Boolean);
        if (currentTags.includes(trimmedTag)) {
            setTagInputValue('');
            return;
        }
        const newTagsString = [...currentTags, trimmedTag].join(', ');
        setLocalTags(newTagsString);
        setTagInputValue('');
        triggerSave();
    }, [localTags, isTagHandlingDisabled, triggerSave]);
    const removeTag = useCallback((tagToRemove: string) => { /* ... */
        if (isTagHandlingDisabled) return;
        const newTagsArray = tagsArray.filter(t => t !== tagToRemove);
        setLocalTags(newTagsArray.join(', '));
        triggerSave();
        tagInputElementRef.current?.focus();
    }, [tagsArray, isTagHandlingDisabled, triggerSave]);
    const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => { /* ... */
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
    const handleTagInputBlur = useCallback(() => { /* ... */
        const value = tagInputValue.trim();
        if (value && !isTagHandlingDisabled) addTag(value);
        savePendingChanges();
    }, [tagInputValue, addTag, isTagHandlingDisabled, savePendingChanges]);
    const handleTagContainerClick = useCallback(() => {
        if (!isTagHandlingDisabled) tagInputElementRef.current?.focus();
    }, [isTagHandlingDisabled]);


    // Memos for Display Logic (adapted for shadcn/ui)
    const priorityMap: Record<number, { label: string; colorClass: string }> = useMemo(() => ({
        1: {label: 'High', colorClass: 'text-red-500'}, 2: {label: 'Medium', colorClass: 'text-orange-500'},
        3: {label: 'Low', colorClass: 'text-blue-500'}, 4: {label: 'Lowest', colorClass: 'text-muted-foreground'},
    }), []);
    const displayDueDateForPicker = useMemo(() => localDueDate, [localDueDate]);
    const displayDueDateForRender = useMemo(() => localDueDate ?? safeParseDate(selectedTask?.dueDate), [localDueDate, selectedTask?.dueDate]);
    const overdue = useMemo(() => displayDueDateForRender && isValid(displayDueDateForRender) && !isCompleted && !isTrash && isOverdue(displayDueDateForRender), [displayDueDateForRender, isCompleted, isTrash]);
    const displayPriority = selectedTask?.priority;
    const displayList = selectedTask?.list;
    const displayCreatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.createdAt) : '', [selectedTask?.createdAt]);
    const displayUpdatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.updatedAt) : '', [selectedTask?.updatedAt]);
    const availableLists = useMemo(() => userLists.filter(l => l !== 'Trash'), [userLists]);
    const titleInputClasses = cn("w-full text-lg font-medium border-none focus:ring-0 focus:outline-none bg-transparent p-0 m-0 leading-tight", "placeholder:text-muted-foreground placeholder:font-normal", (isCompleted || isTrash) && "line-through text-muted-foreground", "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none task-detail-title-input"); // Remove focus ring for title
    const editorClasses = cn("!min-h-[150px] h-full text-sm !rounded-md", "!bg-transparent !border-border/50", (isCompleted || isTrash) && "opacity-70", isTrash && "pointer-events-none");
    const progressStatusText = useMemo(() => { /* ... */
        const p = selectedTask?.completionPercentage;
        if (p === 100) return "Completed";
        if (p === 80) return "Almost Done (80%)";
        if (p === 50) return "Halfway (50%)";
        if (p === 20) return "Started (20%)";
        return "Not Started";
    }, [selectedTask?.completionPercentage]);
    const progressMenuItems = useMemo(() => [{
        label: 'Not Started',
        value: 'null',
        icon: 'circle' as IconName
    }, {label: 'Started (20%)', value: '20', icon: 'circle-dot-dashed' as IconName}, {
        label: 'Halfway (50%)',
        value: '50',
        icon: 'circle-dot' as IconName
    }, {label: 'Almost Done (80%)', value: '80', icon: 'circle-slash' as IconName}, {
        label: 'Completed (100%)',
        value: '100',
        icon: 'circle-check' as IconName
    },], []);
    const tagInputContainerClasses = cn("flex items-center flex-wrap bg-secondary/30 dark:bg-black/20 rounded-md w-full min-h-[36px] px-2 py-1 border border-input", "transition-colors duration-100 ease-apple", isTagHandlingDisabled ? "opacity-60 cursor-not-allowed bg-transparent border-transparent" : "hover:border-border/70 focus-within:border-primary focus-within:bg-background/50 cursor-text");

    if (!selectedTask) return null;

    // Helper for Meta Rows using shadcn layout
    const MetaRow = ({icon, label, children, disabled = false}: {
        icon: IconName,
        label: string,
        children: React.ReactNode,
        disabled?: boolean
    }) => (
        <div
            className={cn("flex items-center justify-between group min-h-[36px] px-1 rounded", disabled && "opacity-60 pointer-events-none select-none")}>
            <Label className="text-muted-foreground flex items-center text-xs font-medium w-24 flex-shrink-0">
                <Icon name={icon} size={14} className="mr-1.5 opacity-70" aria-hidden="true"/>
                {label}
            </Label>
            <div
                className={cn("flex-1 text-right min-w-0", !disabled && "[&>button]:hover:bg-accent/80 [&>button]:dark:hover:bg-accent/50 [&>button]:transition-colors [&>button]:duration-100")}>
                {children}
            </div>
        </div>
    );


    return (
        <>
            {/* Use framer-motion for animation */}
            <motion.div key={selectedTask.id}
                        className={cn(
                            "border-l border-border w-[420px] shrink-0 h-full flex flex-col shadow-xl z-20",
                            "bg-card/70 dark:bg-card/40 backdrop-blur-xl" // Glass effect for detail pane
                        )}
                // Use framer-motion animation props matching tailwind.config.js
                        initial={{x: '100%', opacity: 0.8}}
                        animate={{x: 0, opacity: 1}}
                        exit={{x: '100%', opacity: 0.8}}
                        transition={{duration: 0.3, ease: "easeOut"}}
            >
                {/* Header */}
                <div className={cn(
                    "px-3 py-2 border-b border-border/60 flex justify-between items-center flex-shrink-0 h-11",
                    "bg-card/50 dark:bg-card/20 backdrop-blur-md" // Slightly different header glass
                )}>
                    <div className="w-20 flex justify-start">
                        {isTrash ? (
                            <Button variant="ghost" size="sm" onClick={handleRestore}
                                    className="text-green-600 hover:bg-green-500/15 hover:text-green-700 text-xs px-1.5 h-7">
                                <Icon name="arrow-left" size={14} className="mr-1"/> Restore
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" onClick={openDeleteConfirm}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive w-7 h-7"
                                    aria-label="Move task to Trash">
                                <Icon name="trash" size={16}/>
                            </Button>
                        )}
                    </div>
                    {/* Optional: Add drag handle or indicator here */}
                    {/* <div className="flex-1 text-center h-4"></div> */}
                    <div className="w-20 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close task details"
                                className="text-muted-foreground hover:bg-accent w-7 h-7">
                            <Icon name="x" size={16}/>
                        </Button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1">
                    <div className="p-5 flex flex-col min-h-full"> {/* Ensure padding and flex */}
                        {/* Progress Indicator and Title */}
                        <div className="flex items-start space-x-3 mb-4 flex-shrink-0">
                            {/* Reusing ProgressIndicator visual, wrapped by Checkbox */}
                            <ProgressIndicator
                                percentage={selectedTask.completionPercentage}
                                isTrash={isTrash}
                                taskId={selectedTask.id}
                                checked={isCompleted}
                                onCheckedChange={cycleCompletion}
                                size={20}
                                className="mt-[3px]"
                                ariaLabelledby={`task-title-input-${selectedTask.id}`}
                            />
                            <Input
                                ref={titleInputRef} value={localTitle} onChange={handleTitleChange}
                                onKeyDown={handleTitleKeyDown} onBlur={savePendingChanges}
                                className={titleInputClasses}
                                placeholder="Task title..." disabled={isTrash} aria-label="Task title"
                                id={`task-title-input-${selectedTask.id}`}
                            />
                        </div>

                        {/* Metadata Section */}
                        <div className="space-y-1 text-sm border-t border-b border-border/50 py-2.5 my-4 flex-shrink-0">
                            {/* Progress Row */}
                            <MetaRow icon="circle-gauge" label="Progress" disabled={isTrash}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" disabled={isTrash}
                                                className={cn("text-xs h-7 px-1.5 w-full text-left justify-start font-normal disabled:text-muted-foreground disabled:opacity-70 disabled:line-through truncate", isCompleted ? "text-primary" : "text-foreground")}>
                                            {progressStatusText}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end"
                                                         className="w-48 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                                        <DropdownMenuRadioGroup
                                            value={(selectedTask?.completionPercentage ?? 'null').toString()}
                                            onValueChange={handleProgressChange}>
                                            {progressMenuItems.map(item => (
                                                <DropdownMenuRadioItem key={item.label} value={item.value}
                                                                       className="cursor-pointer">
                                                    <Icon name={item.icon} size={14}
                                                          className="mr-1.5 opacity-80"/> {item.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </MetaRow>
                            {/* Due Date Row */}
                            <MetaRow icon="calendar" label="Due Date" disabled={isTrash}>
                                <CustomDatePickerPopover
                                    initialDate={displayDueDateForPicker}
                                    onSelect={handleDatePickerSelect}
                                    align="end"
                                    trigger={
                                        <Button variant="ghost" size="sm" disabled={isTrash}
                                                className={cn("text-xs h-7 px-1.5 w-full text-left justify-start font-normal truncate", displayDueDateForRender ? 'text-foreground' : 'text-muted-foreground', overdue && 'text-destructive font-medium', isTrash && 'text-muted-foreground line-through !bg-transparent hover:!bg-transparent cursor-not-allowed', isCompleted && !isTrash && "line-through text-muted-foreground")}>
                                            {displayDueDateForRender && isValid(displayDueDateForRender) ? formatRelativeDate(displayDueDateForRender) : 'Set date'}
                                        </Button>
                                    }
                                />
                            </MetaRow>
                            {/* List Row */}
                            <MetaRow icon="list" label="List" disabled={isTrash}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" disabled={isTrash}
                                                className="text-xs h-7 px-1.5 w-full text-left justify-start text-foreground font-normal disabled:text-muted-foreground disabled:opacity-70 disabled:line-through truncate">
                                            {displayList}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end"
                                                         className="max-h-48 overflow-y-auto styled-scrollbar-thin w-48 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                                        <DropdownMenuRadioGroup value={displayList} onValueChange={handleListChange}>
                                            {availableLists.map(list => (
                                                <DropdownMenuRadioItem key={list} value={list}
                                                                       className="cursor-pointer">
                                                    <Icon name={list === 'Inbox' ? 'inbox' : 'list'} size={14}
                                                          className="mr-1.5 opacity-80"/> {list}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </MetaRow>
                            {/* Priority Row */}
                            <MetaRow icon="flag" label="Priority" disabled={isTagHandlingDisabled}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" disabled={isTagHandlingDisabled}
                                                className={cn("text-xs h-7 px-1.5 w-full text-left justify-start font-normal disabled:text-muted-foreground disabled:opacity-70 disabled:line-through truncate", displayPriority ? priorityMap[displayPriority]?.colorClass : 'text-foreground')}>
                                            <Icon name="flag" size={14}
                                                  className={cn("mr-1.5 flex-shrink-0", displayPriority ? "opacity-100" : "opacity-50")}/>
                                            {displayPriority ? `P${displayPriority} ${priorityMap[displayPriority]?.label}` : 'Set Priority'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end"
                                                         className="w-48 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                                        <DropdownMenuRadioGroup value={(displayPriority ?? 'null').toString()}
                                                                onValueChange={handlePriorityChange}>
                                            {[{
                                                label: 'None',
                                                value: 'null',
                                                colorClass: undefined
                                            }, {
                                                label: `P1 ${priorityMap[1].label}`,
                                                value: '1',
                                                colorClass: priorityMap[1].colorClass
                                            }, {
                                                label: `P2 ${priorityMap[2].label}`,
                                                value: '2',
                                                colorClass: priorityMap[2].colorClass
                                            }, {
                                                label: `P3 ${priorityMap[3].label}`,
                                                value: '3',
                                                colorClass: priorityMap[3].colorClass
                                            }, {
                                                label: `P4 ${priorityMap[4].label}`,
                                                value: '4',
                                                colorClass: priorityMap[4].colorClass
                                            },].map(p => (
                                                <DropdownMenuRadioItem key={p.value} value={p.value}
                                                                       className="cursor-pointer">
                                                    <Icon name="flag" size={14}
                                                          className={cn("mr-1.5 flex-shrink-0", p.colorClass ? `opacity-100 ${p.colorClass}` : "opacity-50")}/> {p.label}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </MetaRow>
                            {/* Tags Row */}
                            <MetaRow icon="tag" label="Tags" disabled={isTagHandlingDisabled}>
                                <div className={tagInputContainerClasses} onClick={handleTagContainerClick}
                                     aria-disabled={isTagHandlingDisabled}>
                                    {tagsArray.map((tag) => (
                                        <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)}
                                                 disabled={isTagHandlingDisabled}/>))}
                                    <Input
                                        ref={tagInputElementRef} type="text" value={tagInputValue}
                                        onChange={(e) => setTagInputValue(e.target.value)}
                                        onKeyDown={handleTagInputKeyDown} onBlur={handleTagInputBlur}
                                        placeholder={tagsArray.length === 0 ? "Add tag..." : ""}
                                        className={cn(
                                            "flex-1 text-xs border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 m-0 h-[22px] min-w-[60px] self-center shadow-none", // Removed shadow, adjust height
                                            "placeholder:text-muted-foreground placeholder:font-normal",
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
                            <Label htmlFor={`editor-${selectedTask.id}`}
                                   className="text-xs font-medium text-muted-foreground mb-1.5 sr-only">Task
                                Content</Label> {/* Sr only label */}
                            <CodeMirrorEditor
                                ref={editorRef} value={localContent} onChange={handleContentChange}
                                onBlur={savePendingChanges}
                                placeholder="Add notes, links, or details here... Markdown is supported."
                                className={editorClasses} // Apply calculated classes
                                readOnly={isTrash}
                                key={`editor-${selectedTask.id}`} // Ensure remount on task change if needed
                            />
                        </div>

                    </div>
                    {/* End Inner Flex Col */}
                </ScrollArea> {/* End ScrollArea */}

                {/* Footer */}
                <div className={cn(
                    "px-4 py-1 border-t border-border/60 flex justify-end items-center flex-shrink-0 h-8",
                    "bg-card/30 dark:bg-card/10 backdrop-blur-sm" // Subtle footer glass
                )}>
                    <div className="text-[11px] text-muted-foreground space-x-4">
                        <span>Created: {displayCreatedAt}</span>
                        <span>Updated: {displayUpdatedAt}</span>
                    </div>
                </div>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteModal
                isOpen={isDeleteDialogOpen}
                onClose={closeDeleteConfirm}
                onConfirm={confirmDelete}
                taskTitle={selectedTask.title}
            />
        </>
    );
};
TaskDetail.displayName = 'TaskDetail';
export default TaskDetail;