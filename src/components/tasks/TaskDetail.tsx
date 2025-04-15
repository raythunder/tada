// src/components/tasks/TaskDetail.tsx
import React, { useState, useEffect } from 'react';
import { Task } from '@/types';
import Icon from '../common/Icon';
import Button from '../common/Button';
import { formatDate } from '@/utils/dateUtils.ts';

interface TaskDetailProps {
    task: Task;
    onClose: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose }) => {
    const [editedTask, setEditedTask] = useState<Task>(task);

    useEffect(() => {
        setEditedTask(task);
    }, [task]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedTask({ ...editedTask, title: e.target.value });
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedTask({ ...editedTask, content: e.target.value });
    };

    return (
        <div className="border-l border-gray-200 w-1/2 bg-white h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-medium text-gray-800">Task Detail</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    <Icon name="x" size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="mb-4">
                    <input
                        type="text"
                        value={editedTask.title}
                        onChange={handleTitleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Task title"
                    />
                </div>

                <div className="mb-4 flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Due date:</span>
                    {editedTask.dueDate ? (
                        <div className="flex items-center text-sm text-gray-700">
                            <span>{formatDate(new Date(editedTask.dueDate))}</span>
                            <button className="ml-2 text-gray-400 hover:text-gray-600">
                                <Icon name="edit" size={14} />
                            </button>
                        </div>
                    ) : (
                        <button className="text-sm text-blue-500 hover:text-blue-600">
                            Set due date
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">Content:</div>
                    <div className="border border-gray-200 rounded-md">
                        <div className="flex items-center border-b border-gray-200 p-1 bg-gray-50">
                            <button className="p-1 rounded hover:bg-gray-200 mr-1">
                                <Icon name="edit" size={16} />
                            </button>
                            <button className="p-1 rounded hover:bg-gray-200 mr-1">
                                <Icon name="list" size={16} />
                            </button>
                            <button className="p-1 rounded hover:bg-gray-200 mr-1">
                                <Icon name="check" size={16} />
                            </button>
                        </div>
                        <textarea
                            value={editedTask.content || ''}
                            onChange={handleContentChange}
                            className="w-full p-3 min-h-[200px] focus:outline-none"
                            placeholder="Add notes here..."
                        />
                    </div>
                </div>

                <div className="flex flex-col space-y-2 mt-6">
                    <div className="flex items-center text-sm text-gray-600">
                        <Icon name="inbox" size={14} className="mr-2" />
                        <span>List: {editedTask.list}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Icon name="clock" size={14} className="mr-2" />
                        <span>Created: {formatDate(new Date(editedTask.createdAt))}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Icon name="clock" size={14} className="mr-2" />
                        <span>Updated: {formatDate(new Date(editedTask.updatedAt))}</span>
                    </div>
                </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
                <Button variant="ghost" size="sm" icon="trash" iconPosition="left">
                    Delete
                </Button>
                <Button variant="primary" size="sm">
                    Save
                </Button>
            </div>
        </div>
    );
};

export default TaskDetail;