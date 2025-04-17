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
        <div className="h-full flex flex-1 overflow-hidden">
            {/* Task List */}
            <div className="flex-1 h-full min-w-0 border-r border-border-color/60">
                <TaskList title={title} filter={filter} />
            </div>

            {/* Task Detail - AnimatePresence correctly handles mount/unmount */}
            {/* Removed the placeholder logic - TaskDetail only renders when ID exists */}
            <AnimatePresence initial={false}>
                {selectedTaskId && <TaskDetail key={selectedTaskId} />}
                {/* Key ensures component remounts or updates correctly when ID changes */}
                {/* The TaskDetail component itself handles fetching the correct task data based on the atom */}
                {/* This structure ensures only one TaskDetail is rendered and animated */}
            </AnimatePresence>
        </div>
    );
};

export default MainPage;