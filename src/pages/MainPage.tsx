// src/pages/MainPage.tsx
import React from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAtomValue } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { twMerge } from 'tailwind-merge';

interface MainPageProps {
    title: string; // Page title (e.g., "Today", "Inbox")
    filter: TaskFilter; // Filter to apply to the TaskList
}

const MainPage: React.FC<MainPageProps> = ({ title, filter }) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    return (
        // Main container using flexbox
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container */}
            {/* REQ 5: Removed transition class. Flex handles resizing instantly. */}
            <div className={twMerge(
                "flex-1 h-full min-w-0", // Takes remaining space, prevents shrinking below content size
                // Add border only if TaskDetail is shown for visual separation
                selectedTaskId ? "border-r border-black/5" : ""
            )}
            >
                <TaskList title={title} filter={filter} />
            </div>

            {/* TaskDetail (conditionally rendered) */}
            {/* REQ 2 & 5: TaskDetail now handles its own entry/exit without affecting TaskList width animation */}
            {selectedTaskId && <TaskDetail />}
        </div>
    );
};

export default MainPage;