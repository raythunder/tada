// src/pages/MainPage.tsx
import React, { useMemo } from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAtomValue } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence } from 'framer-motion'; // Keep AnimatePresence for TaskDetail

interface MainPageProps {
    title: string; // Page title (e.g., "Today", "Inbox")
    filter: TaskFilter; // Filter context (used by RouteChangeHandler)
}

const MainPage: React.FC<MainPageProps> = ({ title }) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    // Memoize the TaskList container class calculation
    const taskListContainerClass = useMemo(() => twMerge(
        "flex-1 h-full min-w-0 transition-all duration-300 ease-apple", // Base styles + transition
        selectedTaskId ? "border-r border-black/10" : "" // Conditional border when detail view is open
    ), [selectedTaskId]);

    // TaskList now uses the global currentFilterAtom set by RouteChangeHandler.
    // The title prop is still used for the header display.
    // The filter prop is primarily for RouteChangeHandler context setting.

    return (
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container */}
            <div className={taskListContainerClass}>
                {/* Pass the title for display */}
                <TaskList title={title} />
            </div>

            {/* TaskDetail - Animated presence */}
            {/* AnimatePresence handles the mounting/unmounting animation */}
            <AnimatePresence initial={false}>
                {selectedTaskId && <TaskDetail key="taskDetail" />}
            </AnimatePresence>
        </div>
    );
};
MainPage.displayName = 'MainPage'; // Add display name
export default MainPage;