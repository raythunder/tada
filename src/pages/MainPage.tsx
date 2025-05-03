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

    // TaskList container class calculation (remains the same)
    const taskListContainerClass = useMemo(() => twMerge(
        "flex-1 h-full min-w-0 transition-[flex-basis] duration-300 ease-apple", // Apply transition specifically to flex-basis
        selectedTaskId ? "border-r border-black/10" : ""
    ), [selectedTaskId]);

    return (
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container */}
            <div className={taskListContainerClass}>
                <TaskList title={title}/> {/* Uses Radix components internally */}
            </div>

            {/* TaskDetail - Animated presence (remains the same) */}
            <AnimatePresence initial={false}>
                {selectedTaskId && <TaskDetail key="taskDetail"/>} {/* Uses Radix components internally */}
            </AnimatePresence>
        </div>
    );
};
MainPage.displayName = 'MainPage';
export default MainPage;