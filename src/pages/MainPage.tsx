// src/pages/MainPage.tsx
import React, { useMemo } from 'react'; // Import useMemo
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAtomValue } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence } from 'framer-motion'; // Keep for TaskDetail animation

interface MainPageProps {
    title: string; // Page title (e.g., "Today", "Inbox")
    filter: TaskFilter; // Filter to apply to the TaskList (passed from routing)
}

const MainPage: React.FC<MainPageProps> = ({ title, filter }) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    // Performance: Memoize the TaskList container class calculation
    const taskListContainerClass = useMemo(() => twMerge(
        "flex-1 h-full min-w-0 transition-all duration-300 ease-apple", // Base styles + transition
        selectedTaskId ? "border-r border-black/10" : "" // Conditional border when detail view is open
    ), [selectedTaskId]);

    return (
        // Main container using flexbox
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container */}
            {/* Performance: TaskList itself handles internal optimizations */}
            <div className={taskListContainerClass}>
                {/* Pass title and filter as props */}
                {/* TaskList uses currentFilterAtom internally, but receiving filter prop might be useful for initial setup */}
                <TaskList title={title} filter={filter} />
            </div>

            {/* TaskDetail (conditionally rendered with Framer Motion animation) */}
            {/* AnimatePresence handles the mounting/unmounting animation */}
            <AnimatePresence>
                {selectedTaskId && <TaskDetail key="taskDetail" />}
            </AnimatePresence>
        </div>
    );
};

export default MainPage; // No need to memoize page components usually