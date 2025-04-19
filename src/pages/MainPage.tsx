// src/pages/MainPage.tsx
import React from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail'; // Assuming TaskDetail exists and handles its own animation
import { useAtomValue } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence } from 'framer-motion';

interface MainPageProps {
    title: string; // Page title (e.g., "Today", "Inbox")
    filter: TaskFilter; // Filter to apply to the TaskList (passed from routing)
}

const MainPage: React.FC<MainPageProps> = ({ title, filter }) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    return (
        // Main container using flexbox
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container */}
            <div className={twMerge(
                "flex-1 h-full min-w-0", // Takes remaining space, prevents shrinking below content size
                selectedTaskId ? "border-r border-black/10" : "" // Conditional border
            )}
            >
                {/* TaskList receives filter and title, internally uses key for view switching */}
                <TaskList title={title} filter={filter} />
            </div>

            {/* TaskDetail (conditionally rendered with its own animation) */}
            <AnimatePresence>
                {selectedTaskId && <TaskDetail key="taskDetail" />}
            </AnimatePresence>
        </div>
    );
};

export default MainPage;