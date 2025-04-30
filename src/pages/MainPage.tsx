// src/pages/MainPage.tsx
import React, {useMemo} from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import {useAtomValue} from 'jotai';
import {selectedTaskIdAtom} from '../store/atoms';
import {TaskFilter} from '@/types';
import {twMerge} from 'tailwind-merge';
import {AnimatePresence} from 'framer-motion';

interface MainPageProps {
    title: string; // Page title (e.g., "Today", "Inbox")
    filter: TaskFilter; // Filter context (used by RouteChangeHandler)
}

const MainPage: React.FC<MainPageProps> = ({title}) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    // Use transition on max-width/flex-basis for smoother resize
    const taskListContainerClass = useMemo(() => twMerge(
        "h-full transition-[max-width,flex-basis] duration-300 ease-apple", // Target flex-basis and max-width
        selectedTaskId
            ? "flex-basis-[calc(100%-420px)] max-w-[calc(100%-420px)]" // Shrink when detail is open
            : "flex-basis-full max-w-full", // Full width when detail is closed
        "flex-shrink-0" // Prevent shrinking beyond basis
    ), [selectedTaskId]);

    return (
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container */}
            <div className={taskListContainerClass}>
                {/* TaskList uses global filter, title is for display */}
                <TaskList title={title}/>
            </div>

            {/* TaskDetail - Animated presence */}
            <AnimatePresence initial={false}>
                {selectedTaskId && <TaskDetail key="taskDetail"/>}
            </AnimatePresence>
        </div>
    );
};
MainPage.displayName = 'MainPage';
export default MainPage;