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
    filter: TaskFilter;
}

const MainPage: React.FC<MainPageProps> = ({ title, filter }) => {
    const [selectedTaskId] = useAtom(selectedTaskIdAtom);

    return (
        // This component now just orchestrates TaskList and TaskDetail side-by-side
        <div className="h-full flex flex-1 overflow-hidden">
            {/* Task List takes available space, Detail view has fixed width */}
            <div className="flex-1 h-full min-w-0"> {/* min-w-0 prevents overflow */}
                <TaskList title={title} filter={filter} />
            </div>

            {/* Task Detail slides in/out */}
            {/* AnimatePresence handles the mounting/unmounting animation */}
            <AnimatePresence>
                {selectedTaskId && <TaskDetail key={selectedTaskId} />}
            </AnimatePresence>
        </div>
    );
};

export default MainPage;