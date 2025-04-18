// src/components/tasks/TaskDetail.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
    selectedTaskAtom,
    tasksAtom,
    selectedTaskIdAtom,
    userListNamesAtom,
} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, { CodeMirrorEditorRef } from '../common/CodeMirrorEditor';
import { formatDateTime, formatRelativeDate, isOverdue, safeParseDate, isValid, startOfDay, addDays } from '@/utils/dateUtils';
import { Task } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker, SelectSingleEventHandler } from 'react-day-picker';
import { twMerge } from 'tailwind-merge';
import { usePopper } from 'react-popper';
import { IconName } from "@/components/common/IconMap.tsx";

// --- Custom Hook for Click Away ---
function useClickAway(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current;
            if (!el || el.contains(event.target as Node)) {
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
interface DropdownRenderProps { close: () => void; }
interface DropdownProps {
    trigger: React.ReactElement;
    children: React.ReactNode | ((props: DropdownRenderProps) => React.ReactNode);
    contentClassName?: string;
    placement?: import('@popperjs/core').Placement;
}

const Dropdown: React.FC<DropdownProps> = memo(({ trigger, children, contentClassName, placement = 'bottom-start' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: placement,
        modifiers: [{ name: 'offset', options: { offset: [0, 6] } }],
    });

    const close = useCallback(() => setIsOpen(false), []);
    useClickAway(dropdownRef, close);

    const TriggerElement = React.cloneElement(trigger, {
        ref: setReferenceElement,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
            trigger.props.onClick?.(e);
        },
        'aria-haspopup': 'true',
        'aria-expanded': isOpen,
    });

    return (
        <div ref={dropdownRef} className="relative inline-block w-full">
            {TriggerElement}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={setPopperElement}
                        style={styles.popper}
                        {...attributes.popper}
                        className={twMerge(
                            // Apply strong glass effect by default
                            'z-30 min-w-[180px] overflow-hidden',
                            'bg-glass-100 backdrop-blur-xl rounded-lg shadow-strong border border-black/10', // Strongest glass
                            contentClassName // Allow overrides
                        )}
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                    >
                        {typeof children === 'function' ? children({ close }) : children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
Dropdown.displayName = 'Dropdown';

// --- Redesigned Date Picker Popover Content ---
interface DatePickerPopoverProps {
    selectedDate: Date | undefined;
    onSelect: (date: Date | undefined) => void; // Handles Date and undefined for clearing
    close: () => void; // Function to close the popover
}

const DatePickerPopoverContent: React.FC<DatePickerPopoverProps> = ({ selectedDate, onSelect, close }) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const tomorrow = useMemo(() => startOfDay(addDays(today, 1)), [today]);
    const nextWeek = useMemo(() => startOfDay(addDays(today, 7)), [today]);

    const handleQuickSelect = (date: Date | null) => {
        onSelect(date ?? undefined); // Pass Date or undefined
        close();
    };

    // DayPicker requires SelectSingleEventHandler signature
    const handleDayPickerSelect: SelectSingleEventHandler = (day) => {
        onSelect(day); // day is Date | undefined
        close();
    };

    const footer = (
        <div className="flex justify-end pt-2 border-t border-black/10 mt-2 px-1">
            <Button
                variant="link"
                size="sm"
                onClick={() => handleQuickSelect(null)} // Clear date
                disabled={!selectedDate}
                className="text-xs text-muted-foreground hover:text-red-500"
                icon="x-circle"
            >
                Clear Date
            </Button>
        </div>
    );

    return (
        // Overall container with padding
        <div className="p-2">
            {/* Quick Select Buttons */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
                <Button variant="glass" size="sm" onClick={() => handleQuickSelect(today)} icon="calendar-check">Today</Button>
                <Button variant="glass" size="sm" onClick={() => handleQuickSelect(tomorrow)} icon="sunset">Tomorrow</Button>
                <Button variant="glass" size="sm" onClick={() => handleQuickSelect(nextWeek)} icon="calendar-plus">Next Week</Button>
                <Button variant="glass" size="sm" onClick={() => handleQuickSelect(null)} icon="moon">No Date</Button>
            </div>

            {/* Separator */}
            <hr className="border-black/10 my-2" />

            {/* DayPicker Calendar */}
            <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDayPickerSelect} // Use the correctly typed handler
                modifiersClassNames={{
                    today: 'rdp-day_today',
                    selected: 'rdp-day_selected',
                    outside: 'rdp-day_outside',
                    disabled: 'rdp-day_disabled',
                }}
                showOutsideDays
                fixedWeeks
                footer={footer}
            />
        </div>
    );
};


// --- TaskDetail Component (Redesigned) ---
const TaskDetail: React.FC = () => {
    const selectedTask = useAtomValue(selectedTaskAtom);
    const setTasks = useSetAtom(tasksAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const userLists = useAtomValue(userListNamesAtom);

    const [editableTitle, setEditableTitle] = useState('');
    const [editableContent, setEditableContent] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined);
    const [tagInputValue, setTagInputValue] = useState('');

    const titleInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const isSavingRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasUnsavedChanges = useRef(false);

    // Effect to sync local state when selected task changes
    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        isSavingRef.current = false;
        hasUnsavedChanges.current = false;

        if (selectedTask) {
            setEditableTitle(selectedTask.title);
            setEditableContent(selectedTask.content || '');
            const initialDate = safeParseDate(selectedTask.dueDate);
            setSelectedDueDate(initialDate && isValid(initialDate) ? initialDate : undefined);
            setTagInputValue((selectedTask.tags ?? []).join(', '));

            if (selectedTask.title === '') {
                const timer = setTimeout(() => { titleInputRef.current?.focus(); }, 120);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedTask]);

    // --- Debounced Save Function ---
    const saveChanges = useCallback((updatedFields: Partial<Omit<Task, 'groupCategory' | 'order'>> = {}) => {
        if (!selectedTask || isSavingRef.current) return;
        hasUnsavedChanges.current = true;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            const taskAtDebounceStart = selectedTask; // Use closure value
            if (!taskAtDebounceStart || !hasUnsavedChanges.current) {
                isSavingRef.current = false;
                return;
            }
            isSavingRef.current = true;

            const currentTitle = editableTitle.trim() || "Untitled Task";
            const currentContent = editableContent;
            const currentTags = tagInputValue.split(',').map(t => t.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // Unique tags
            const currentDueDateMs = selectedDueDate && isValid(selectedDueDate) ? selectedDueDate.getTime() : null;

            const currentState = {
                ...taskAtDebounceStart,
                title: currentTitle,
                content: currentContent,
                tags: currentTags,
                dueDate: currentDueDateMs,
            };
            const mergedFields = { ...currentState, ...updatedFields };

            // Simplified Check: Compare key fields directly
            const needsServerUpdate =
                mergedFields.title !== taskAtDebounceStart.title ||
                mergedFields.content !== (taskAtDebounceStart.content || '') ||
                mergedFields.completed !== taskAtDebounceStart.completed ||
                mergedFields.list !== taskAtDebounceStart.list ||
                mergedFields.priority !== taskAtDebounceStart.priority ||
                mergedFields.dueDate !== taskAtDebounceStart.dueDate ||
                JSON.stringify((mergedFields.tags ?? []).sort()) !== JSON.stringify((taskAtDebounceStart.tags ?? []).sort());


            if (!needsServerUpdate) {
                isSavingRef.current = false;
                hasUnsavedChanges.current = false;
                return;
            }

            const finalUpdatedTask: Task = {
                ...taskAtDebounceStart,
                ...mergedFields,
                updatedAt: Date.now(),
                // order and groupCategory are handled by tasksAtom setter
            };

            setTasks((prevTasks) =>
                prevTasks.map((t) => (t.id === taskAtDebounceStart.id ? finalUpdatedTask : t))
            );

            isSavingRef.current = false;
            hasUnsavedChanges.current = false;
        }, 350); // Slightly longer debounce

    }, [selectedTask, setTasks, editableTitle, editableContent, selectedDueDate, tagInputValue]);

    // --- Event Handlers ---
    const handleClose = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (hasUnsavedChanges.current && selectedTask) {
            isSavingRef.current = false;
            saveChanges({});
        }
        setSelectedTaskId(null);
    }, [setSelectedTaskId, saveChanges, selectedTask]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditableTitle(e.target.value);
        saveChanges();
    };

    const handleTitleBlur = () => {
        const trimmedTitle = editableTitle.trim();
        if (selectedTask && trimmedTitle !== selectedTask.title) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            isSavingRef.current = false;
            saveChanges({ title: trimmedTitle });
        }
    };
    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); titleInputRef.current?.blur(); }
        else if (e.key === 'Escape') {
            if (selectedTask) setEditableTitle(selectedTask.title);
            hasUnsavedChanges.current = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            titleInputRef.current?.blur();
        }
    };

    const handleContentChange = useCallback((newValue: string) => {
        setEditableContent(newValue);
        saveChanges();
    }, [saveChanges]);

    const handleContentBlur = useCallback(() => {
        if (selectedTask && editableContent !== (selectedTask.content || '')) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            isSavingRef.current = false;
            saveChanges({ content: editableContent });
        }
    }, [saveChanges, selectedTask, editableContent]);

    // --- Date Picker Handler ---
    const handleDatePickerSelect = useCallback((day: Date | undefined) => {
        const newDate = day && isValid(day) ? startOfDay(day) : undefined; // Ensure time is stripped unless time picker added
        setSelectedDueDate(newDate);
        saveChanges({ dueDate: newDate ? newDate.getTime() : null });
    }, [saveChanges]);


    const handleListChange = useCallback((newList: string, closeDropdown?: () => void) => {
        saveChanges({ list: newList });
        closeDropdown?.();
    }, [saveChanges]);

    const handlePriorityChange = useCallback((newPriority: number | null, closeDropdown?: () => void) => {
        saveChanges({ priority: newPriority });
        closeDropdown?.();
    }, [saveChanges]);

    const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTagInputValue(e.target.value);
        saveChanges();
    };
    const handleTagInputBlur = () => {
        const newTags = tagInputValue.split(',').map(tag => tag.trim()).filter(tag => tag !== '').filter((v, i, a) => a.indexOf(v) === i);
        if (selectedTask && JSON.stringify(newTags.sort()) !== JSON.stringify((selectedTask.tags ?? []).sort())) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            isSavingRef.current = false;
            saveChanges({ tags: newTags });
        }
    };
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
        else if (e.key === 'Escape') {
            if (selectedTask) setTagInputValue((selectedTask.tags ?? []).join(', '));
            hasUnsavedChanges.current = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            (e.target as HTMLInputElement).blur();
        }
    };

    const handleDelete = useCallback(() => {
        if (!selectedTask) return;
        setTasks(prevTasks =>
            prevTasks.map(t => t.id === selectedTask.id ? { ...t, list: 'Trash', completed: false, updatedAt: Date.now() } : t)
        );
        setSelectedTaskId(null);
    }, [selectedTask, setTasks, setSelectedTaskId]);

    const handleRestore = useCallback(() => {
        if (!selectedTask || selectedTask.list !== 'Trash') return;
        setTasks(prevTasks =>
            prevTasks.map(t => t.id === selectedTask.id ? { ...t, list: 'Inbox', updatedAt: Date.now() } : t)
        );
    }, [selectedTask, setTasks]);

    const handleToggleComplete = useCallback(() => {
        if (!selectedTask || selectedTask.list === 'Trash') return;
        saveChanges({ completed: !selectedTask.completed });
    }, [selectedTask, saveChanges]); // Depends on selectedTask and saveChanges

    const priorityMap: Record<number, { label: string; iconColor: string }> = useMemo(() => ({
        1: { label: 'High', iconColor: 'text-red-500' },
        2: { label: 'Medium', iconColor: 'text-orange-500' },
        3: { label: 'Low', iconColor: 'text-blue-500' },
        4: { label: 'Lowest', iconColor: 'text-gray-500' },
    }), []);

    // --- Render Logic ---
    const dueDateObj = useMemo(() => selectedTask && selectedDueDate ? safeParseDate(selectedDueDate) : undefined, [selectedTask, selectedDueDate]);
    const isTrash = selectedTask?.list === 'Trash';
    const isCompleted = selectedTask?.completed && !isTrash;
    const overdue = useMemo(() => dueDateObj && !isCompleted && isOverdue(dueDateObj), [dueDateObj, isCompleted]);

    if (!selectedTask) return null;

    return (
        <motion.div
            className={twMerge(
                "border-l border-black/10 w-[420px] shrink-0 h-full flex flex-col shadow-xl z-10", // Wider, stronger shadow
                "bg-glass-100 backdrop-blur-xl" // Strongest glass effect
            )}
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} // Slightly slower ease
        >
            {/* Header: Actions & Context - Glass */}
            <div className="px-3 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 h-11 bg-glass-alt-100 backdrop-blur-lg">
                {/* Left Actions (Contextual: Delete/Restore) */}
                <div className="w-16 flex justify-start">
                    {isTrash ? (
                        <Button variant="ghost" size="sm" icon="arrow-left" onClick={handleRestore} className="text-green-600 hover:bg-green-400/20 hover:text-green-700 text-xs px-1.5"> Restore </Button>
                    ) : (
                        <Button variant="ghost" size="icon" icon="trash" onClick={handleDelete} className="text-red-600 hover:bg-red-400/20 hover:text-red-700 w-7 h-7" aria-label="Move task to Trash" />
                    )}
                </div>

                {/* Center: Saving Indicator */}
                <div className="flex-1 text-center">
                    <AnimatePresence>
                        {(isSavingRef.current || (hasUnsavedChanges.current && !isSavingRef.current)) && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] text-muted-foreground font-medium"
                            >
                                Saving...
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Actions: Close */}
                <div className="w-16 flex justify-end">
                    <Button variant="ghost" size="icon" icon="x" onClick={handleClose} aria-label="Close task details" className="text-muted-foreground hover:bg-black/10 w-7 h-7" />
                </div>
            </div>

            {/* Main Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 styled-scrollbar space-y-5">

                {/* Title Input Row */}
                <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <button
                        onClick={handleToggleComplete}
                        className={twMerge(
                            "mt-[5px] flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ease-in-out appearance-none",
                            "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-glass-100", // Adjust offset for glass
                            isCompleted ? 'bg-gray-400 border-gray-400 hover:bg-gray-500'
                                : 'bg-white/40 border-gray-400 hover:border-primary/80 backdrop-blur-sm', // Glassy checkbox
                            'relative after:content-[""] after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2',
                            'after:h-[10px] after:w-[5px] after:rotate-45 after:border-b-[2.5px] after:border-r-[2.5px] after:border-solid after:border-transparent after:transition-opacity after:duration-100',
                            isCompleted ? 'after:border-white after:opacity-100' : 'after:opacity-0',
                            isTrash && 'cursor-not-allowed opacity-50 !border-gray-300 hover:!border-gray-300 !bg-gray-200/50 after:!border-gray-400'
                        )}
                        aria-pressed={isCompleted}
                        disabled={isTrash}
                        aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
                    />

                    {/* Title Input - Larger */}
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={editableTitle}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        className={twMerge(
                            "w-full text-lg font-medium border-none focus:ring-0 focus:outline-none bg-transparent p-0 m-0 leading-tight",
                            "placeholder:text-muted placeholder:font-normal",
                            (isCompleted || isTrash) && "line-through text-muted-foreground",
                            "task-detail-title-input"
                        )}
                        placeholder="Task title..."
                        disabled={isTrash}
                        aria-label="Task title"
                    />
                </div>

                {/* Metadata Section - Minimalist */}
                <div className="space-y-1.5 text-sm border-t border-b border-black/10 py-2.5 my-4">
                    {/* Due Date */}
                    <MetaRow icon="calendar" label="Due Date" disabled={isTrash}>
                        <Dropdown
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={twMerge(
                                        "text-xs h-7 px-1.5 w-full text-left justify-start font-normal truncate",
                                        selectedDueDate ? 'text-gray-700' : 'text-muted-foreground',
                                        overdue && 'text-red-600 font-medium',
                                        isTrash && 'text-muted line-through'
                                    )}
                                    disabled={isTrash}
                                >
                                    {selectedDueDate ? formatRelativeDate(selectedDueDate) : 'Set date'}
                                </Button>
                            }
                            // Apply DayPicker specific styles and glass effect to the dropdown content
                            contentClassName="date-picker-popover-content w-auto" // Use specific class, auto width
                            placement="bottom-end"
                        >
                            {({ close }) => (
                                <DatePickerPopoverContent
                                    selectedDate={selectedDueDate}
                                    onSelect={handleDatePickerSelect}
                                    close={close}
                                />
                            )}
                        </Dropdown>
                    </MetaRow>

                    {/* List Selector */}
                    <MetaRow icon="list" label="List" disabled={isTrash}>
                        <Dropdown
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7 px-1.5 w-full text-left justify-start text-gray-700 font-normal disabled:text-muted disabled:line-through truncate"
                                    disabled={isTrash}
                                >
                                    {selectedTask.list || 'Inbox'}
                                </Button>
                            }
                            contentClassName="max-h-48 overflow-y-auto styled-scrollbar py-1"
                        >
                            {({ close }) => (
                                <>
                                    {userLists.filter(l => l !== 'Trash').map(list => (
                                        <button
                                            key={list}
                                            onClick={() => handleListChange(list, close)}
                                            className={twMerge(
                                                "block w-full text-left px-2.5 py-1 text-sm hover:bg-black/15", // Adjusted hover for glass
                                                selectedTask.list === list && "bg-primary/20 text-primary font-medium" // Highlight selected
                                            )}
                                            role="menuitem"
                                        >
                                            {list}
                                        </button>
                                    ))}
                                </>
                            )}
                        </Dropdown>
                    </MetaRow>

                    {/* Priority Selector */}
                    <MetaRow icon="flag" label="Priority" disabled={isTrash}>
                        <Dropdown
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={twMerge(
                                        "text-xs h-7 px-1.5 w-full text-left justify-start font-normal disabled:text-muted disabled:line-through truncate",
                                        selectedTask.priority ? priorityMap[selectedTask.priority]?.iconColor : 'text-gray-700'
                                    )}
                                    icon={selectedTask.priority ? 'flag' : undefined}
                                    disabled={isTrash}
                                >
                                    {selectedTask.priority ? `P${selectedTask.priority} ${priorityMap[selectedTask.priority]?.label}` : 'Set Priority'}
                                </Button>
                            }
                            contentClassName="py-1"
                        >
                            {({ close }) => (
                                <>
                                    {[1, 2, 3, 4, null].map(p => (
                                        <button
                                            key={p ?? 'none'}
                                            onClick={() => handlePriorityChange(p, close)}
                                            className={twMerge(
                                                "block w-full text-left px-2.5 py-1 text-sm hover:bg-black/15 flex items-center", // Adjusted hover
                                                selectedTask.priority === p && "bg-primary/20 text-primary font-medium",
                                                p && priorityMap[p]?.iconColor
                                            )}
                                            role="menuitem"
                                        >
                                            {p && <Icon name="flag" size={14} className="mr-1.5 flex-shrink-0" />}
                                            {p ? `P${p} ${priorityMap[p]?.label}` : 'None'}
                                        </button>
                                    ))}
                                </>
                            )}
                        </Dropdown>
                    </MetaRow>

                    {/* Tags Input */}
                    <MetaRow icon="tag" label="Tags" disabled={isTrash}>
                        <input
                            type="text"
                            value={tagInputValue}
                            onChange={handleTagInputChange}
                            onBlur={handleTagInputBlur}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Add tags..."
                            className={twMerge(
                                "flex-1 text-xs h-7 px-1.5 border-none focus:ring-0 bg-transparent rounded-sm w-full",
                                "hover:bg-white/10 focus:bg-white/20 backdrop-blur-sm", // Subtle hover/focus glass
                                "placeholder:text-muted placeholder:font-normal",
                                "disabled:bg-transparent disabled:hover:bg-transparent disabled:text-muted disabled:line-through disabled:placeholder:text-transparent"
                            )}
                            disabled={isTrash}
                            aria-label="Tags (comma-separated)"
                        />
                    </MetaRow>
                </div>


                {/* Content Editor - Use Glass Effect provided by CodeMirrorEditor */}
                <div className="min-h-[200px] task-detail-content-editor flex-1 mb-4"> {/* More space */}
                    <CodeMirrorEditor
                        ref={editorRef}
                        value={editableContent}
                        onChange={handleContentChange}
                        onBlur={handleContentBlur}
                        placeholder="Add notes, links, or details here... Markdown is supported."
                        className={twMerge(
                            "min-h-[200px] h-full text-sm !border-0 focus-within:!ring-0 focus-within:!border-0 shadow-none !bg-transparent", // Make editor fully transparent
                            (isCompleted || isTrash) && "opacity-70"
                        )}
                        readOnly={isTrash}
                        // useGlassEffect is handled by editor component itself
                    />
                </div>

            </div>

            {/* Footer: Timestamps - Glass */}
            <div className="px-4 py-2 border-t border-black/10 flex justify-end items-center flex-shrink-0 h-9 bg-glass-alt-200 backdrop-blur-sm">
                <div className="text-[11px] text-muted-foreground space-x-4">
                    <span>Created: {formatDateTime(selectedTask.createdAt)}</span>
                    <span>Updated: {formatDateTime(selectedTask.updatedAt)}</span>
                </div>
            </div>
        </motion.div>
    );
};

// Metadata Row Component (Memoized)
const MetaRow: React.FC<{ icon: IconName; label: string; children: React.ReactNode, disabled?: boolean }> = React.memo(({ icon, label, children, disabled=false }) => (
    <div className={twMerge("flex items-center justify-between group min-h-[34px] px-1", disabled && "opacity-60 pointer-events-none")}>
        <span className="text-muted-foreground flex items-center text-xs font-medium w-24 flex-shrink-0"> {/* Wider label */}
            <Icon name={icon} size={14} className="mr-1.5 opacity-70"/>{label}
        </span>
        <div className="flex-1 text-right min-w-0">
            {children}
        </div>
    </div>
));
MetaRow.displayName = 'MetaRow';


export default TaskDetail;