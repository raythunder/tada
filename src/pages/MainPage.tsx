// src/pages/MainPage.tsx
import React from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAtomValue } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { AnimatePresence } from 'framer-motion';

interface MainPageProps {
    title: string;
    filter: TaskFilter;
}

const MainPage: React.FC<MainPageProps> = ({ title, filter }) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    return (
        // Main container for the Task List / Detail view
        <div className="h-full flex flex-1 overflow-hidden">

            {/* Task List takes available space */}
            {/* TaskList itself applies glass effect */}
            <div className="flex-1 h-full min-w-0 border-r border-black/5">
                <TaskList title={title} filter={filter} />
            </div>

            {/* Task Detail slides in/out using AnimatePresence */}
            {/* TaskDetail itself applies glass effect */}
            <AnimatePresence initial={false}>
                {selectedTaskId && <TaskDetail />}
            </AnimatePresence>

        </div>
    );
};

export default MainPage;