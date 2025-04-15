// src/pages/MainPage.tsx
import React from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAtom } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { AnimatePresence } from 'framer-motion';

interface MainPageProps {
    title: string;
    filter: TaskFilter; // Pass the specific filter
}

const MainPage: React.FC<MainPageProps> = ({ title, filter }) => {
    const [selectedTaskId] = useAtom(selectedTaskIdAtom);

    return (
        <div className="h-full flex flex-1"> {/* Ensure it fills the main area */}
            {/* Task List takes available space */}
            <div className="flex-1 h-full min-w-0"> {/* min-w-0 prevents overflow issues */}
                <TaskList title={title} filter={filter} />
            </div>

            {/* Task Detail slides in/out */}
            <AnimatePresence>
                {selectedTaskId && <TaskDetail />}
            </AnimatePresence>
        </div>
    );
};

export default MainPage;