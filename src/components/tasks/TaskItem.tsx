// src/components/tasks/TaskItem.tsx
import React from 'react';
import { Task } from '../../types';
import { formatDate, isOverdue } from '../../utils/dateUtils';
import { useAppContext } from '../../context/AppContext';

interface TaskItemProps {
    task: Task;
    isSelected?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isSelected = false }) => {
    const { setSelectedTask } = useAppContext();

    const handleTaskClick = () => {
        setSelectedTask(task);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        // In a real app, you would update the task's completed status
        console.log("Toggle task completion", task.id);
    };

    return (
        <div
            className={`task-item flex items-center p-2 border-b border-gray-100 cursor-pointer ${
                isSelected ? 'bg-blue-50' : ''
            }`}
            onClick={handleTaskClick}
        >
            <input
                type="checkbox"
                checked={task.completed}
                onChange={handleCheckboxChange}
                className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 truncate">{task.title}</div>
                {task.dueDate && (
                    <div className={`text-xs ${isOverdue(new Date(task.dueDate)) ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatDate(new Date(task.dueDate))}
                    </div>
                )}
            </div>
            <div className="ml-2 text-xs text-gray-500">
                {task.list}
            </div>
        </div>
    );
};

export default TaskItem;