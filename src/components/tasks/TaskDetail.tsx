// src/components/tasks/TaskDetail.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {getTaskGroupCategory, selectedTaskAtom, selectedTaskIdAtom, tasksAtom, userListNamesAtom} from '@/store/atoms'; // Import getTaskGroupCategory helper
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, {CodeMirrorEditorRef} from '../common/CodeMirrorEditor';
import {formatDateTime, formatRelativeDate, isOverdue, isValid, safeParseDate, startOfDay} from '@/utils/dateUtils';
import {Task} from '@/types';
import {AnimatePresence, motion} from 'framer-motion';
import {usePopper} from 'react-popper';
import {twMerge} from 'tailwind-merge';
import CustomDatePickerPopover from '../common/CustomDatePickerPopover';
import {IconName} from "@/components/common/IconMap";

// --- Custom Hook for Click Away ---
function useClickAway(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current;
            if (!el || el.contains(event.target as Node) || (event.target as Element).closest('.date-picker-popover, .dropdown-content')) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

// --- Reusable Dropdown Component (Memoized) ---
interface DropdownRenderProps {
    close: () => void;
}

interface DropdownProps {
    trigger: React.ReactElement;
    children: React.ReactNode | ((props: DropdownRenderProps) => React.ReactNode);
    contentClassName?: string;
    placement?: import('@popperjs/core').Placement;
    wrapperClassName?: string;
}

const Dropdown: React.FC<DropdownProps> = memo(({
                                                    trigger,
                                                    children,
                                                    contentClassName,
                                                    placement = 'bottom-start',
                                                    wrapperClassName
                                                }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null);
    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const {styles, attributes} = usePopper(referenceElement, popperElement, {
        placement: placement,
        modifiers: [{name: 'offset', options: {offset: [0, 6]}}],
    });
    const close = useCallback(() => setIsOpen(false), []);
    useClickAway(dropdownRef, close);
    const handleTriggerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setIsOpen(prev => !prev);
    }, []);
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTriggerClick(e as any);
        } else if (e.key === 'Escape') {
            close();
        }
    }, [handleTriggerClick, close]);

    return (
        <div ref={dropdownRef} className={twMerge("relative inline-block w-full", wrapperClassName)}>
            <div ref={setReferenceElement} onClick={handleTriggerClick} className="w-full cursor-pointer" role="button"
                 aria-haspopup="listbox" aria-expanded={isOpen} tabIndex={0} onKeyDown={handleKeyDown}>
                {trigger}
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div ref={setPopperElement} style={styles.popper} {...attributes.popper}
                                className={twMerge('dropdown-content z-30 min-w-[180px] overflow-hidden', !contentClassName?.includes('date-picker-popover') && 'bg-glass-100 backdrop-blur-xl rounded-lg shadow-strong border border-black/10', contentClassName)}
                                initial={{opacity: 0, scale: 0.95, y: -5}} animate={{opacity: 1, scale: 1, y: 0}}
                                exit={{opacity: 0, scale: 0.95, y: -5, transition: {duration: 0.1}}}
                                transition={{duration: 0.15, ease: 'easeOut'}}
                                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                        {typeof children === 'function' ? children({close}) : children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
Dropdown.displayName = 'Dropdown';

// --- TaskDetail Component ---
const TaskDetail: React.FC = () => {
    const [selectedTask] = useAtom(selectedTaskAtom);
    const setTasks = useSetAtom(tasksAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const userLists = useAtomValue(userListNamesAtom);

    // Local state still needed for controlled inputs
    const [localTitle, setLocalTitle] = useState('');
    const [localContent, setLocalContent] = useState('');
    const [localDueDate, setLocalDueDate] = useState<Date | undefined>(undefined);
    const [localTags, setLocalTags] = useState('');

    // Refs for input elements and editor
    const titleInputRef = useRef<HTMLInputElement>(null);
    const tagsInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<CodeMirrorEditorRef>(null);

    // Refs to hold the *latest* input values, bypassing state async nature for debounce capture
    const latestTitleRef = useRef(localTitle);
    const latestContentRef = useRef(localContent);
    const latestTagsRef = useRef(localTags);
    // No ref needed for dueDate as it's updated directly via updateTask

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasUnsavedChangesRef = useRef(false);
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);


    // --- Sync Local State AND Latest Refs from Atom ---
    // This effect now also updates the `latest*Ref` values when the task changes.
    useEffect(() => {
        if (selectedTask) {
            const isTitleFocused = titleInputRef.current === document.activeElement;
            const isTagsFocused = tagsInputRef.current === document.activeElement;
            const isContentFocused = editorRef.current?.getView()?.hasFocus ?? false;

            // Update local state AND latest refs if not focused
            if (!isTitleFocused) {
                // Only update if different to prevent feedback loop
                if (selectedTask.title !== latestTitleRef.current) {
                    setLocalTitle(selectedTask.title);
                    latestTitleRef.current = selectedTask.title;
                }
            } else {
                // If focused, ensure ref matches current state (which reflects user input)
                latestTitleRef.current = localTitle;
            }

            const taskContent = selectedTask.content || '';
            if (!isContentFocused) {
                if (taskContent !== latestContentRef.current) {
                    setLocalContent(taskContent);
                    latestContentRef.current = taskContent;
                }
            } else {
                latestContentRef.current = localContent;
            }

            // Update dueDate state (ref not strictly needed here)
            const taskDueDate = safeParseDate(selectedTask.dueDate);
            const taskDueTime = taskDueDate && isValid(taskDueDate) ? taskDueDate.getTime() : undefined;
            const currentLocalTime = localDueDate?.getTime();
            if (taskDueTime !== currentLocalTime) {
                setLocalDueDate(taskDueDate && isValid(taskDueDate) ? taskDueDate : undefined);
            }

            const taskTagsString = (selectedTask.tags ?? []).join(', ');
            if (!isTagsFocused) {
                if (taskTagsString !== latestTagsRef.current) {
                    setLocalTags(taskTagsString);
                    latestTagsRef.current = taskTagsString;
                }
            } else {
                latestTagsRef.current = localTags;
            }

            // Reset unsaved changes flag on task change
            hasUnsavedChangesRef.current = false;

            // Auto-focus (keep as is)
            if (selectedTask.title === '' && !isTitleFocused) {
                const timer = setTimeout(() => {
                    if (isMountedRef.current) titleInputRef.current?.focus();
                }, 50);
                return () => clearTimeout(timer);
            }
        } else {
            // Reset local state and refs if no task selected
            setLocalTitle('');
            latestTitleRef.current = '';
            setLocalContent('');
            latestContentRef.current = '';
            setLocalDueDate(undefined);
            setLocalTags('');
            latestTagsRef.current = '';
            hasUnsavedChangesRef.current = false;
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
        // Dependency only on task ID to trigger full sync
    }, [selectedTask?.id]);


    // --- Debounced Save Function (Reads from Refs) ---
    const triggerSave = useCallback(() => {
        if (!selectedTask || !isMountedRef.current) return;

        hasUnsavedChangesRef.current = true; // Mark pending changes
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); // Clear existing timeout

        // No need to capture state here anymore, we read refs inside setTimeout

        saveTimeoutRef.current = setTimeout(() => {
            if (!hasUnsavedChangesRef.current || !selectedTask || !isMountedRef.current) return;

            // *** Read the LATEST values directly from refs inside the timeout ***
            const currentTitle = latestTitleRef.current;
            const currentContent = latestContentRef.current;
            // Due date uses local state as it's not updated via debounced text input
            const currentDueDate = localDueDate;
            const currentTags = latestTagsRef.current;

            // Process the *latest* values
            const processedTitle = currentTitle.trim() || "Untitled Task";
            const processedDueDate = currentDueDate && isValid(currentDueDate) ? currentDueDate.getTime() : null;
            const processedTags = currentTags.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

            // Compare latest processed values against the original task state
            const originalTaskState = selectedTask; // Use task state from closure when debounce was set
            const changesToSave: Partial<Task> = {};
            let needsCategoryRecalc = false;

            if (processedTitle !== originalTaskState.title) changesToSave.title = processedTitle;
            // Compare content from ref
            if (currentContent !== (originalTaskState.content || '')) changesToSave.content = currentContent;
            // Compare processed due date from local state
            if (processedDueDate !== (originalTaskState.dueDate ?? null)) {
                changesToSave.dueDate = processedDueDate;
                needsCategoryRecalc = true;
            }
            // Compare processed tags from ref
            const originalTagsSorted = (originalTaskState.tags ?? []).slice().sort();
            const processedTagsSorted = processedTags.slice().sort();
            if (JSON.stringify(processedTagsSorted) !== JSON.stringify(originalTagsSorted)) changesToSave.tags = processedTags;

            // Only proceed if there are effective changes
            if (Object.keys(changesToSave).length === 0) {
                hasUnsavedChangesRef.current = false;
                saveTimeoutRef.current = null;
                return;
            }
            changesToSave.updatedAt = Date.now();

            // console.log("Saving via Debounce (from refs):", changesToSave); // Debug log
            setTasks((prevTasks) =>
                prevTasks.map((t) => {
                    if (t.id === originalTaskState.id) {
                        const updatedTask = {...t, ...changesToSave};
                        if (needsCategoryRecalc) updatedTask.groupCategory = getTaskGroupCategory(updatedTask);
                        return updatedTask;
                    }
                    return t;
                })
            );
            hasUnsavedChangesRef.current = false;
            saveTimeoutRef.current = null;
        }, 500); // 500ms debounce

        // Dependencies: selectedTask and setTasks are needed for the closure.
        // Local state vars are NOT needed as deps because we read from refs.
    }, [selectedTask, setTasks, localDueDate]); // localDueDate is needed as it's read directly


    // --- Direct Update Function (Keep previous logic) ---
    const updateTask = useCallback((updates: Partial<Task>) => {
        if (!selectedTask || !isMountedRef.current) return;
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        hasUnsavedChangesRef.current = false;
        const needsCategoryRecalc = ('dueDate' in updates && updates.dueDate !== selectedTask.dueDate) || ('completed' in updates && updates.completed !== selectedTask.completed) || ('list' in updates && updates.list !== selectedTask.list);
        // console.log("Saving via Direct Update:", updates); // Debug log
        setTasks(prevTasks => prevTasks.map(t => {
            if (t.id === selectedTask.id) {
                const updatedTask = {...t, ...updates, updatedAt: Date.now()};
                if (needsCategoryRecalc) updatedTask.groupCategory = getTaskGroupCategory(updatedTask);
                return updatedTask;
            }
            return t;
        }));
    }, [selectedTask, setTasks]);


    // --- Event Handlers (Use triggerSave/updateTask correctly) ---
    const handleClose = useCallback(() => {
        if (hasUnsavedChangesRef.current) {
            triggerSave();
        }
        setSelectedTaskId(null);
    }, [setSelectedTaskId, triggerSave]);
    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        latestTitleRef.current = newValue; // Update ref immediately
        setLocalTitle(newValue);         // Update state for controlled input
        triggerSave();                  // Trigger debounce
    }, [triggerSave]);

    const handleContentChange = useCallback((newValue: string) => {
        latestContentRef.current = newValue; // Update ref immediately
        setLocalContent(newValue);        // Update state for controlled input
        triggerSave();                 // Trigger debounce
    }, [triggerSave]);

    const handleTagInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        latestTagsRef.current = newValue; // Update ref immediately
        setLocalTags(newValue);          // Update state for controlled input
        triggerSave();                  // Trigger debounce
    }, [triggerSave]);
    const handleDatePickerSelect = useCallback((date: Date | undefined) => {
        const newDate = date && isValid(date) ? startOfDay(date) : undefined;
        setLocalDueDate(newDate);
        updateTask({dueDate: newDate ? newDate.getTime() : null});
    }, [updateTask]);
    const handleListChange = useCallback((newList: string, closeDropdown?: () => void) => {
        updateTask({list: newList});
        closeDropdown?.();
    }, [updateTask]);
    const handlePriorityChange = useCallback((newPriority: number | null, closeDropdown?: () => void) => {
        updateTask({priority: newPriority});
        closeDropdown?.();
    }, [updateTask]);
    const handleToggleComplete = useCallback(() => {
        if (!selectedTask || selectedTask.list === 'Trash') return;
        const newCompletedStatus = !selectedTask.completed;
        updateTask({completed: newCompletedStatus, completedAt: newCompletedStatus ? Date.now() : null});
    }, [selectedTask, updateTask]);
    const handleDelete = useCallback(() => {
        if (!selectedTask) return;
        updateTask({list: 'Trash', completed: false, completedAt: null});
        setSelectedTaskId(null);
    }, [selectedTask, updateTask, setSelectedTaskId]);
    const handleRestore = useCallback(() => {
        if (!selectedTask || selectedTask.list !== 'Trash') return;
        updateTask({list: 'Inbox'});
    }, [selectedTask, updateTask]);

    // --- Keyboard Handlers (Keep previous logic) ---
    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleInputRef.current?.blur();
        } else if (e.key === 'Escape' && selectedTask) {
            e.preventDefault();
            if (localTitle !== selectedTask.title) {
                setLocalTitle(selectedTask.title);
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                hasUnsavedChangesRef.current = false;
            }
            titleInputRef.current?.blur();
        }
    }, [selectedTask, localTitle]);
    const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape' && selectedTask) {
            e.preventDefault();
            const originalTagsString = (selectedTask.tags ?? []).join(', ');
            if (localTags !== originalTagsString) {
                setLocalTags(originalTagsString);
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                hasUnsavedChangesRef.current = false;
            }
            (e.target as HTMLInputElement).blur();
        }
    }, [selectedTask, localTags]);


    // --- Memos for Display Logic (Keep as is) ---
    const priorityMap: Record<number, { label: string; iconColor: string }> = useMemo(() => ({
        1: {
            label: 'High',
            iconColor: 'text-red-500'
        },
        2: {label: 'Medium', iconColor: 'text-orange-500'},
        3: {label: 'Low', iconColor: 'text-blue-500'},
        4: {label: 'Lowest', iconColor: 'text-gray-500'},
    }), []);
    const isTrash = useMemo(() => selectedTask?.list === 'Trash', [selectedTask?.list]);
    const isCompleted = useMemo(() => selectedTask?.completed && !isTrash, [selectedTask?.completed, isTrash]);
    const overdue = useMemo(() => {
        const dateToCheck = localDueDate ?? safeParseDate(selectedTask?.dueDate);
        return dateToCheck && isValid(dateToCheck) && !selectedTask?.completed && !isTrash && isOverdue(dateToCheck);
    }, [localDueDate, selectedTask?.dueDate, selectedTask?.completed, isTrash]);
    const displayPriority = selectedTask?.priority;
    const displayList = selectedTask?.list;
    const displayCreatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.createdAt) : '', [selectedTask?.createdAt]);
    const displayUpdatedAt = useMemo(() => selectedTask ? formatDateTime(selectedTask.updatedAt) : '', [selectedTask?.updatedAt]);


    if (!selectedTask) return null;

    // --- Render (Add ref to tags input) ---
    return (
        <div
            className={twMerge("border-l border-black/10 w-[420px] shrink-0 h-full flex flex-col shadow-xl z-20", "bg-glass-100 backdrop-blur-xl")}
            key={selectedTask.id}>
            {/* Header */}
            <div
                className="px-3 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 h-11 bg-glass-alt-100 backdrop-blur-lg">
                <div className="w-20 flex justify-start">
                    {isTrash ? (<Button variant="ghost" size="sm" icon="arrow-left" onClick={handleRestore}
                                        className="text-green-600 hover:bg-green-400/20 hover:text-green-700 text-xs px-1.5"> Restore </Button>) : (
                        <Button variant="ghost" size="icon" icon="trash" onClick={handleDelete}
                                className="text-red-600 hover:bg-red-400/20 hover:text-red-700 w-7 h-7"
                                aria-label="Move task to Trash"/>)}
                </div>
                <div className="flex-1 text-center h-4"></div>
                <div className="w-20 flex justify-end"><Button variant="ghost" size="icon" icon="x"
                                                               onClick={handleClose} aria-label="Close task details"
                                                               className="text-muted-foreground hover:bg-black/15 w-7 h-7"/>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 styled-scrollbar flex flex-col">
                {/* Checkbox and Title */}
                <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
                    <button onClick={handleToggleComplete}
                            className={twMerge("mt-0 flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors duration-30 ease-apple appearance-none cursor-pointer", "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-glass-100", isCompleted ? 'bg-gray-400 border-gray-400 hover:bg-gray-500' : 'bg-white/40 border-gray-400 hover:border-primary/80 backdrop-blur-sm', 'relative after:content-[""] after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-[60%]', 'after:h-[10px] after:w-[5px] after:rotate-45 after:border-b-[2.5px] after:border-r-[2.5px] after:border-solid after:border-transparent after:transition-opacity after:duration-100', isCompleted ? 'after:border-white after:opacity-100' : 'after:opacity-0', isTrash && 'cursor-not-allowed opacity-50 !border-gray-300 hover:!border-gray-300 !bg-gray-200/50 after:!border-gray-400')}
                            aria-pressed={isCompleted} disabled={isTrash}
                            aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}/>
                    <input ref={titleInputRef} type="text" value={localTitle} onChange={handleTitleChange}
                           onKeyDown={handleTitleKeyDown}
                           className={twMerge("w-full text-lg font-medium border-none focus:ring-0 focus:outline-none bg-transparent p-0 m-0 leading-tight", "placeholder:text-muted placeholder:font-normal", (isCompleted || isTrash) && "line-through text-muted-foreground", "task-detail-title-input")}
                           placeholder="Task title..." disabled={isTrash} aria-label="Task title"
                           id={`task-title-input-${selectedTask.id}`}/>
                </div>

                {/* Metadata Section */}
                <div className="space-y-1.5 text-sm border-t border-b border-black/10 py-2.5 my-4 flex-shrink-0">
                    {/* Due Date Row */}
                    <MetaRow icon="calendar" label="Due Date" disabled={isTrash}>
                        <Dropdown trigger={<Button variant="ghost" size="sm"
                                                   className={twMerge("text-xs h-7 px-1.5 w-full text-left justify-start font-normal truncate hover:bg-black/10 backdrop-blur-sm", localDueDate ? 'text-gray-700' : 'text-muted-foreground', overdue && 'text-red-600 font-medium', isTrash && 'text-muted line-through !bg-transparent hover:!bg-transparent')}
                                                   disabled={isTrash}> {localDueDate && isValid(localDueDate) ? formatRelativeDate(localDueDate) : 'Set date'} </Button>}
                                  contentClassName="date-picker-popover p-0 border-0 shadow-none bg-transparent"
                                  placement="bottom-end">
                            {(props) => (
                                <CustomDatePickerPopover initialDate={localDueDate} onSelect={handleDatePickerSelect}
                                                         close={props.close}/>)}
                        </Dropdown>
                    </MetaRow>
                    {/* List Row */}
                    <MetaRow icon="list" label="List" disabled={isTrash}>
                        <Dropdown trigger={<Button variant="ghost" size="sm"
                                                   className="text-xs h-7 px-1.5 w-full text-left justify-start text-gray-700 font-normal disabled:text-muted disabled:line-through truncate hover:bg-black/10 backdrop-blur-sm disabled:hover:!bg-transparent"
                                                   disabled={isTrash || displayList === 'Trash'}> {displayList} </Button>}
                                  contentClassName="max-h-48 overflow-y-auto styled-scrollbar py-1">
                            {(props) => (<> {userLists.filter(l => l !== 'Trash').map(list => (
                                <button key={list} onClick={() => handleListChange(list, props.close)}
                                        className={twMerge("block w-full text-left px-2.5 py-1 text-sm hover:bg-black/15 transition-colors duration-100 ease-apple focus:outline-none focus-visible:bg-black/10", displayList === list && "bg-primary/20 text-primary font-medium")}
                                        role="menuitemradio"
                                        aria-checked={displayList === list}> {list} </button>))} </>)}
                        </Dropdown>
                    </MetaRow>
                    {/* Priority Row */}
                    <MetaRow icon="flag" label="Priority" disabled={isTrash}>
                        <Dropdown trigger={<Button variant="ghost" size="sm"
                                                   className={twMerge("text-xs h-7 px-1.5 w-full text-left justify-start font-normal disabled:text-muted disabled:line-through truncate hover:bg-black/10 backdrop-blur-sm", displayPriority ? priorityMap[displayPriority]?.iconColor : 'text-gray-700', isTrash && 'hover:!bg-transparent')}
                                                   icon={displayPriority ? 'flag' : undefined}
                                                   disabled={isTrash}> {displayPriority ? `P${displayPriority} ${priorityMap[displayPriority]?.label}` : 'Set Priority'} </Button>}
                                  contentClassName="py-1">
                            {(props) => (<> {[1, 2, 3, 4, null].map(p => (
                                <button key={p ?? 'none'} onClick={() => handlePriorityChange(p, props.close)}
                                        className={twMerge("block w-full text-left px-2.5 py-1 text-sm hover:bg-black/15 transition-colors duration-100 ease-apple flex items-center focus:outline-none focus-visible:bg-black/10", displayPriority === p && "bg-primary/20 text-primary font-medium", p && priorityMap[p]?.iconColor)}
                                        role="menuitemradio" aria-checked={displayPriority === p}> {p &&
                                    <Icon name="flag" size={14}
                                          className="mr-1.5 flex-shrink-0"/>} {p ? `P${p} ${priorityMap[p]?.label}` : 'None'} </button>))} </>)}
                        </Dropdown>
                    </MetaRow>
                    {/* Tags Row */}
                    <MetaRow icon="tag" label="Tags" disabled={isTrash}>
                        <input
                            ref={tagsInputRef} // Assign ref here
                            type="text"
                            value={localTags}
                            onChange={handleTagInputChange}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Add tags (comma-separated)"
                            className={twMerge("flex-1 text-xs h-7 px-1.5 border-none focus:ring-0 bg-transparent rounded-sm w-full", "hover:bg-white/15 focus:bg-white/20 backdrop-blur-sm transition-colors duration-30 ease-apple", "placeholder:text-muted placeholder:font-normal", "disabled:bg-transparent disabled:hover:bg-transparent disabled:text-muted disabled:line-through disabled:placeholder:text-transparent")}
                            disabled={isTrash} aria-label="Tags (comma-separated)"
                        />
                    </MetaRow>
                </div>
                {/* Content Editor */}
                <div className="task-detail-content-editor flex-1 min-h-[150px] flex flex-col mb-4">
                    <CodeMirrorEditor ref={editorRef} value={localContent} onChange={handleContentChange}
                                      placeholder="Add notes, links, or details here... Markdown is supported."
                                      className={twMerge("!min-h-[150px] h-full text-sm", (isCompleted || isTrash) && "opacity-70")}
                                      readOnly={isTrash}/>
                </div>
            </div>
            {/* Footer */}
            <div
                className="px-4 py-2 border-t border-black/10 flex justify-end items-center flex-shrink-0 h-9 bg-glass-alt-200 backdrop-blur-lg">
                <div className="text-[11px] text-muted-foreground space-x-4">
                    <span>Created: {displayCreatedAt}</span>
                    <span>Updated: {displayUpdatedAt}</span></div>
            </div>
        </div>
    );
};

// --- Metadata Row Component (Memoized) ---
const MetaRow: React.FC<{ icon: IconName; label: string; children: React.ReactNode, disabled?: boolean }> = memo(({ icon, label, children, disabled = false }) => {
    const rowClassName = useMemo(() => twMerge("flex items-center justify-between group min-h-[34px] px-1 rounded", !disabled && "hover:bg-black/5 transition-colors duration-100 ease-apple", disabled && "opacity-60 pointer-events-none"), [disabled]);
    return ( <div className={rowClassName}> <span className="text-muted-foreground flex items-center text-xs font-medium w-24 flex-shrink-0"> <Icon name={icon} size={14} className="mr-1.5 opacity-70" />{label} </span> <div className="flex-1 text-right min-w-0"> {children} </div> </div> );
});
MetaRow.displayName = 'MetaRow';

export default TaskDetail;