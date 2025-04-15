// src/components/tasks/TaskList.tsx
import React from 'react';
import TaskItem from './TaskItem';
import { useAppContext } from '../../context/AppContext';
import Icon from '../common/Icon';
import Button from '../common/Button';

interface TaskListProps {
    title: string;
    showViewToggle?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ title, showViewToggle = true }) => {
    const { tasks, selectedTask, listDisplayMode, setListDisplayMode } = useAppContext();

    const uncompletedTasks = tasks.filter(task => !task.completed);

    const toggleViewMode = () => {
        setListDisplayMode(listDisplayMode === 'expanded' ? 'compact' : 'expanded');
    };

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h1 className="text-xl font-medium text-gray-800">{title}</h1>
                <div className="flex items-center space-x-2">
                    {showViewToggle && (
                        <button
                            onClick={toggleViewMode}
                            className="p-1 rounded-md hover:bg-gray-100"
                            title={listDisplayMode === 'expanded' ? 'Compact view' : 'Expanded view'}
                        >
                            <Icon name={listDisplayMode === 'expanded' ? 'list' : 'grid'} size={18} />
                        </button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        icon="more-horizontal"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {uncompletedTasks.length > 0 ? (
                    uncompletedTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            isSelected={selectedTask?.id === task.id}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="mb-2">
                            <Icon name="check-square" size={48} className="text-gray-300" />
                        </div>
                        <p>No tasks here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskList;