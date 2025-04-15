// src/components/tasks/TaskDetail.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { selectedTaskAtom, tasksAtom, selectedTaskIdAtom } from '@/store/atoms';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor from '../common/CodeMirrorEditor';
import { formatDateTime, formatDate } from '@/utils/dateUtils';
import { Task } from '@/types';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; // Import datepicker CSS

const TaskDetail: React.FC = () => {
    const [selectedTask] = useAtom(selectedTaskAtom);
    const [, setTasks] = useAtom(tasksAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom);

    // Local state for editing to avoid updating Jotai on every keystroke
    const [editableTitle, setEditableTitle] = useState('');
    const [editableContent, setEditableContent] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);

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
    }, [selectedTask]);

    const handleClose = useCallback(() => {
        setSelectedTaskId(null);
    }, [setSelectedTaskId]);

    // Save changes back to Jotai state
    const handleSaveChanges = useCallback(() => {
        if (!selectedTask) return;

        const updatedTask: Task = {
            ...selectedTask,
            title: editableTitle.trim() || "Untitled Task", // Ensure title is not empty
            content: editableContent,
            dueDate: selectedDueDate ? selectedDueDate.getTime() : null,
            updatedAt: Date.now(),
        };

        setTasks((prevTasks: Task[]) =>
            prevTasks.map((t: Task) => (t.id === selectedTask.id ? updatedTask : t))
        );
        // Optionally close after save, or keep it open
        // handleClose();
    }, [selectedTask, editableTitle, editableContent, selectedDueDate, setTasks]);

    const handleDelete = useCallback(() => {
        if (!selectedTask) return;
        if (window.confirm(`Are you sure you want to delete "${selectedTask.title}"?`)) {
            // Option 1: Actually delete
            // setTasks(prevTasks => prevTasks.filter(t => t.id !== selectedTask.id));

            // Option 2: Move to Trash (better UX)
            setTasks((prevTasks: Task[]) =>
                prevTasks.map((t: Task) =>
                    t.id === selectedTask.id
                        ? { ...t, list: 'Trash', completed: false, updatedAt: Date.now() } // Mark as not completed when trashing
                        : t
                )
            );

            handleClose();
        }
    }, [selectedTask, setTasks, handleClose]);

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission if wrapped in form
            handleSaveChanges();
            // Maybe focus the content editor next?
        } else if (e.key === 'Escape') {
            // Revert title changes on Escape?
            if (selectedTask) setEditableTitle(selectedTask.title);
        }
    };


    // If no task is selected, don't render anything (or show a placeholder)
    if (!selectedTask) {
        return (
            <div className="border-l border-gray-200/80 w-1/2 bg-canvas-alt h-full flex flex-col items-center justify-center text-muted p-10 text-center">
                <Icon name="edit" size={40} className="mb-4 text-gray-300"/>
                <p className="text-sm">Select a task to view its details.</p>
            </div>
        );
    }

    return (
        <motion.div
            key={selectedTask.id} // Ensure re-render animation on task change
            className="border-l border-gray-200/80 w-[450px] shrink-0 bg-canvas h-full flex flex-col shadow-lg z-10" // Fixed width might be better
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-200/80 flex justify-between items-center flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">Task Detail</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    aria-label="Close task details"
                    className="text-muted hover:bg-gray-100"
                >
                    <Icon name="x" size={18} />
                </Button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-5 styled-scrollbar space-y-5">
                {/* Title Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={editableTitle}
                        onChange={(e) => setEditableTitle(e.target.value)}
                        onBlur={handleSaveChanges} // Save on blur
                        onKeyDown={handleTitleKeyDown}
                        className="w-full text-lg font-semibold px-2 py-1 border border-transparent rounded-md hover:border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white outline-none"
                        placeholder="Task title"
                    />
                </div>

                {/* Metadata Section */}
                <div className="space-y-3 text-sm">
                    {/* Due Date Picker */}
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center"><Icon name="calendar" size={14} className="mr-1.5"/>Due Date</span>
                        <DatePicker
                            selected={selectedDueDate}
                            onChange={(date: Date | null) => {
                                setSelectedDueDate(date);
                                // Save immediately on date change
                                if (selectedTask) {
                                    const updatedTask: Task = { ...selectedTask, dueDate: date ? date.getTime() : null, updatedAt: Date.now() };
                                    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === selectedTask.id ? updatedTask : t));
                                }
                            }}
                            customInput={
                                <Button variant="ghost" size="sm" className="text-gray-700">
                                    {selectedDueDate ? formatDate(selectedDueDate) : 'Set Date'}
                                </Button>
                            }
                            dateFormat="yyyy/MM/dd"
                            placeholderText="Set due date"
                            isClearable
                            showPopperArrow={false}
                            popperPlacement="bottom-end"
                        />
                    </div>

                    {/* List Selector (Example - needs implementation) */}
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center"><Icon name="list" size={14} className="mr-1.5"/>List</span>
                        <Button variant="ghost" size="sm">{selectedTask.list}</Button>
                    </div>

                    {/* Priority Selector (Example - needs implementation) */}
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center"><Icon name="flag" size={14} className="mr-1.5"/>Priority</span>
                        <Button variant="ghost" size="sm">{selectedTask.priority ? `Priority ${selectedTask.priority}` : 'Set Priority'}</Button>
                    </div>

                    {/* Tags Input (Example - needs implementation) */}
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center"><Icon name="tag" size={14} className="mr-1.5"/>Tags</span>
                        <Button variant="ghost" size="sm">{selectedTask.tags?.join(', ') || 'Add Tags'}</Button>
                    </div>
                </div>

                {/* Content Editor */}
                <div>
                    <label htmlFor="task-content-editor" className="text-sm text-muted-foreground font-medium mb-1 block">
                        Notes
                    </label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                        {/* Toolbar can be added here later */}
                        <CodeMirrorEditor
                            value={editableContent}
                            onChange={setEditableContent} // Update local state
                            onBlur={handleSaveChanges} // Save on blur
                            placeholder="Add notes, links, or details here... (Markdown supported)"
                            className="min-h-[150px] text-sm bg-canvas-inset"
                        />
                    </div>
                </div>


                {/* Timestamps */}
                <div className="text-xs text-muted space-y-1 border-t border-gray-200/60 pt-4 mt-6">
                    <p>Created: {formatDateTime(selectedTask.createdAt)}</p>
                    <p>Updated: {formatDateTime(selectedTask.updatedAt)}</p>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-3 border-t border-gray-200/80 flex justify-between items-center flex-shrink-0">
                <Button variant="ghost" size="sm" icon="trash" onClick={handleDelete} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                    Delete
                </Button>
                {/* Save button might be redundant if using onBlur/onChange saves */}
                {/* <Button variant="primary" size="sm" onClick={handleSaveChanges}>
                    Save Changes
                </Button> */}
                <span className="text-xs text-muted">Changes saved automatically</span>
            </div>
        </motion.div>
    );
};

export default TaskDetail;