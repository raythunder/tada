// src/components/tasks/TaskDetail.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
    selectedTaskAtom, tasksAtom, selectedTaskIdAtom, userListNamesAtom,
} from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, { CodeMirrorEditorRef } from '../common/CodeMirrorEditor';
import { formatDateTime, formatRelativeDate, isOverdue, safeParseDate } from '@/utils/dateUtils';
import { Task } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { twMerge } from 'tailwind-merge';
import { usePopper } from 'react-popper';
import { IconName } from "@/components/common/IconMap.tsx";

// --- Custom Hook for Click Away ---
function useClickAway(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current;
            if (!el || el.contains(event.target as Node)) return;
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

// --- Reusable Dropdown Component ---
interface DropdownRenderProps { close: () => void; }
interface DropdownProps {
    trigger: React.ReactElement;
    children: React.ReactNode | ((props: DropdownRenderProps) => React.ReactNode);
    contentClassName?: string;
    placement?: import('@popperjs/core').Placement;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children, contentClassName, placement = 'bottom-start' }) => {
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
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation(); setIsOpen(prev => !prev); trigger.props.onClick?.(e);
        },
        'aria-haspopup': 'true', 'aria-expanded': isOpen,
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
                            'z-30 min-w-[180px] rounded-md shadow-strong border border-black/5 overflow-hidden',
                            'bg-glass-100 backdrop-blur-md', // Glass effect for dropdown
                            contentClassName
                        )}
                        initial={{ opacity: 0, scale: 0.98, y: -3 }} // Subtle entry
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -3, transition: { duration: 0.1 } }} // Subtle exit
                        transition={{ duration: 0.15, ease: 'easeOut' }} // Faster transition
                        onClick={(e) => e.stopPropagation()}
                    >
                        {typeof children === 'function' ? children({ close }) : children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Metadata Row Component ---
const MetaRow: React.FC<{ icon: IconName; label: string; children: React.ReactNode, disabled?: boolean }> = ({ icon, label, children, disabled=false }) => (
    <div className={twMerge("flex items-center justify-between group min-h-[32px] px-1", disabled && "opacity-60")}>
        <span className="text-muted-foreground flex items-center text-xs font-medium w-20 flex-shrink-0">
            <Icon name={icon} size={14} className="mr-1.5 opacity-70"/>{label}
        </span>
        <div className={twMerge("flex-1 text-right", disabled && "pointer-events-none")}>
            {children}
        </div>
    </div>
);

// --- TaskDetail Component ---
const TaskDetail: React.FC = () => {
    const selectedTask = useAtomValue(selectedTaskAtom);
    const [, setTasks] = useAtom(tasksAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const userLists = useAtomValue(userListNamesAtom);

    const [editableTitle, setEditableTitle] = useState('');
    const [editableContent, setEditableContent] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
    const [tagInputValue, setTagInputValue] = useState('');

    const titleInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const isSavingRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        isSavingRef.current = false;

        if (selectedTask) {
            setEditableTitle(selectedTask.title);
            setEditableContent(selectedTask.content || '');
            setSelectedDueDate(safeParseDate(selectedTask.dueDate));
            setTagInputValue((selectedTask.tags ?? []).join(', '));
        }
    }, [selectedTask]);

    // Debounced Save Function - Simplified equality check
    const saveChanges = useCallback((updatedFields: Partial<Task>) => {
        if (!selectedTask || isSavingRef.current) return;

        const currentTaskState: Partial<Task> = {
            title: editableTitle.trim() || "Untitled Task",
            content: editableContent,
            tags: tagInputValue.split(',').map(t => t.trim()).filter(Boolean),
            dueDate: selectedDueDate ? selectedDueDate.getTime() : null,
        };

        // Merge changes, prioritize incoming updatedFields
        const mergedFields = { ...currentTaskState, ...updatedFields };

        // Check if anything relevant actually changed
        let hasChanged = false;
        const keysToCheck: (keyof Task)[] = ['title', 'content', 'completed', 'list', 'priority', 'dueDate'];
        for (const key of keysToCheck) {
            if (key in mergedFields && mergedFields[key] !== selectedTask[key]) {
                // Simple timestamp compare for dueDate is sufficient here
                hasChanged = true; break;
            }
        }
        if (!hasChanged && 'tags' in mergedFields) { // Check tags separately
            const oldTagsSorted = (selectedTask.tags ?? []).sort();
            const newTagsSorted = (mergedFields.tags ?? []).sort();
            if (JSON.stringify(oldTagsSorted) !== JSON.stringify(newTagsSorted)) {
                hasChanged = true;
            }
        }

        if (!hasChanged) return; // Skip if no effective change

        isSavingRef.current = true;
        const finalUpdatedTask: Task = {
            ...selectedTask, // Start with the original task
            ...mergedFields, // Apply merged changes
            updatedAt: Date.now(), // Always update timestamp
        };

        setTasks(prev => prev.map(t => (t.id === selectedTask.id ? finalUpdatedTask : t)));

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => { isSavingRef.current = false; }, 150); // Shorter delay

    }, [selectedTask, setTasks, editableTitle, editableContent, selectedDueDate, tagInputValue]);


    // --- Event Handlers ---
    const handleClose = useCallback(() => {
        saveChanges({}); // Trigger save check on close
        setSelectedTaskId(null);
    }, [setSelectedTaskId, saveChanges]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditableTitle(e.target.value);
    const handleTitleBlur = () => {
        if (selectedTask && editableTitle.trim() !== selectedTask.title) saveChanges({ title: editableTitle.trim() });
    };
    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); titleInputRef.current?.blur(); }
        else if (e.key === 'Escape') { if (selectedTask) setEditableTitle(selectedTask.title); titleInputRef.current?.blur(); }
    };

    const handleContentChange = useCallback((newValue: string) => setEditableContent(newValue), []);
    const handleContentBlur = useCallback(() => {
        if (selectedTask && editableContent !== (selectedTask.content || '')) saveChanges({ content: editableContent });
    }, [saveChanges, selectedTask, editableContent]);

    const handleDateChange = (date: Date | null) => {
        setSelectedDueDate(date);
        saveChanges({ dueDate: date ? date.getTime() : null });
    };
    const handleListChange = (newList: string, closeDropdown?: () => void) => {
        saveChanges({ list: newList }); closeDropdown?.();
    };
    const handlePriorityChange = (newPriority: number | null, closeDropdown?: () => void) => {
        saveChanges({ priority: newPriority }); closeDropdown?.();
    };

    const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setTagInputValue(e.target.value);
    const handleTagInputBlur = () => {
        const uniqueTags = Array.from(new Set(tagInputValue.split(',').map(t => t.trim()).filter(Boolean)));
        if (selectedTask && JSON.stringify(uniqueTags.sort()) !== JSON.stringify((selectedTask.tags ?? []).sort())) {
            saveChanges({ tags: uniqueTags });
        }
    };
    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
        else if (e.key === 'Escape') { if (selectedTask) setTagInputValue((selectedTask.tags ?? []).join(', ')); (e.target as HTMLInputElement).blur(); }
    };

    const handleDelete = useCallback(() => {
        if (!selectedTask) return;
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, list: 'Trash', completed: false, updatedAt: Date.now() } : t));
        setSelectedTaskId(null);
    }, [selectedTask, setTasks, setSelectedTaskId]);

    const handleRestore = useCallback(() => {
        if (!selectedTask || selectedTask.list !== 'Trash') return;
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, list: 'Inbox', updatedAt: Date.now() } : t));
    }, [selectedTask, setTasks]);

    const handleToggleComplete = () => {
        if (!selectedTask || selectedTask.list === 'Trash') return;
        saveChanges({ completed: !selectedTask.completed });
    };

    const priorityMap: Record<number, { label: string; iconColor: string }> = useMemo(() => ({
        1: { label: 'High', iconColor: 'text-red-500' }, 2: { label: 'Medium', iconColor: 'text-orange-500' },
        3: { label: 'Low', iconColor: 'text-blue-500' }, 4: { label: 'Lowest', iconColor: 'text-gray-500' },
    }), []);

    // --- Render Logic ---
    // The placeholder rendering is removed because TaskDetail is only rendered when selectedTask exists (handled in MainPage)
    if (!selectedTask) {
        return null; // Should not happen due to conditional rendering in MainPage
    }

    // Main Task Detail View
    return (
        // Use motion.div for animation controlled by AnimatePresence in MainPage
        // Key is set in MainPage
        <motion.div
            className="border-l border-border-color/60 w-[380px] shrink-0 bg-canvas h-full flex flex-col shadow-lg z-10"
            // Subtle slide animation using ease-out
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%', transition: { duration: 0.15, ease: 'easeIn' } }} // Faster exit
            transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.25 }} // Standard ease-out, slightly longer duration
        >
            {/* Header with Glass Effect */}
            <div className="px-3 py-2 border-b border-border-color/60 flex justify-between items-center flex-shrink-0 h-11 bg-glass-alt-100 backdrop-blur-sm">
                <span className="text-xs text-muted-foreground truncate pr-4 font-medium">
                    {selectedTask.list !== 'Inbox' && selectedTask.list !== 'Trash' ? `${selectedTask.list} / ` : ''}
                    {selectedTask.list === 'Trash' ? 'Trash / ' : ''}
                    <span className="text-gray-700">{selectedTask.title || 'Untitled Task'}</span>
                 </span>
                {/* Close Button - Use icon prop */}
                <Button variant="ghost" size="icon" icon="x" onClick={handleClose} aria-label="Close task details" className="text-muted-foreground hover:bg-black/5 w-7 h-7 -mr-1" />
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 styled-scrollbar space-y-4">
                {/* Title Input Row with Checkbox */}
                <div className="flex items-start space-x-2.5">
                    <button
                        onClick={handleToggleComplete}
                        className={twMerge(
                            "mt-[3px] flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-150 ease-in-out",
                            "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                            selectedTask.completed ? 'bg-gray-300 border-gray-300 hover:bg-gray-400' : 'border-gray-400 hover:border-primary/80 bg-canvas',
                            selectedTask.list === 'Trash' && 'cursor-not-allowed opacity-50 border-gray-300 hover:border-gray-300'
                        )}
                        aria-pressed={selectedTask.completed} disabled={selectedTask.list === 'Trash'}
                        aria-label={selectedTask.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
                    >
                        {selectedTask.completed && <Icon name="check" size={10} className="text-white" strokeWidth={3}/>}
                    </button>
                    <input
                        ref={titleInputRef} type="text" value={editableTitle} onChange={handleTitleChange} onBlur={handleTitleBlur} onKeyDown={handleTitleKeyDown}
                        className={twMerge(
                            "w-full text-base font-medium border-none focus:ring-0 focus:outline-none bg-transparent p-0 m-0 leading-tight",
                            "placeholder:text-muted placeholder:font-normal",
                            selectedTask.completed && "line-through text-muted",
                            selectedTask.list === 'Trash' && "text-muted line-through",
                            "task-detail-title-input"
                        )}
                        placeholder="Task title..." disabled={selectedTask.list === 'Trash'} aria-label="Task title"
                    />
                </div>

                {/* Metadata Section */}
                <div className="space-y-1 text-sm border-t border-b border-border-color/60 py-2 my-3">
                    {/* Due Date */}
                    <MetaRow icon="calendar" label="Due Date" disabled={selectedTask.list === 'Trash'}>
                        <DatePicker
                            selected={selectedDueDate} onChange={handleDateChange}
                            customInput={
                                <Button
                                    variant="ghost" size="sm"
                                    className={twMerge(
                                        "text-xs h-6 px-1.5 w-full text-left justify-start font-normal",
                                        selectedDueDate ? 'text-gray-700' : 'text-muted',
                                        selectedDueDate && isOverdue(selectedDueDate) && !selectedTask.completed && 'text-red-600 font-medium',
                                        selectedTask.list === 'Trash' && 'text-muted line-through'
                                    )}
                                    disabled={selectedTask.list === 'Trash'}
                                >
                                    {selectedDueDate ? formatRelativeDate(selectedDueDate) : 'Set date'}
                                </Button>
                            }
                            dateFormat="yyyy/MM/dd" placeholderText="Set due date"
                            isClearable={!!selectedDueDate && selectedTask.list !== 'Trash'}
                            clearButtonClassName="react-datepicker__close-icon" // Apply custom styling
                            showPopperArrow={false} popperPlacement="bottom-end" shouldCloseOnSelect={true}
                            todayButton="Today" disabled={selectedTask.list === 'Trash'}
                            popperClassName="react-datepicker-popper custom-datepicker-popper" // Use custom class for potential styling
                        />
                    </MetaRow>

                    {/* List Selector */}
                    <MetaRow icon="list" label="List" disabled={selectedTask.list === 'Trash'}>
                        <Dropdown
                            trigger={
                                <Button variant="ghost" size="sm" iconPosition="right" icon="chevron-down"
                                        className="text-xs h-6 px-1.5 w-full text-left justify-start text-gray-700 font-normal disabled:text-muted disabled:line-through"
                                        disabled={selectedTask.list === 'Trash'}
                                > {selectedTask.list || 'Inbox'} </Button>
                            }
                            contentClassName="max-h-48 overflow-y-auto styled-scrollbar"
                        >
                            {({ close }) => (
                                <div className="py-1">
                                    {/* Ensure Inbox is selectable and sort user lists */}
                                    {['Inbox', ...userLists.filter(l => l !== 'Inbox').sort((a,b) => a.localeCompare(b))].map(list => (
                                        <button key={list} onClick={() => handleListChange(list, close)}
                                                className={twMerge( "block w-full text-left px-2.5 py-1 text-sm hover:bg-black/5", selectedTask.list === list && "bg-primary/10 text-primary font-medium" )}
                                                role="menuitem"
                                        > {list} </button>
                                    ))}
                                </div>
                            )}
                        </Dropdown>
                    </MetaRow>

                    {/* Priority Selector */}
                    <MetaRow icon="flag" label="Priority" disabled={selectedTask.list === 'Trash'}>
                        <Dropdown
                            trigger={
                                <Button variant="ghost" size="sm" iconPosition="left" icon={selectedTask.priority ? 'flag' : undefined}
                                        className={twMerge(
                                            "text-xs h-6 px-1.5 w-full text-left justify-start font-normal disabled:text-muted disabled:line-through",
                                            selectedTask.priority ? priorityMap[selectedTask.priority]?.iconColor : 'text-gray-700'
                                        )}
                                        disabled={selectedTask.list === 'Trash'}
                                > {selectedTask.priority ? `P${selectedTask.priority} ${priorityMap[selectedTask.priority]?.label}` : 'Set Priority'} </Button>
                            }
                        >
                            {({ close }) => (
                                <div className="py-1">
                                    {[1, 2, 3, 4, null].map(p => (
                                        <button key={p ?? 'none'} onClick={() => handlePriorityChange(p, close)}
                                                className={twMerge( "block w-full text-left px-2.5 py-1 text-sm hover:bg-black/5 flex items-center", selectedTask.priority === p && "bg-primary/10 text-primary font-medium", p && priorityMap[p]?.iconColor )}
                                                role="menuitem"
                                        >
                                            {p && <Icon name="flag" size={14} className="mr-1.5 flex-shrink-0" />}
                                            {p ? `P${p} ${priorityMap[p]?.label}` : 'None'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Dropdown>
                    </MetaRow>

                    {/* Tags Input */}
                    <MetaRow icon="tag" label="Tags" disabled={selectedTask.list === 'Trash'}>
                        <input type="text" value={tagInputValue} onChange={handleTagInputChange} onBlur={handleTagInputBlur} onKeyDown={handleTagInputKeyDown} placeholder="Add tags..."
                               className={twMerge(
                                   "flex-1 text-xs h-6 px-1.5 border-none focus:ring-0 bg-transparent rounded-sm",
                                   "hover:bg-gray-100/70 focus:bg-gray-100", "placeholder:text-muted placeholder:font-normal",
                                   "disabled:bg-transparent disabled:hover:bg-transparent disabled:text-muted disabled:line-through disabled:placeholder:text-transparent"
                               )}
                               disabled={selectedTask.list === 'Trash'} aria-label="Tags (comma-separated)"
                        />
                    </MetaRow>
                </div>

                {/* Content Editor */}
                <div className="min-h-[150px] task-detail-content-editor">
                    <CodeMirrorEditor
                        ref={editorRef} value={editableContent} onChange={handleContentChange} onBlur={handleContentBlur}
                        placeholder="Add notes, links, or details..."
                        className={twMerge( "min-h-[150px] h-full text-sm !bg-transparent !border-0 focus-within:!ring-0 focus-within:!border-0 shadow-none", (selectedTask.list === 'Trash' || selectedTask.completed) && "opacity-70" )}
                        readOnly={selectedTask.list === 'Trash'}
                    />
                </div>

                {/* Timestamps */}
                <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border-color/60 pt-3 mt-auto text-right">
                    <p>Created: {formatDateTime(selectedTask.createdAt)}</p>
                    <p>Updated: {formatDateTime(selectedTask.updatedAt)}</p>
                </div>
            </div>

            {/* Footer Actions - Subtle Glass Effect */}
            <div className="px-3 py-2 border-t border-border-color/60 flex justify-between items-center flex-shrink-0 h-10 bg-glass-alt-200 backdrop-blur-sm">
                {selectedTask.list === 'Trash' ? (
                    <Button variant="ghost" size="sm" icon="arrow-left" onClick={handleRestore} className="text-green-600 hover:bg-green-50 hover:text-green-700 text-xs px-2"> Restore </Button>
                ) : (
                    <Button variant="ghost" size="icon" icon="trash" onClick={handleDelete} className="text-red-600 hover:bg-red-50 hover:text-red-700 w-7 h-7" aria-label="Move task to Trash" />
                )}

                {/* Saving Indicator - Subtle */}
                <AnimatePresence>
                    {isSavingRef.current && (
                        <motion.span
                            className="text-xs text-muted"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        > Saving... </motion.span>
                    )}
                </AnimatePresence>
                <div className="flex-1"></div>
                {/* Other actions can go here */}
            </div>
        </motion.div>
    );
};

export default TaskDetail;