// src/components/tasks/TaskDetail.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {selectedTaskAtom, selectedTaskIdAtom, tasksAtom, userListNamesAtom} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, {CodeMirrorEditorRef} from '../common/CodeMirrorEditor';
import {formatDateTime, formatRelativeDate, isOverdue, isValid, safeParseDate,} from '@/utils/dateUtils';
import {Subtask, Task} from '@/types';
import {twMerge} from 'tailwind-merge';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import * as Tooltip from '@radix-ui/react-tooltip';
import {CustomDatePickerContent} from '../common/CustomDatePickerPopover';
import ConfirmDeleteModalRadix from "@/components/common/ConfirmDeleteModal";
import {ProgressIndicator} from './TaskItem'; // Import from TaskItem
import {IconName} from "@/components/common/IconMap";
import SelectionCheckboxRadix from "@/components/common/SelectionCheckbox";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    MeasuringStrategy,
    PointerSensor,
    UniqueIdentifier,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {AnimatePresence, motion} from "framer-motion";


// --- Helper TagPill Component (Kept for potential future re-use, but not actively used if tags are removed from footer) ---
interface TagPillProps {
    tag: string;
    onRemove: () => void;
    disabled?: boolean;
}

const TagPill: React.FC<TagPillProps> = React.memo(({tag, onRemove, disabled}) => (
    <span
        className={twMerge(
            "inline-flex items-center bg-black/5 dark:bg-white/5 text-gray-600 dark:text-neutral-300 rounded px-1.5 py-0.5 text-[11px] mr-1 mb-1 group/pill whitespace-nowrap backdrop-blur-sm",
            "transition-colors duration-100 ease-apple",
            disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-black/10 dark:hover:bg-white/10"
        )}
        aria-label={`Tag: ${tag}${disabled ? ' (disabled)' : ''}`}
    >
        {tag}
        {!disabled && (
            <button type="button" onClick={(e) => {
                e.stopPropagation();
                onRemove();
            }}
                    className="ml-1 text-gray-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 opacity-50 group-hover/pill:opacity-100 focus:outline-none rounded-full p-0.5 -mr-0.5 flex items-center justify-center"
                    aria-label={`Remove tag ${tag}`} tabIndex={-1}>
                <Icon name="x" size={9} strokeWidth={2.5}/>
            </button>
        )}
    </span>
));
TagPill.displayName = 'TagPill';


// --- Reusable Radix Dropdown Menu Item Component (Styled to align with TaskItemRadixMenuItem) ---
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
            "relative flex cursor-pointer select-none items-center rounded-base px-3 py-2 text-[13px] outline-none transition-colors data-[disabled]:pointer-events-none h-8 font-normal", // UPDATED: rounded-base, px-3 py-2
            isDanger
                ? "text-red-600 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-700 dark:text-red-400 dark:data-[highlighted]:bg-red-500/15 dark:data-[highlighted]:text-red-300" // Original TD danger style
                // UPDATED: Added focus styling to match TaskItem's data-[highlighted] behavior for non-danger items
                : "data-[highlighted]:bg-black/[.07] dark:data-[highlighted]:bg-white/[.07] focus:bg-black/[.07] dark:focus:bg-white/[.07]",
            selected && !isDanger && "bg-primary/15 text-primary data-[highlighted]:bg-primary/20 dark:bg-primary/25 dark:text-primary-light dark:data-[highlighted]:bg-primary/30", // Original TD selected style
            // UPDATED: Added focus styling for text color consistency when background changes on focus for non-selected, non-danger items
            !selected && !isDanger && "text-gray-700 data-[highlighted]:text-gray-800 dark:text-neutral-200 dark:data-[highlighted]:text-neutral-50 focus:text-gray-800 dark:focus:text-neutral-50",
            "data-[disabled]:opacity-50",
            className
        )}
        {...props}
    >
        {icon && (<Icon name={icon} size={15} className={twMerge("mr-2 flex-shrink-0 opacity-70", iconColor)}
                        aria-hidden="true"/>)}
        <span className="flex-grow">{children}</span>
    </DropdownMenu.Item>
));
RadixMenuItem.displayName = 'RadixMenuItem';


// --- Subtask Item Component for TaskDetail (Refined UX) ---
interface SubtaskItemDetailProps {
    subtask: Subtask;
    onUpdate: (id: string, updates: Partial<Omit<Subtask, 'id' | 'parentId' | 'createdAt'>>) => void;
    onDelete: (id: string) => void;
    isEditingContentForThis: boolean;
    onToggleEditContent: (id: string | null) => void;
    isTaskCompletedOrTrashed: boolean;
    isDraggingOverlay?: boolean;
}

