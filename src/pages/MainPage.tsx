// src/pages/MainPage.tsx
import React, { useMemo } from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAtomValue } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence } from 'framer-motion';

interface MainPageProps {
    title: string; // Page title (e.g., "Today", "Inbox")
    filter: TaskFilter; // Filter context for this page (used by RouteChangeHandler)
}

const MainPage: React.FC<MainPageProps> = ({ title }) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    // Memoize the TaskList container class calculation
    const taskListContainerClass = useMemo(() => twMerge(
        "flex-1 h-full min-w-0 transition-all duration-300 ease-apple", // Base styles + transition
        selectedTaskId ? "border-r border-black/10" : "" // Conditional border
    ), [selectedTaskId]);

    // Note: TaskList now uses the global currentFilterAtom, set by RouteChangeHandler.
    // The filter prop passed here is mainly for context or potential initial state.
    // The title prop is still used for the header.

    return (
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container */}
            <div className={taskListContainerClass}>
                <TaskList title={title} />
            </div>

            {/* TaskDetail */}
            <AnimatePresence>
                {selectedTaskId && <TaskDetail key="taskDetail" />}
            </AnimatePresence>
        </div>
    );
};

export default MainPage;