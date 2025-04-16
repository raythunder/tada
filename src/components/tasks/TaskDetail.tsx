// src/components/tasks/TaskDetail.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { selectedTaskAtom, tasksAtom, selectedTaskIdAtom, userListNamesAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor from '../common/CodeMirrorEditor';
import {formatDateTime, formatDate, formatRelativeDate, isOverdue} from '@/utils/dateUtils';
import { Task } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; // Import datepicker CSS
import { twMerge } from 'tailwind-merge';

const TaskDetail: React.FC = () => {
    const [selectedTask, setSelectedTask] = useAtom(selectedTaskAtom);
    const [tasks, setTasks] = useAtom(tasksAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const [userLists] = useAtom(userListNamesAtom); // Get available user lists

    // Local state for editing to avoid updating Jotai on every keystroke, debounced save could be better
    const [editableTitle, setEditableTitle] = useState('');
    const [editableContent, setEditableContent] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);

    // Refs for managing focus and saving
    const titleInputRef = useRef<HTMLInputElement>(null);
    const editorBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false); // Prevent race conditions on save

    // Sync local state when the selected task changes
    useEffect(() => {
        if (selectedTask) {
            setEditableTitle(selectedTask.title);
            setEditableContent(selectedTask.content || '');
            setSelectedDueDate(selectedTask.dueDate ? new Date(selectedTask.dueDate) : null);
        } else {
            // Reset when no task is selected
            setEditableTitle('');
            setEditableContent('');
            setSelectedDueDate(null);
        }
        // Clear any pending blur saves when task changes
        if (editorBlurTimeoutRef.current) {
            clearTimeout(editorBlurTimeoutRef.current);
        }
        isSavingRef.current = false; // Reset saving flag
    }, [selectedTask]);

    // Function to save changes (debounced or on specific actions)
    const saveChanges = useCallback(() => {
        if (!selectedTask || isSavingRef.current) return;

        const trimmedTitle = editableTitle.trim();
        // Avoid saving if nothing actually changed
        if (trimmedTitle === selectedTask.title &&
            editableContent === (selectedTask.content || '') &&
            (selectedDueDate?.getTime() ?? null) === (selectedTask.dueDate ?? null)) {
            // console.log("No changes detected, skipping save.");
            return;
        }

        isSavingRef.current = true; // Set saving flag

        const updatedTask: Task = {
            ...selectedTask,
            title: trimmedTitle || "Untitled Task", // Ensure title is not empty
            content: editableContent,
            // Ensure dueDate is stored as timestamp or null
            dueDate: selectedDueDate ? selectedDueDate.getTime() : null,
            updatedAt: Date.now(),
        };

        setTasks((prevTasks: Task[]) =>
            prevTasks.map((t: Task) => (t.id === selectedTask.id ? updatedTask : t))
        );

        // Update the selectedTask atom directly to reflect changes immediately in the UI
        // Be cautious with this if other atoms derive from selectedTaskAtom complexly
        setSelectedTask(updatedTask);


        // Reset saving flag after a short delay to prevent rapid saves
        setTimeout(() => {
            isSavingRef.current = false;
        }, 100); // 100ms delay


    }, [selectedTask, editableTitle, editableContent, selectedDueDate, setTasks, setSelectedTask]);


    // --- Event Handlers ---

    const handleClose = useCallback(() => {
        saveChanges(); // Save any pending changes before closing
        setSelectedTaskId(null);
    }, [setSelectedTaskId, saveChanges]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditableTitle(e.target.value);
        // Optionally debounce save here
    };

    const handleTitleBlur = () => {
        saveChanges();
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleInputRef.current?.blur(); // Trigger blur to save
            // Optionally focus the content editor next - needs ref on CodeMirror
        } else if (e.key === 'Escape') {
            // Revert title changes on Escape
            if (selectedTask) setEditableTitle(selectedTask.title);
            titleInputRef.current?.blur(); // Remove focus
        }
    };

    const handleContentChange = useCallback((newValue: string) => {
        setEditableContent(newValue);
        // Optionally debounce save here
    }, []);

    const handleContentBlur = useCallback(() => {
        // Delay save slightly on editor blur to allow clicking other controls (like date picker) without triggering save immediately
        if (editorBlurTimeoutRef.current) {
            clearTimeout(editorBlurTimeoutRef.current);
        }
        editorBlurTimeoutRef.current = setTimeout(() => {
            saveChanges();
        }, 150); // 150ms delay seems reasonable
    }, [saveChanges]);


    const handleDateChange = (date: Date | null) => {
        setSelectedDueDate(date);
        // Save immediately on date change
        if (selectedTask && !isSavingRef.current) {
            isSavingRef.current = true;
            const updatedTask: Task = {
                ...selectedTask,
                dueDate: date ? date.getTime() : null,
                updatedAt: Date.now()
            };
            setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
            setSelectedTask(updatedTask); // Update selected task state
            setTimeout(() => { isSavingRef.current = false; }, 100);
        }
    };


    const handleDelete = useCallback(() => {
        if (!selectedTask) return;
        // Use a more modern confirmation if available, or window.confirm
        if (window.confirm(`Move "${selectedTask.title}" to Trash?`)) {
            setTasks((prevTasks: Task[]) =>
                prevTasks.map((t: Task) =>
                    t.id === selectedTask.id
                        ? { ...t, list: 'Trash', completed: false, updatedAt: Date.now() }
                        : t
                )
            );
            setSelectedTaskId(null); // Close detail view after moving to trash
        }
    }, [selectedTask, setTasks, setSelectedTaskId]);

    // --- Render Logic ---

    // Placeholder when no task is selected
    if (!selectedTask) {
        return (
            <div className="border-l border-gray-200/60 w-[400px] shrink-0 bg-canvas-alt h-full flex flex-col items-center justify-center text-muted p-10 text-center">
                <Icon name="edit" size={36} className="mb-4 text-gray-300"/>
                <p className="text-sm">Select a task to view details</p>
                <p className="text-xs mt-1">or click '+' to add a new task.</p>
            </div>
        );
    }

    // Main Task Detail render
    return (
        <motion.div
            key={selectedTask.id} // Trigger animation on task change
            className="border-l border-gray-200/60 w-[400px] shrink-0 bg-canvas h-full flex flex-col shadow-lg z-10" // Fixed width
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }} // Slightly faster spring
        >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200/60 flex justify-between items-center flex-shrink-0 h-10">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    aria-label="Close task details"
                    className="text-muted-foreground hover:bg-black/5 w-7 h-7" // Smaller close button
                >
                    <Icon name="x" size={16} />
                </Button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 styled-scrollbar space-y-4">
                {/* Title Input */}
                <div className="relative">
                    {/* Basic Checkbox for completion status */}
                    <input
                        type="checkbox"
                        checked={selectedTask.completed}
                        onChange={(e) => {
                            const isChecked = e.target.checked;
                            setTasks(prev => prev.map(t => t.id === selectedTask.id ? {...t, completed: isChecked, updatedAt: Date.now()} : t));
                            // Update local state immediately
                            setSelectedTask(prev => prev ? {...prev, completed: isChecked, updatedAt: Date.now()} : null);
                        }}
                        className="absolute top-1.5 left-0 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50 focus:ring-1"
                    />
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={editableTitle}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        className={twMerge(
                            "w-full text-base font-medium pl-6 pr-2 py-1 border border-transparent rounded-md",
                            "hover:border-gray-200/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:bg-white outline-none",
                            "placeholder:text-muted placeholder:font-normal",
                            selectedTask.completed && "line-through text-muted" // Style if completed
                        )}
                        placeholder="Task title..."
                        disabled={selectedTask.completed} // Disable editing if completed
                    />
                </div>

                {/* Metadata Section */}
                <div className="space-y-1.5 text-sm border-t border-b border-gray-200/60 py-3">
                    {/* Due Date Picker */}
                    <div className="flex items-center justify-between group h-7">
                        <span className="text-muted-foreground flex items-center text-xs font-medium w-20">
                            <Icon name="calendar" size={14} className="mr-1.5 opacity-70"/>Due Date
                        </span>
                        {/* Use a custom input button for the DatePicker */}
                        <DatePicker
                            selected={selectedDueDate}
                            onChange={handleDateChange}
                            customInput={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={twMerge(
                                        "text-xs h-6 px-1.5",
                                        selectedDueDate ? 'text-gray-700' : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100', // Show on hover if no date
                                        selectedDueDate && isOverdue(selectedDueDate) && !selectedTask.completed && 'text-red-600'
                                    )}
                                    icon={selectedDueDate ? undefined : "plus"} // Show plus icon when no date
                                    iconPosition="left"
                                >
                                    {selectedDueDate ? formatRelativeDate(selectedDueDate) : 'Set date'}
                                </Button>
                            }
                            dateFormat="yyyy/MM/dd" // Format used for selection
                            placeholderText="Set due date"
                            isClearable={!!selectedDueDate} // Show clear button only if date is set
                            clearButtonClassName="absolute right-1 top-1/2 transform -translate-y-1/2" // Style clear button if needed
                            showPopperArrow={false}
                            popperPlacement="bottom-end"
                            // Add today button
                            todayButton="Today"
                        />
                    </div>

                    {/* List Selector (Example - needs implementation) */}
                    <div className="flex items-center justify-between group h-7">
                         <span className="text-muted-foreground flex items-center text-xs font-medium w-20">
                             <Icon name="list" size={14} className="mr-1.5 opacity-70"/>List
                         </span>
                        {/* Replace with a dropdown/select component */}
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-gray-700">
                            {selectedTask.list || 'Inbox'}
                        </Button>
                    </div>

                    {/* Priority Selector (Example - needs implementation) */}
                    <div className="flex items-center justify-between group h-7">
                         <span className="text-muted-foreground flex items-center text-xs font-medium w-20">
                            <Icon name="flag" size={14} className="mr-1.5 opacity-70"/>Priority
                        </span>
                        {/* Replace with a dropdown/select component */}
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-gray-700">
                            {selectedTask.priority ? `Priority ${selectedTask.priority}` : 'Set Priority'}
                        </Button>
                    </div>

                    {/* Tags Input (Example - needs implementation) */}
                    <div className="flex items-center justify-between group h-7">
                         <span className="text-muted-foreground flex items-center text-xs font-medium w-20">
                            <Icon name="tag" size={14} className="mr-1.5 opacity-70"/>Tags
                         </span>
                        {/* Replace with a tag input component */}
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100">
                            {selectedTask.tags?.join(', ') || '+ Add Tags'}
                        </Button>
                    </div>
                </div>

                {/* Content Editor */}
                <div>
                    {/* Optional Label */}
                    {/* <label htmlFor="task-content-editor" className="text-xs text-muted-foreground font-medium mb-1 block"> Notes </label> */}
                    <CodeMirrorEditor
                        // key={selectedTask.id} // Force re-render if needed, but useEffect handles value changes
                        value={editableContent}
                        onChange={handleContentChange}
                        onBlur={handleContentBlur} // Use delayed blur save
                        placeholder="Add notes, links, or details... (Markdown supported)"
                        className="min-h-[150px] text-sm !bg-canvas !border-0 focus-within:!ring-0 focus-within:!border-0 shadow-none" // Simpler styling, rely on parent padding/borders
                        readOnly={selectedTask.completed}
                    />
                </div>


                {/* Timestamps */}
                <div className="text-[11px] text-muted space-y-0.5 border-t border-gray-200/60 pt-3 mt-auto">
                    <p>Created: {formatDateTime(selectedTask.createdAt)}</p>
                    <p>Updated: {formatDateTime(selectedTask.updatedAt)}</p>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-3 py-2 border-t border-gray-200/60 flex justify-between items-center flex-shrink-0 h-10">
                <Button variant="ghost" size="sm" icon="trash" onClick={handleDelete} className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs">
                    Delete
                </Button>
                {/* Save status indicator can be added here if needed */}
                <span className="text-xs text-muted">
                     {isSavingRef.current ? "Saving..." : ""}
                 </span>
            </div>
        </motion.div>
    );
};

export default TaskDetail;