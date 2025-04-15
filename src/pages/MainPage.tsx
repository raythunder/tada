// src/pages/MainPage.tsx
import React from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAppContext } from '../context/AppContext';

interface MainPageProps {
    title: string;
}

const MainPage: React.FC<MainPageProps> = ({ title }) => {
    const { selectedTask, setSelectedTask } = useAppContext();

    const handleCloseTaskDetail = () => {
        setSelectedTask(null);
    };

    return (
        <div className="h-full flex">
            <div className={`flex-1 h-full ${selectedTask ? 'border-r border-gray-200' : ''}`}>
                <TaskList title={title} />
            </div>
            {selectedTask && (
                <TaskDetail task={selectedTask} onClose={handleCloseTaskDetail} />
            )}
        </div>
    );
};

export default MainPage;