const SubtaskItemDetail: React.FC<SubtaskItemDetailProps> = memo(({
                                                                      subtask,
                                                                      onUpdate,
                                                                      onDelete,
                                                                      isEditingContentForThis,
                                                                      onToggleEditContent,
                                                                      isTaskCompletedOrTrashed,
                                                                      isDraggingOverlay = false
                                                                  }) => {
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [localTitle, setLocalTitle] = useState(subtask.title);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isDateTooltipOpen, setIsDateTooltipOpen] = useState(false);
    const [localContentCache, setLocalContentCache] = useState(subtask.content || '');

    const isDisabledByParent = isTaskCompletedOrTrashed;
    const isDisabled = isDisabledByParent || subtask.completed;

    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: `subtask-detail-${subtask.id}`, data: {subtask, type: 'subtask-item-detail'}, disabled: isDisabledByParent,
    });

    const style = useMemo(() => {
        const baseTransform = CSS.Transform.toString(transform);
        if (isDraggingOverlay) return {
            transform: baseTransform,
            transition,
            cursor: 'grabbing',
            zIndex: 1000,
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            background: 'var(--color-canvas-alt, hsl(var(--canvas-alt-h), var(--canvas-alt-s), calc(var(--canvas-alt-l) + 3%)))'
        };
        if (isDragging) return {
            transform: baseTransform,
            transition,
            opacity: 0.6,
            cursor: 'grabbing',
            background: 'var(--color-glass-alt, hsla(var(--glass-alt-h), var(--glass-alt-s), var(--glass-alt-l), 0.2))'
        };
        return {transform: baseTransform, transition};
    }, [transform, transition, isDragging, isDraggingOverlay]);

    useEffect(() => {
        setLocalTitle(subtask.title);
    }, [subtask.title]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    useEffect(() => {
        if (isEditingContentForThis && contentTextareaRef.current) {
            setLocalContentCache(subtask.content || '');
            contentTextareaRef.current.focus();
            contentTextareaRef.current.style.height = 'auto';
            requestAnimationFrame(() => {
                if (contentTextareaRef.current) {
                    contentTextareaRef.current.style.height = `${contentTextareaRef.current.scrollHeight}px`;
                }
            });
        }
    }, [isEditingContentForThis, subtask.content]);


    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setLocalTitle(e.target.value);
    const saveTitle = () => {
        const trimmedTitle = localTitle.trim();
        if (trimmedTitle && trimmedTitle !== subtask.title) {
            onUpdate(subtask.id, {title: trimmedTitle});
        } else if (!trimmedTitle && subtask.title) {
            setLocalTitle(subtask.title);
        }
        setIsEditingTitle(false);
    };
    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') saveTitle();
        if (e.key === 'Escape') {
            setLocalTitle(subtask.title);
            setIsEditingTitle(false);
        }
    };
    const handleCompletionToggle = () => {
        if (!isDisabledByParent) {
            onUpdate(subtask.id, {
                completed: !subtask.completed,
                completedAt: !subtask.completed ? Date.now() : null
            });
        }
    };

    const handleContentTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalContentCache(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };
    const saveSubtaskContent = () => {
        if (localContentCache !== (subtask.content || '')) {
            onUpdate(subtask.id, {content: localContentCache});
        }
        onToggleEditContent(null);
    };
    const cancelSubtaskContentEdit = () => {
        setLocalContentCache(subtask.content || '');
        onToggleEditContent(null);
    };

    const handleDateSelect = useCallback((dateWithTime: Date | undefined) => {
        if (!isDisabledByParent) {
            onUpdate(subtask.id, {dueDate: dateWithTime ? dateWithTime.getTime() : null});
        }
        setIsDatePickerOpen(false);
        setIsDateTooltipOpen(false);
    }, [onUpdate, subtask.id, isDisabledByParent]);

    const closeDatePickerPopover = useCallback(() => {
        setIsDatePickerOpen(false);
        setIsDateTooltipOpen(false);
    }, []);

    const openDeleteConfirm = useCallback(() => {
        if (!isDisabledByParent) {
            setIsDeleteConfirmOpen(true);
        }
    }, [isDisabledByParent]);

    const closeDeleteConfirm = useCallback(() => {
        setIsDeleteConfirmOpen(false);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        onDelete(subtask.id);
        closeDeleteConfirm();
    }, [onDelete, subtask.id, closeDeleteConfirm]);

    const subtaskDueDate = useMemo(() => safeParseDate(subtask.dueDate), [subtask.dueDate]);
    const isSubtaskOverdue = useMemo(() => subtaskDueDate && isValid(subtaskDueDate) && !subtask.completed && !isDisabledByParent && isOverdue(subtaskDueDate), [subtaskDueDate, subtask.completed, isDisabledByParent]);
    const hasContent = useMemo(() => !!subtask.content?.trim(), [subtask.content]);

    const subtaskItemBaseClasses = "group/subtask-detail flex flex-col rounded-lg transition-colors duration-150 ease-apple";
    const subtaskItemHoverClasses = !isDraggingOverlay && !isDragging && !isEditingContentForThis ? "hover:bg-black/[.025] dark:hover:bg-white/[.025]" : "";
    const subtaskItemEditingContentClasses = isEditingContentForThis ? "bg-black/[.02] dark:bg-white/[.02]" : "";

    const tooltipContentClass = "text-[11px] bg-grey-dark dark:bg-neutral-900/90 text-white dark:text-neutral-100 px-2 py-1 rounded-base shadow-md select-none z-[75] data-[state=delayed-open]:animate-fadeIn data-[state=closed]:animate-fadeOut";

    const datePickerPopoverWrapperClasses = useMemo(() => twMerge(
        "z-[70] p-0 bg-white dark:bg-neutral-800/95 backdrop-blur-xl rounded-lg shadow-strong border border-black/10 dark:border-white/10", // This is different from the main date picker popover style used in dropdowns. Kept specific for subtask.
        "data-[state=open]:animate-popoverShow data-[state=closed]:animate-popoverHide"
    ), []);


    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={twMerge(
                    subtaskItemBaseClasses,
                    subtaskItemHoverClasses,
                    subtaskItemEditingContentClasses,
                    isDraggingOverlay && "bg-canvas-alt dark:bg-neutral-750 shadow-lg px-1.5",
                    !isDisabledByParent && !isDragging && !isDraggingOverlay && "cursor-grab",
                    isDisabledByParent && "cursor-not-allowed"
                )}
            >
                <div className="flex items-center h-9 px-1.5">
                    <SelectionCheckboxRadix
                        id={`subtask-detail-check-${subtask.id}`} checked={subtask.completed}
                        onChange={handleCompletionToggle}
                        aria-label={`Mark subtask ${subtask.title} as ${subtask.completed ? 'incomplete' : 'complete'}`}
                        className="mr-2.5 flex-shrink-0" size={16} disabled={isDisabledByParent}
                    />
                    <div className={twMerge(
                        "flex-1 min-w-0 py-1 h-full flex items-center"
                    )}
                         onClick={() => !isEditingTitle && !isDisabled && setIsEditingTitle(true)}>
                        {isEditingTitle ? (
                            <input ref={titleInputRef} type="text" value={localTitle} onChange={handleTitleChange}
                                   onBlur={saveTitle} onKeyDown={handleTitleKeyDown}
                                   className={twMerge(
                                       "w-full text-[13px] bg-transparent focus:outline-none focus:ring-0 border-none p-0 leading-tight font-medium",
                                       subtask.completed ? "line-through text-neutral-500/70 dark:text-neutral-400/70" : "text-neutral-700 dark:text-neutral-100"
                                   )}
                                   placeholder="Subtask title..." disabled={isDisabled}
                            />
                        ) : (
                            <span
                                className={twMerge(
                                    "text-[13px] cursor-text block truncate leading-tight font-medium",
                                    subtask.completed ? "line-through text-neutral-500/70 dark:text-neutral-400/70" : "text-neutral-700 dark:text-neutral-100"
                                )}>
                            {subtask.title || <span className="italic text-muted-foreground/70">Untitled Subtask</span>}
                        </span>
                        )}
                    </div>
                    <div
                        className={twMerge("flex items-center flex-shrink-0 ml-2 space-x-1 transition-opacity duration-150", (isEditingContentForThis || isEditingTitle) ? "opacity-100" : "opacity-0 group-hover/subtask-detail:opacity-100 focus-within:opacity-100")}>
                        {(subtask.dueDate || !isDisabled) && (
                            <Popover.Root open={isDatePickerOpen} onOpenChange={(open) => {
                                setIsDatePickerOpen(open);
                                if (!open) setIsDateTooltipOpen(false);
                            }}>
                                <Tooltip.Provider><Tooltip.Root delayDuration={300} open={isDateTooltipOpen}
                                                                onOpenChange={setIsDateTooltipOpen}>
                                    <Tooltip.Trigger asChild>
                                        <Popover.Trigger asChild disabled={isDisabled}>
                                            <Button variant="ghost" size="icon" icon="calendar"
                                                    className={twMerge("w-7 h-7",
                                                        isSubtaskOverdue && !subtask.completed && "text-red-500 dark:text-red-400",
                                                        !isSubtaskOverdue && "text-muted-foreground/60 dark:text-neutral-500/60 hover:text-muted-foreground dark:hover:text-neutral-400",
                                                        isDisabled && !subtask.dueDate && "opacity-50 cursor-not-allowed",
                                                        isDisabled && subtask.dueDate && "opacity-60 cursor-not-allowed",
                                                    )}
                                                    aria-label={subtask.dueDate ? `Subtask due: ${formatRelativeDate(subtaskDueDate, true)}` : "Set subtask due date"}
                                            />
                                        </Popover.Trigger>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal><Tooltip.Content className={tooltipContentClass} side="top"
                                                                     sideOffset={6}>
                                        {subtask.dueDate ? formatRelativeDate(subtaskDueDate, true) : "Set Due Date"}
                                        <Tooltip.Arrow className="fill-grey-dark dark:fill-neutral-900/90"/>
                                    </Tooltip.Content></Tooltip.Portal>
                                </Tooltip.Root></Tooltip.Provider>
                                <Popover.Portal><Popover.Content
                                    className={datePickerPopoverWrapperClasses}
                                    sideOffset={5}
                                    align="end" onOpenAutoFocus={(e) => e.preventDefault()}
                                    onCloseAutoFocus={(e) => e.preventDefault()}>
                                    <CustomDatePickerContent initialDate={subtaskDueDate ?? undefined}
                                                             onSelect={handleDateSelect}
                                                             closePopover={closeDatePickerPopover}/>
                                </Popover.Content></Popover.Portal>
                            </Popover.Root>
                        )}
                        <Button variant="ghost" size="icon"
                                icon={isEditingContentForThis ? "edit" : (hasContent ? "sticky-note" : "file-pen")}
                                onClick={() => !isDisabled && onToggleEditContent(isEditingContentForThis ? null : subtask.id)}
                                className={twMerge("w-7 h-7",
                                    isEditingContentForThis ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-muted-foreground/60 dark:text-neutral-500/60 hover:text-muted-foreground dark:hover:text-neutral-400",
                                    isDisabled && "opacity-50 cursor-not-allowed",
                                )}
                                aria-label={isEditingContentForThis ? "Close subtask notes" : (hasContent ? "Edit subtask notes" : "Add subtask notes")}
                                disabled={isDisabled}
                        />
                        <Button variant="ghost" size="icon" icon="trash"
                                onClick={openDeleteConfirm}
                                className={twMerge("w-7 h-7 text-muted-foreground/40 dark:text-neutral-500/40 hover:text-red-500 dark:hover:text-red-400", isDisabledByParent && "opacity-20 cursor-not-allowed")}
                                aria-label="Delete subtask" disabled={isDisabledByParent}
                        />
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isEditingContentForThis && (
                        <motion.div
                            key={`content-editor-${subtask.id}`}
                            initial={{height: 0, opacity: 0.5, marginTop: 0}}
                            animate={{height: 'auto', opacity: 1, marginTop: '2px', marginBottom: '4px'}}
                            exit={{height: 0, opacity: 0, marginTop: 0, marginBottom: 0}}
                            transition={{duration: 0.25, ease: [0.33, 1, 0.68, 1]}}
                            className="overflow-hidden pl-[calc(1rem+16px+0.625rem)] pr-2"
                        >
                        <textarea
                            ref={contentTextareaRef} value={localContentCache} onChange={handleContentTextareaChange}
                            placeholder="Add notes..."
                            className={twMerge(
                                "w-full text-xs min-h-[36px] max-h-[90px] py-1.5 px-2 rounded-md resize-none overflow-y-auto styled-scrollbar-thin",
                                "bg-black/[.03] dark:bg-white/[.03] border border-black/10 dark:border-white/10",
                                "focus:outline-none focus:border-transparent dark:focus:border-transparent",
                                "placeholder:text-muted-foreground/60 dark:placeholder:text-neutral-500/60",
                                "text-neutral-700 dark:text-neutral-300 leading-normal",
                                isDisabled && "opacity-60 cursor-not-allowed"
                            )}
                            disabled={isDisabled} rows={1}
                        />
                            <div className="flex justify-end space-x-2 mt-1.5">
                                <Button variant="ghost" size="sm" onClick={cancelSubtaskContentEdit}
                                        className="!h-6 !px-2 !text-xs">Cancel</Button>
                                <Button variant="primary" size="sm" onClick={saveSubtaskContent}
                                        className="!h-6 !px-2 !text-xs">Save Notes</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ConfirmDeleteModalRadix
                isOpen={isDeleteConfirmOpen}
                onClose={closeDeleteConfirm}
                onConfirm={handleConfirmDelete}
                itemTitle={subtask.title || 'Untitled Subtask'}
                title="Delete Subtask?"
                description={`Are you sure you want to permanently delete the subtask "${subtask.title || 'Untitled Subtask'}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
            />
        </>
    );
});
SubtaskItemDetail.displayName = 'SubtaskItemDetail';


// --- TaskDetail Component ---
const TaskDetail: React.FC = () => {
    const [selectedTaskInternal] = useAtom(selectedTaskAtom);
    const selectedTask = useAtomValue(selectedTaskAtom);
    const setTasks = useSetAtom(tasksAtom);
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const userLists = useAtomValue(userListNamesAtom);

    // Local state...
    const [localTitle, setLocalTitle] = useState('');
    const [localContent, setLocalContent] = useState('');
    const [localDueDate, setLocalDueDate] = useState<Date | undefined>(undefined);
    const [localTagsString, setLocalTagsString] = useState('');
    const latestTagsStringRef = useRef(localTagsString);


    // Modal/Popover states...
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isFooterDatePickerOpen, setIsFooterDatePickerOpen] = useState(false); // Renamed for clarity
    const [isHeaderMenuDatePickerOpen, setIsHeaderMenuDatePickerOpen] = useState(false); // For "Set Due Date" in header menu
    const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
    const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);

    // Tooltip states...
    const [isDateTooltipOpen, setIsDateTooltipOpen] = useState(false);
    const [isInfoTooltipOpen, setIsInfoTooltipOpen] = useState(false);


    // Subtask related states...
    const [editingSubtaskContentId, setEditingSubtaskContentId] = useState<string | null>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const newSubtaskInputRef = useRef<HTMLInputElement>(null);
    const [draggingSubtaskId, setDraggingSubtaskId] = useState<UniqueIdentifier | null>(null);

    // Refs...
    const titleInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const moreActionsButtonRef = useRef<HTMLButtonElement>(null); // Ref for the More Actions trigger
    const latestTitleRef = useRef(localTitle);
    const latestContentRef = useRef(localContent);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasUnsavedChangesRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (selectedTaskInternal) {
                savePendingChanges(selectedTaskInternal.id, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
            }
        };
    }, []);

    const savePendingChanges = useCallback((taskId: string, title: string, content: string, dueDate: Date | undefined, tagsString: string) => {
        if (!taskId || !hasUnsavedChangesRef.current || !isMountedRef.current) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        const processedTitle = title.trim();
        const processedDueDateTimestamp = dueDate && isValid(dueDate) ? dueDate.getTime() : null;
        const processedTags = tagsString.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

        let originalTaskState: Task | undefined;
        setTasks(prevTasks => {
            originalTaskState = prevTasks.find(t => t.id === taskId);
            if (!originalTaskState) return prevTasks;

            const changesToSave: Partial<Task> = {};
            if (processedTitle !== originalTaskState.title) changesToSave.title = processedTitle || "Untitled Task";
            if (content !== (originalTaskState.content || '')) changesToSave.content = content;

            const originalDueTime = originalTaskState.dueDate ?? null;
            if (processedDueDateTimestamp !== originalDueTime) changesToSave.dueDate = processedDueDateTimestamp;

            const originalTagsSorted = (originalTaskState.tags ?? []).slice().sort();
            const processedTagsSorted = processedTags.slice().sort();
            if (JSON.stringify(processedTagsSorted) !== JSON.stringify(originalTagsSorted)) changesToSave.tags = processedTags;

            if (Object.keys(changesToSave).length > 0) {
                return prevTasks.map(t => (t.id === taskId ? {
                    ...t, ...changesToSave,
                    updatedAt: Date.now()
                } : t));
            }
            return prevTasks;
        });

        hasUnsavedChangesRef.current = false;
    }, [setTasks]);


    useEffect(() => {
        const prevTaskId = selectedTaskInternal?.id;
        if (prevTaskId && hasUnsavedChangesRef.current) {
            savePendingChanges(prevTaskId, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
        }

        setEditingSubtaskContentId(null);
        setNewSubtaskTitle('');
        hasUnsavedChangesRef.current = false;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);


        if (selectedTask) {
            const taskTitle = selectedTask.title;
            const taskContent = selectedTask.content || '';
            const taskDueDateObj = safeParseDate(selectedTask.dueDate);
            const taskTagsString = (selectedTask.tags ?? []).join(', ');

            if (localTitle !== taskTitle) setLocalTitle(taskTitle);
            if (localContent !== taskContent) setLocalContent(taskContent);
            if (localDueDate?.getTime() !== taskDueDateObj?.getTime()) setLocalDueDate(taskDueDateObj && isValid(taskDueDateObj) ? taskDueDateObj : undefined);
            if (localTagsString !== taskTagsString) setLocalTagsString(taskTagsString);

            latestTitleRef.current = taskTitle;
            latestContentRef.current = taskContent;
            latestTagsStringRef.current = taskTagsString;


            if (taskTitle === '' &&
                document.activeElement !== titleInputRef.current &&
                !editorRef.current?.getView()?.hasFocus) {
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
            setLocalTagsString('');
            latestTagsStringRef.current = '';

            setIsDeleteDialogOpen(false);
            setIsFooterDatePickerOpen(false);
            setIsHeaderMenuDatePickerOpen(false);
            setIsMoreActionsOpen(false);
            setIsInfoPopoverOpen(false);
        }
    }, [selectedTask?.id, savePendingChanges, localDueDate, localTagsString, selectedTaskInternal, localTitle, localContent]);


    const triggerSave = useCallback(() => {
        if (!selectedTaskInternal || !isMountedRef.current) return;
        hasUnsavedChangesRef.current = true;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            savePendingChanges(selectedTaskInternal.id, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
        }, 700);
    }, [selectedTaskInternal?.id, localDueDate, savePendingChanges]);

    const updateTask = useCallback((updates: Partial<Omit<Task, 'groupCategory' | 'completedAt' | 'completed' | 'subtasks'>>) => {
        if (!selectedTaskInternal || !isMountedRef.current) return;
        if (hasUnsavedChangesRef.current) {
            savePendingChanges(selectedTaskInternal.id, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
        }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        hasUnsavedChangesRef.current = false;

        setTasks(prevTasks => prevTasks.map(t => (t.id === selectedTaskInternal.id ? {
            ...t, ...updates,
            updatedAt: Date.now()
        } : t)));
    }, [selectedTaskInternal?.id, setTasks, localDueDate, savePendingChanges]);

    const handleClose = useCallback(() => {
        if (selectedTaskInternal) {
            savePendingChanges(selectedTaskInternal.id, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
        }
        setSelectedTaskId(null);
    }, [selectedTaskInternal?.id, setSelectedTaskId, localDueDate, savePendingChanges]);

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTitle(e.target.value);
        latestTitleRef.current = e.target.value;
        triggerSave();
    }, [triggerSave]);

    const handleContentChange = useCallback((newValue: string) => {
        setLocalContent(newValue);
        latestContentRef.current = newValue;
        triggerSave();
    }, [triggerSave]);

    const handleMainContentBlur = useCallback(() => {
        if (hasUnsavedChangesRef.current && selectedTaskInternal) {
            savePendingChanges(selectedTaskInternal.id, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
        }
    }, [selectedTaskInternal?.id, localDueDate, savePendingChanges]);


    const handleFooterDatePickerSelect = useCallback((dateWithTime: Date | undefined) => {
        setLocalDueDate(dateWithTime);
        updateTask({dueDate: dateWithTime ? dateWithTime.getTime() : null});
        setIsFooterDatePickerOpen(false);
        setIsDateTooltipOpen(false);
    }, [updateTask]);

    const closeFooterDatePickerPopover = useCallback(() => {
        setIsFooterDatePickerOpen(false);
        setIsDateTooltipOpen(false);
    }, []);

    const handleHeaderMenuDateSelect = useCallback((dateWithTime: Date | undefined) => {
        setLocalDueDate(dateWithTime); // Keep localDueDate in sync
        updateTask({dueDate: dateWithTime ? dateWithTime.getTime() : null});
        setIsHeaderMenuDatePickerOpen(false); // Close the menu's date picker
    }, [updateTask]);

    const closeHeaderMenuDatePickerPopover = useCallback(() => {
        setIsHeaderMenuDatePickerOpen(false);
    }, []);


    const handleListChange = useCallback((newList: string) => updateTask({list: newList}), [updateTask]);
    const handlePriorityChange = useCallback((newPriority: number | null) => updateTask({priority: newPriority}), [updateTask]);
    const handleProgressChange = useCallback((newPercentage: number | null) => {
        updateTask({completionPercentage: newPercentage});
        if (newPercentage === 100 && selectedTask?.id === selectedTaskId) { // Check if current task is selected
            // Optionally close or handle completion side effects
        }
    }, [updateTask, selectedTask?.id, selectedTaskId]);

    const cycleCompletionPercentage = useCallback(() => {
        if (!selectedTask || selectedTask.list === 'Trash') return;
        const currentPercentage = selectedTask.completionPercentage ?? 0;
        let nextPercentage: number | null = currentPercentage === 100 ? null : 100;
        updateTask({completionPercentage: nextPercentage});
    }, [selectedTask, updateTask]);

    const openDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(true), []);
    const closeDeleteConfirm = useCallback(() => setIsDeleteDialogOpen(false), []);

    const confirmDelete = useCallback(() => {
        if (!selectedTask) return;
        updateTask({list: 'Trash', completionPercentage: null});
        setSelectedTaskId(null);
        closeDeleteConfirm();
    }, [selectedTask, updateTask, setSelectedTaskId]);

    const handleRestore = useCallback(() => {
        if (!selectedTask || selectedTask.list !== 'Trash') return;
        updateTask({list: 'Inbox'});
    }, [selectedTask, updateTask]);

    const handleDuplicateTask = useCallback(() => {
        if (!selectedTask) return;
        if (hasUnsavedChangesRef.current && selectedTaskInternal) {
            savePendingChanges(selectedTaskInternal.id, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
        }
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        hasUnsavedChangesRef.current = false;

        const now = Date.now();
        const newParentTaskId = `task-${now}-${Math.random().toString(16).slice(2)}`;
        const taskToDuplicate = selectedTask;

        const duplicatedSubtasks = (taskToDuplicate.subtasks || []).map(sub => ({
            ...sub,
            id: `subtask-${now}-${Math.random().toString(16).slice(2)}`,
            parentId: newParentTaskId,
            createdAt: now,
            updatedAt: now,
            completedAt: sub.completed ? now : null,
        }));
        const newTaskData: Partial<Task> = {
            ...taskToDuplicate,
            id: newParentTaskId,
            title: `${taskToDuplicate.title || 'Untitled Task'} (Copy)`,
            order: taskToDuplicate.order + 0.01,
            createdAt: now,
            updatedAt: now,
            completed: false,
            completedAt: null,
            completionPercentage: taskToDuplicate.completionPercentage === 100 ? null : taskToDuplicate.completionPercentage,
            subtasks: duplicatedSubtasks,
        };
        delete newTaskData.groupCategory;

        setTasks(prev => {
            const index = prev.findIndex(t => t.id === taskToDuplicate.id);
            const newTasks = [...prev];
            newTasks.splice(index !== -1 ? index + 1 : prev.length, 0, newTaskData as Task);
            return newTasks;
        });
        setSelectedTaskId(newTaskData.id!);
        setIsMoreActionsOpen(false);
    }, [selectedTask, setTasks, setSelectedTaskId, savePendingChanges, selectedTaskInternal, localDueDate]);


    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedTaskInternal) savePendingChanges(selectedTaskInternal.id, latestTitleRef.current, latestContentRef.current, localDueDate, latestTagsStringRef.current);
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
    }, [selectedTask, selectedTaskInternal?.id, localTitle, localDueDate, savePendingChanges]);

    const isTrash = useMemo(() => selectedTask?.list === 'Trash', [selectedTask?.list]);
    const isCompleted = useMemo(() => (selectedTask?.completionPercentage ?? 0) === 100 && !isTrash, [selectedTask?.completionPercentage, isTrash]);
    const isInteractiveDisabled = useMemo(() => isTrash || isCompleted, [isTrash, isCompleted]);


    // Subtask handlers
    const handleAddSubtask = useCallback(() => {
        if (!selectedTask || !newSubtaskTitle.trim() || isInteractiveDisabled) return;
        const now = Date.now();
        const newSub: Subtask = {
            id: `subtask-${now}-${Math.random().toString(16).slice(2)}`, parentId: selectedTask.id,
            title: newSubtaskTitle.trim(), completed: false, completedAt: null,
            order: (selectedTask.subtasks?.reduce((max, s) => Math.max(max, s.order), 0) || 0) + 1000,
            createdAt: now, updatedAt: now, content: '', dueDate: null,
        };
        setTasks(prevTasks => prevTasks.map(t => t.id === selectedTask.id ? {
            ...t,
            subtasks: [...(t.subtasks || []), newSub].sort((a, b) => a.order - b.order)
        } : t));
        setNewSubtaskTitle('');
        newSubtaskInputRef.current?.focus();
    }, [selectedTask, newSubtaskTitle, setTasks, isInteractiveDisabled]);

    const handleUpdateSubtask = useCallback((subtaskId: string, updates: Partial<Omit<Subtask, 'id' | 'parentId' | 'createdAt'>>) => {
        if (!selectedTask) return;
        setTasks(prevTasks => prevTasks.map(t => t.id === selectedTask.id ? {
            ...t,
            subtasks: (t.subtasks || []).map(sub => sub.id === subtaskId ? {
                ...sub, ...updates,
                updatedAt: Date.now()
            } : sub)
        } : t));
    }, [selectedTask, setTasks]);

    const handleDeleteSubtask = useCallback((subtaskId: string) => {
        if (!selectedTask) return;
        setTasks(prevTasks => prevTasks.map(t => t.id === selectedTask.id ? {
            ...t,
            subtasks: (t.subtasks || []).filter(sub => sub.id !== subtaskId)
        } : t));
        if (editingSubtaskContentId === subtaskId) setEditingSubtaskContentId(null);
    }, [selectedTask, setTasks, editingSubtaskContentId]);

    const handleToggleEditSubtaskContent = (subtaskId: string | null) => {
        setEditingSubtaskContentId(currentId => currentId === subtaskId ? null : subtaskId);
    };

    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 3}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));
    const handleSubtaskDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'subtask-item-detail') setDraggingSubtaskId(event.active.id.toString().replace('subtask-detail-', ''));
    };
    const handleSubtaskDragEnd = (event: DragEndEvent) => {
        setDraggingSubtaskId(null);
        const {active, over} = event;
        if (!selectedTask || !active || !over || active.id === over.id) return;
        if (active.data.current?.type !== 'subtask-item-detail' || over.data.current?.type !== 'subtask-item-detail') return;
        const activeId = active.id.toString().replace('subtask-detail-', '');
        const overId = over.id.toString().replace('subtask-detail-', '');
        const oldIndex = selectedTask.subtasks?.findIndex(s => s.id === activeId) ?? -1;
        const newIndex = selectedTask.subtasks?.findIndex(s => s.id === overId) ?? -1;
        if (oldIndex !== -1 && newIndex !== -1 && selectedTask.subtasks) {
            const reorderedSubtasksRaw = arrayMove(selectedTask.subtasks, oldIndex, newIndex);
            const finalSubtasks = reorderedSubtasksRaw.map((sub, index) => ({...sub, order: (index + 1) * 1000}));
            setTasks(prevTasks => prevTasks.map(t => t.id === selectedTask.id ? {...t, subtasks: finalSubtasks} : t));
        }
    };


    const displayDueDateForPicker = localDueDate; // For footer date picker
    const displayDueDateForRender = localDueDate ?? safeParseDate(selectedTask?.dueDate);
    const overdue = useMemo(() => displayDueDateForRender && isValid(displayDueDateForRender) && !isCompleted && !isTrash && isOverdue(displayDueDateForRender), [displayDueDateForRender, isCompleted, isTrash]);
    const displayCreatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.createdAt) : '', [selectedTask]);
    const displayUpdatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.updatedAt) : '', [selectedTask]);

    const mainPanelClass = useMemo(() => twMerge(
        "h-full flex flex-col shadow-xl z-20",
        "bg-neutral-50 dark:bg-neutral-850",
        "border-l border-neutral-200 dark:border-neutral-700/70"
    ), []);

    const headerClass = useMemo(() => twMerge(
        "px-4 py-2 h-14 flex items-center justify-between flex-shrink-0",
        "border-b border-neutral-200/80 dark:border-neutral-700/60"
    ), []);

    const titleInputClasses = useMemo(() => twMerge(
        "flex-1 text-lg font-medium border-none focus:ring-0 focus:outline-none bg-transparent p-0 mx-3 leading-tight",
        "placeholder:text-neutral-400 dark:placeholder:text-neutral-500 placeholder:font-normal",
        (isInteractiveDisabled) && "line-through text-neutral-500/80 dark:text-neutral-400/80",
        "text-neutral-800 dark:text-neutral-100 tracking-tight"
    ), [isInteractiveDisabled]);

    const editorContainerClass = useMemo(() => twMerge(
        "flex-1 min-h-0 overflow-hidden",
        "prose dark:prose-invert max-w-none prose-sm prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2"
    ), []);

    const editorClasses = useMemo(() => twMerge(
        "!h-full text-sm !bg-transparent !border-none !shadow-none",
        (isInteractiveDisabled) && "opacity-60 cursor-not-allowed",
        isTrash && "pointer-events-none",
        "dark:!text-neutral-300"
    ), [isInteractiveDisabled, isTrash]);

    const footerClass = useMemo(() => twMerge(
        "px-3 py-2 h-11 flex items-center justify-between flex-shrink-0",
        "border-t border-neutral-200/80 dark:border-neutral-700/60"
    ), []);

    const actionButtonClass = useMemo(() => twMerge(
        "text-neutral-500 dark:text-neutral-400",
        "hover:bg-neutral-500/10 dark:hover:bg-neutral-700/50",
        "hover:text-neutral-700 dark:hover:text-neutral-200",
        "focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1",
        "focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-850"
    ), []);

    // UPDATED: dropdownContentClasses to align with TaskItem's actionsMenuContentClasses
    const dropdownContentClasses = useMemo(() => twMerge(
        "z-[55] bg-white dark:bg-neutral-800 min-w-[200px] w-52 p-1 rounded-base shadow-modal", // Style from TaskItem, width, padding, z-index, shadow, rounded
        "data-[state=open]:animate-dropdownShow data-[state=closed]:animate-dropdownHide"
    ), []);

    // UPDATED: datePickerPopoverWrapperClasses to align with TaskItem's datePickerPopoverWrapperClasses (which uses shadow-modal)
    // This is for the date picker launched FROM the header dropdown menu.
    const headerMenuDatePickerPopoverWrapperClasses = useMemo(() => twMerge(
        "z-[60] p-0 bg-white dark:bg-neutral-800 rounded-base shadow-modal", // Style from TaskItem
        "data-[state=open]:animate-popoverShow data-[state=closed]:animate-popoverHide"
    ), []);

    const radioItemClasses = (isSelected: boolean, itemSpecificClasses: string = "", isDanger: boolean = false) => twMerge(
        "relative flex cursor-pointer select-none items-center rounded-base px-3 py-2 text-[13px] outline-none transition-colors data-[disabled]:pointer-events-none h-8 font-normal",
        isDanger
            ? "text-red-600 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-700 dark:text-red-400 dark:data-[highlighted]:bg-red-500/15 dark:data-[highlighted]:text-red-300"
            : "data-[highlighted]:bg-black/[.07] dark:data-[highlighted]:bg-white/[.07] focus:bg-black/[.07] dark:focus:bg-white/[.07]",
        // For RadioItem, selection is handled by data-state=checked
        isSelected && !isDanger && "bg-primary/15 text-primary data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary dark:bg-primary/25 dark:text-primary-light data-[state=checked]:dark:bg-primary/25 data-[state=checked]:dark:text-primary-light",
        !isSelected && !isDanger && "text-gray-700 data-[highlighted]:text-gray-800 dark:text-neutral-200 dark:data-[highlighted]:text-neutral-50 focus:text-gray-800 dark:focus:text-neutral-50",
        // Ensure data-state=checked overrides highlighted if both are true
        "data-[state=checked]:data-[highlighted]:bg-primary/20 data-[state=checked]:dark:data-[highlighted]:bg-primary/30",
        "data-[disabled]:opacity-50",
        itemSpecificClasses
    );

    // Footer date picker might have its own style, check CustomDatePickerPopover or if it should also align.
    // The existing datePickerPopoverWrapperClasses (used for footer) is more styled (backdrop-blur, shadow-strong).
    // For consistency, if the footer date picker trigger looks like other action buttons, its popover should probably also align.
    // However, the original request was specifically for the "more dropdown", so let's keep footer date picker distinct unless specified.
    // The current footer date picker wrapper:
    // const datePickerPopoverWrapperClasses = useMemo(() => twMerge(
    //     popupContentBaseClasses, "p-0", ...
    // ), [popupContentBaseClasses]);
    // Where popupContentBaseClasses was:
    // "z-[65] bg-white dark:bg-neutral-800 backdrop-blur-md rounded-lg shadow-lg border border-black/10 dark:border-white/10 p-1.5"
    // This remains unchanged for the *footer* date picker.

    const tooltipContentClass = useMemo(() => twMerge(
        "text-[11px] bg-grey-dark dark:bg-neutral-900/95 text-white dark:text-neutral-100 px-2 py-1 rounded-base shadow-md select-none z-[75]",
        "data-[state=delayed-open]:animate-fadeIn data-[state=closed]:animate-fadeOut"
    ), []);

    // UPDATED: subTriggerClasses to align with TaskItem's SubTrigger styling
    const subTriggerClasses = useMemo(() => twMerge(
        "relative flex cursor-pointer select-none items-center rounded-base px-3 py-2 text-[13px] font-normal outline-none transition-colors data-[disabled]:pointer-events-none h-8", // TI structure: rounded-base, px-3 py-2
        "text-gray-700 dark:text-neutral-200", // Base text (equivalent to TI's text-grey-dark)
        // Equivalent to TI's: focus:bg-grey-ultra-light data-[highlighted]:bg-grey-ultra-light data-[state=open]:bg-grey-ultra-light
        "focus:bg-black/[.07] dark:focus:bg-white/[.07]",
        "data-[highlighted]:bg-black/[.07] dark:data-[highlighted]:bg-white/[.07]",
        "data-[state=open]:bg-black/[.07] dark:data-[state=open]:bg-white/[.07]",
        // Equivalent to TI's: data-[highlighted]:text-grey-dark data-[state=open]:text-grey-dark (and implied focus text color)
        "focus:text-gray-800 dark:focus:text-neutral-50",
        "data-[highlighted]:text-gray-800 dark:data-[highlighted]:text-neutral-50",
        "data-[state=open]:text-gray-800 dark:data-[state=open]:text-neutral-50",
        "data-[disabled]:opacity-50"
    ), []);

    const priorityMap: Record<number, {
        label: string;
        icon: IconName;
        color: string
    }> = useMemo(() => ({
        1: {label: 'High', icon: 'flag', color: 'text-red-500 dark:text-red-400'},
        2: {label: 'Medium', icon: 'flag', color: 'text-orange-500 dark:text-orange-400'},
        3: {label: 'Low', icon: 'flag', color: 'text-blue-500 dark:text-blue-400'},
        4: {label: 'Lowest', icon: 'flag', color: 'text-gray-500 dark:text-neutral-400'},
    }), []);

    const progressMenuItems = useMemo(() => [{
        label: 'Not Started', value: null, icon: 'circle' as IconName
    }, {label: 'Started (20%)', value: 20, icon: 'circle-dot-dashed' as IconName}, {
        label: 'Halfway (50%)', value: 50, icon: 'circle-dot' as IconName
    }, {label: 'Almost Done (80%)', value: 80, icon: 'circle-slash' as IconName}, {
        label: 'Completed (100%)', value: 100, icon: 'circle-check' as IconName
    },], []);

    const availableLists = useMemo(() => userLists.filter(l => l !== 'Trash'), [userLists]);

    const handleMoreActionsDropdownCloseFocus = useCallback((event: Event) => {
        if (isHeaderMenuDatePickerOpen) {
            event.preventDefault();
        } else {
            // Radix should handle focus return to trigger if no inner popover took focus.
            // moreActionsButtonRef.current?.focus(); // Can be uncommented if Radix needs help.
        }
    }, [isHeaderMenuDatePickerOpen]);

    const sortedSubtasks = useMemo(() => {
        if (!selectedTask?.subtasks) return [];
        return [...selectedTask.subtasks].sort((a, b) => a.order - b.order);
    }, [selectedTask?.subtasks]);

    if (!selectedTask) return null;

    return (
        <>
            <div className={mainPanelClass}>
                <div className={headerClass}>
                    <ProgressIndicator percentage={selectedTask.completionPercentage} isTrash={isTrash}
                                       onClick={cycleCompletionPercentage} size={22} className="flex-shrink-0"
                                       ariaLabelledby={`task-title-input-${selectedTask.id}`}/>
                    <input ref={titleInputRef} type="text" value={localTitle} onChange={handleTitleChange}
                           onKeyDown={handleTitleKeyDown} onBlur={handleMainContentBlur} className={titleInputClasses}
                           placeholder="Task title..." disabled={isTrash} aria-label="Task title"
                           id={`task-title-input-${selectedTask.id}`}/>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                        <Popover.Root modal={true} open={isHeaderMenuDatePickerOpen}
                                      onOpenChange={setIsHeaderMenuDatePickerOpen}>
                            <DropdownMenu.Root open={isMoreActionsOpen} onOpenChange={setIsMoreActionsOpen}>
                                <Popover.Anchor asChild>
                                    <DropdownMenu.Trigger asChild>
                                        <Button ref={moreActionsButtonRef} variant="ghost" size="icon"
                                                icon="more-horizontal"
                                                className={twMerge(actionButtonClass, "w-8 h-8")}
                                                aria-label="More actions"/>
                                    </DropdownMenu.Trigger>
                                </Popover.Anchor>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                        className={dropdownContentClasses} // UPDATED
                                        sideOffset={5}
                                        align="end"
                                        onCloseAutoFocus={handleMoreActionsDropdownCloseFocus}
                                    >
                                        <DropdownMenu.Sub>
                                            <DropdownMenu.SubTrigger className={subTriggerClasses}> {/* UPDATED */}
                                                <Icon name="circle-gauge" size={15} className="mr-2 opacity-70"/>
                                                Set Progress
                                                <div className="ml-auto pl-5"><Icon name="chevron-right" size={16}
                                                                                    strokeWidth={1.5}
                                                                                    className="opacity-70"/></div>
                                            </DropdownMenu.SubTrigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.SubContent className={dropdownContentClasses} // UPDATED
                                                                         sideOffset={2} alignOffset={-5}>
                                                    {progressMenuItems.map(item => (
                                                        <RadixMenuItem // Uses updated RadixMenuItem style
                                                            key={item.label}
                                                            icon={item.icon}
                                                            selected={selectedTask?.completionPercentage === item.value || (selectedTask?.completionPercentage === null && item.value === null)}
                                                            onSelect={() => handleProgressChange(item.value)}
                                                            disabled={isTrash}
                                                        >
                                                            {item.label}
                                                        </RadixMenuItem>
                                                    ))}
                                                </DropdownMenu.SubContent>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Sub>

                                        <DropdownMenu.Separator className="h-px bg-black/10 dark:bg-white/10 my-1"/>

                                        <RadixMenuItem // Uses updated RadixMenuItem style
                                            icon="calendar-plus"
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                setIsHeaderMenuDatePickerOpen(true);
                                            }}
                                            disabled={isTrash}
                                        >
                                            Set Due Date...
                                        </RadixMenuItem>

                                        <DropdownMenu.Separator className="h-px bg-black/10 dark:bg-white/10 my-1"/>

                                        <DropdownMenu.Sub>
                                            <DropdownMenu.SubTrigger className={subTriggerClasses}
                                                                     disabled={isInteractiveDisabled}>
                                                <Icon name="flag" size={15} className="mr-2 opacity-70"/>
                                                Priority
                                                <div className="ml-auto pl-5"><Icon name="chevron-right" size={16}
                                                                                    strokeWidth={1.5}
                                                                                    className="opacity-70"/></div>
                                            </DropdownMenu.SubTrigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.SubContent className={dropdownContentClasses}
                                                                         sideOffset={2} alignOffset={-5}>
                                                    <DropdownMenu.RadioGroup
                                                        value={String(selectedTask.priority ?? 'none')}
                                                        onValueChange={(value) => handlePriorityChange(value === 'none' ? null : Number(value))}
                                                    >
                                                        {[null, 1, 2, 3, 4].map(p => (
                                                            <DropdownMenu.RadioItem
                                                                key={p ?? 'none'}
                                                                value={String(p ?? 'none')}
                                                                className={radioItemClasses(
                                                                    selectedTask.priority === p,
                                                                    p ? priorityMap[p]?.color : ""
                                                                )}
                                                                disabled={isInteractiveDisabled} // Added disabled here
                                                            >
                                                                <Icon name={p ? priorityMap[p]?.icon : "flag"} size={15}
                                                                      className={twMerge("mr-2 flex-shrink-0 opacity-70", p ? priorityMap[p]?.color : "opacity-50")}/>
                                                                <span
                                                                    className="flex-grow">{p ? `P${p} ${priorityMap[p]?.label}` : 'None'}</span>
                                                            </DropdownMenu.RadioItem>
                                                        ))}
                                                    </DropdownMenu.RadioGroup>
                                                </DropdownMenu.SubContent>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Sub>

                                        <DropdownMenu.Sub>
                                            <DropdownMenu.SubTrigger className={subTriggerClasses} disabled={isTrash}>
                                                <Icon name="folder" size={15} className="mr-2 opacity-70"/>
                                                Move to List
                                                <div className="ml-auto pl-5"><Icon name="chevron-right" size={16}
                                                                                    strokeWidth={1.5}
                                                                                    className="opacity-70"/></div>
                                            </DropdownMenu.SubTrigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.SubContent
                                                    className={twMerge(dropdownContentClasses, "max-h-40 overflow-y-auto styled-scrollbar-thin")}
                                                    sideOffset={2} alignOffset={-5}>
                                                    <DropdownMenu.RadioGroup
                                                        value={selectedTask.list}
                                                        onValueChange={handleListChange}
                                                    >
                                                        {availableLists.map(list => (
                                                            <DropdownMenu.RadioItem
                                                                key={list}
                                                                value={list}
                                                                className={radioItemClasses(selectedTask.list === list)}
                                                                disabled={isTrash} // Added disabled here
                                                            >
                                                                <Icon name={list === 'Inbox' ? 'inbox' : 'list'}
                                                                      size={15}
                                                                      className="mr-2 flex-shrink-0 opacity-70"/>
                                                                <span className="flex-grow">{list}</span>
                                                            </DropdownMenu.RadioItem>
                                                        ))}
                                                    </DropdownMenu.RadioGroup>
                                                </DropdownMenu.SubContent>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Sub>

                                        <DropdownMenu.Separator className="h-px bg-black/10 dark:bg-white/10 my-1"/>
                                        <RadixMenuItem icon="copy-plus"
                                                       onSelect={handleDuplicateTask} // Uses updated RadixMenuItem style
                                                       disabled={isTrash}>
                                            Duplicate Task
                                        </RadixMenuItem>
                                        <DropdownMenu.Separator className="h-px bg-black/10 dark:bg-white/10 my-1"/>
                                        {isTrash ? (
                                            <RadixMenuItem icon="arrow-left"
                                                           onSelect={handleRestore} // Uses updated RadixMenuItem style
                                                           className="text-green-600 dark:text-green-500 data-[highlighted]:!bg-green-500/15 data-[highlighted]:!text-green-700 dark:data-[highlighted]:!text-green-400">
                                                Restore Task
                                            </RadixMenuItem>
                                        ) : (
                                            <RadixMenuItem icon="trash" onSelect={openDeleteConfirm}
                                                           isDanger> {/* Uses updated RadixMenuItem style */}
                                                Move to Trash
                                            </RadixMenuItem>
                                        )}
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                            <Popover.Portal>
                                <Popover.Content
                                    className={headerMenuDatePickerPopoverWrapperClasses} // UPDATED for date picker from menu
                                    sideOffset={5}
                                    align="end" // Align with more actions button
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                    onCloseAutoFocus={(e) => {
                                        e.preventDefault();
                                        moreActionsButtonRef.current?.focus();
                                    }}
                                >
                                    <CustomDatePickerContent
                                        initialDate={localDueDate ?? undefined}
                                        onSelect={handleHeaderMenuDateSelect}
                                        closePopover={closeHeaderMenuDatePickerPopover}
                                    />
                                </Popover.Content>
                            </Popover.Portal>
                        </Popover.Root>
                        <Button variant="ghost" size="icon" icon="x" onClick={handleClose}
                                className={twMerge(actionButtonClass, "w-8 h-8")}
                                aria-label="Close task details"/>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto styled-scrollbar-thin flex flex-col">
                    <div className={twMerge(editorContainerClass, "p-5 pb-3")}>
                        <CodeMirrorEditor ref={editorRef} value={localContent} onChange={handleContentChange}
                                          onBlur={handleMainContentBlur}
                                          placeholder="Add notes, links, or details here... Markdown is supported."
                                          className={editorClasses} readOnly={isInteractiveDisabled}/>
                    </div>
                    <div
                        className={twMerge(
                            "px-5 pt-4 pb-5 border-t border-neutral-200/50 dark:border-neutral-700/40",
                            "flex-shrink-0 flex flex-col",
                            sortedSubtasks.length > 0 ? "max-h-[45vh]" : ""
                        )}
                    >
                        {sortedSubtasks.length > 0 && (
                            <>
                                <div className="flex justify-between items-center mb-3 flex-shrink-0">
                                    <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                                        Subtasks
                                        <span
                                            className="ml-2 font-normal text-xs text-muted-foreground dark:text-neutral-400">
                                            ({sortedSubtasks.filter(s => s.completed).length} of {sortedSubtasks.length} completed)
                                        </span>
                                    </h3>
                                </div>
                                <div
                                    className="flex-1 overflow-y-auto styled-scrollbar-thin -mx-2 pr-2 mb-3 min-h-[80px]">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter}
                                                onDragStart={handleSubtaskDragStart} onDragEnd={handleSubtaskDragEnd}
                                                measuring={{droppable: {strategy: MeasuringStrategy.Always}}}>
                                        <SortableContext items={sortedSubtasks.map(s => `subtask-detail-${s.id}`)}
                                                         strategy={verticalListSortingStrategy}>
                                            <div className="space-y-0.5">
                                                {sortedSubtasks.map(subtask => (
                                                    <SubtaskItemDetail
                                                        key={subtask.id} subtask={subtask}
                                                        onUpdate={handleUpdateSubtask}
                                                        onDelete={handleDeleteSubtask}
                                                        isEditingContentForThis={editingSubtaskContentId === subtask.id}
                                                        onToggleEditContent={handleToggleEditSubtaskContent}
                                                        isTaskCompletedOrTrashed={isInteractiveDisabled}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                        <DragOverlay dropAnimation={null}>
                                            {draggingSubtaskId && selectedTask.subtasks?.find(s => s.id === draggingSubtaskId) ? (
                                                <SubtaskItemDetail
                                                    subtask={selectedTask.subtasks.find(s => s.id === draggingSubtaskId)!}
                                                    onUpdate={() => {
                                                    }} onDelete={() => {
                                                }}
                                                    isEditingContentForThis={false} onToggleEditContent={() => {
                                                }}
                                                    isTaskCompletedOrTrashed={isInteractiveDisabled}
                                                    isDraggingOverlay={true}
                                                />
                                            ) : null}
                                        </DragOverlay>
                                    </DndContext>
                                </div>
                            </>
                        )}

                        {!isInteractiveDisabled && (
                            <div
                                className={twMerge(
                                    "flex items-center flex-shrink-0 h-10 pt-2.5",
                                    sortedSubtasks.length > 0 ? "border-t border-neutral-200/40 dark:border-neutral-700/30 mt-auto" : "mt-1"
                                )}>
                                <input
                                    ref={newSubtaskInputRef} type="text" value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newSubtaskTitle.trim()) handleAddSubtask();
                                        if (e.key === 'Escape') setNewSubtaskTitle('');
                                    }}
                                    placeholder="+ Add subtask..."
                                    className={twMerge(
                                        "flex-1 text-[13px] h-7 px-3 rounded-md transition-all duration-150 ease-apple",
                                        "bg-neutral-200/50 dark:bg-neutral-700/40",
                                        "border border-neutral-300/60 dark:border-neutral-600/80",
                                        "focus:bg-white/70 dark:focus:bg-neutral-700/60 focus:border-primary/60 dark:focus:border-primary/70 focus:ring-1 focus:ring-primary/30 dark:focus:ring-primary/40",
                                        "placeholder:text-neutral-500/80 dark:placeholder:text-neutral-400/70",
                                        "text-neutral-800 dark:text-neutral-100",
                                        "focus:outline-none"
                                    )}
                                    aria-label="New subtask title"
                                />
                                <AnimatePresence>
                                    {newSubtaskTitle.trim() && (
                                        <motion.div initial={{opacity: 0, scale: 0.8}} animate={{opacity: 1, scale: 1}}
                                                    exit={{opacity: 0, scale: 0.8}} transition={{duration: 0.15}}>
                                            <Button variant="primary" size="sm" onClick={handleAddSubtask}
                                                    className="!h-7 !px-2.5 ml-2 !text-xs">Add</Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                <div className={footerClass}>
                    <div className="flex items-center space-x-0.5">
                        <Tooltip.Provider><Popover.Root open={isFooterDatePickerOpen} onOpenChange={(open) => {
                            setIsFooterDatePickerOpen(open);
                            if (!open) setIsDateTooltipOpen(false);
                        }}>
                            <Tooltip.Root delayDuration={300} open={isDateTooltipOpen}
                                          onOpenChange={setIsDateTooltipOpen}>
                                <Tooltip.Trigger asChild>
                                    <Popover.Trigger asChild disabled={isTrash}>
                                        <Button variant="ghost" size="icon" icon="calendar"
                                                className={twMerge(actionButtonClass, "w-8 h-8", overdue && !isCompleted && !isTrash && "text-red-500 dark:text-red-400")}
                                                aria-label="Set due date"/>
                                    </Popover.Trigger>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                    <Tooltip.Content className={tooltipContentClass} side="top" sideOffset={6}>
                                        {displayDueDateForRender && isValid(displayDueDateForRender) ? `Due: ${formatRelativeDate(displayDueDateForRender, true)}` : 'Set Due Date'}
                                        <Tooltip.Arrow className="fill-grey-dark dark:fill-neutral-900/95"/>
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                            <Popover.Portal>
                                <Popover.Content
                                    className={twMerge( // Footer date picker popover content style - kept distinct from menu's date picker
                                        "z-[65] bg-white dark:bg-neutral-800 backdrop-blur-md rounded-lg shadow-lg border border-black/10 dark:border-white/10 p-0", // p-0 for CustomDatePickerContent
                                        "data-[state=open]:animate-popoverShow data-[state=closed]:animate-popoverHide"
                                    )}
                                    sideOffset={5}
                                    align="start"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                    onCloseAutoFocus={(e) => e.preventDefault()}>
                                    <CustomDatePickerContent initialDate={displayDueDateForPicker}
                                                             onSelect={handleFooterDatePickerSelect}
                                                             closePopover={closeFooterDatePickerPopover}/>
                                </Popover.Content>
                            </Popover.Portal>
                        </Popover.Root></Tooltip.Provider>
                    </div>

                    <div className="flex items-center">
                        <Tooltip.Provider><Popover.Root open={isInfoPopoverOpen} onOpenChange={(open) => {
                            setIsInfoPopoverOpen(open);
                            if (!open) setIsInfoTooltipOpen(false);
                        }}>
                            <Tooltip.Root delayDuration={300} open={isInfoTooltipOpen}
                                          onOpenChange={setIsInfoTooltipOpen}>
                                <Tooltip.Trigger asChild>
                                    <Popover.Trigger asChild>
                                        <Button variant="ghost" size="icon" icon="info"
                                                className={twMerge(actionButtonClass, "w-8 h-8")}
                                                aria-label="View task information"/>
                                    </Popover.Trigger>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                    <Tooltip.Content className={tooltipContentClass} side="top" sideOffset={6}>
                                        Task Information
                                        <Tooltip.Arrow className="fill-grey-dark dark:fill-neutral-900/95"/>
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                            <Popover.Portal>
                                <Popover.Content
                                    className={twMerge(dropdownContentClasses, "p-3 text-xs w-auto")} // Info popover can use dropdownContentClasses for consistency
                                    side="top" align="end" sideOffset={5}
                                    onCloseAutoFocus={(e) => e.preventDefault()}>
                                    <div className="space-y-1.5 text-neutral-600 dark:text-neutral-300">
                                        <p>
                                            <strong
                                                className="font-medium text-neutral-700 dark:text-neutral-200">Created:</strong>
                                            {displayCreatedAt}
                                        </p>
                                        <p><strong
                                            className="font-medium text-neutral-700 dark:text-neutral-200">Updated:</strong> {displayUpdatedAt}
                                        </p>
                                    </div>
                                </Popover.Content>
                            </Popover.Portal>
                        </Popover.Root></Tooltip.Provider>
                    </div>
                </div>
            </div>
            {selectedTask && (
                <ConfirmDeleteModalRadix isOpen={isDeleteDialogOpen} onClose={closeDeleteConfirm}
                                         onConfirm={confirmDelete}
                                         itemTitle={selectedTask.title || 'Untitled Task'}
                                         title="Move to Trash?"
                                         confirmText="Move to Trash"
                                         confirmVariant="danger"
                />
            )}
        </>
    );
};
TaskDetail.displayName = 'TaskDetail';
export default TaskDetail;