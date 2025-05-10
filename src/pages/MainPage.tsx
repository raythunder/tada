// src/pages/MainPage.tsx
import React from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import TaskDetailPlaceholder from '../components/tasks/TaskDetailPlaceholder';
import {useAtomValue} from 'jotai';
import {selectedTaskIdAtom} from '../store/atoms';
import {TaskFilter} from '@/types';
import {twMerge} from 'tailwind-merge';
import {AnimatePresence, motion} from 'framer-motion';

interface MainPageProps {
    title: string;
    filter: TaskFilter; // Filter prop is passed to TaskList but not directly used for layout here
}

const MainPage: React.FC<MainPageProps> = ({title}) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    // Responsive layout determination based on spec:
    // Desktop (>1024px): Three-column (IconBar, TaskList 320px, Detail/Content flex)
    // For simplicity, assuming MainPage is within a layout that already handles IconBar.
    // Here, MainPage itself handles TaskList and TaskDetail/Placeholder.
    // The provided spec implies TaskList is 320px or 30%. Let's use 320px for fixed.
    // This logic would typically be in MainLayout or here using a window resize listener if more complex.
    // For now, apply the fixed width for TaskList and flex for Detail.

    return (
        <div className="h-full flex flex-1 overflow-hidden">
            {/* TaskList Container - Fixed width 320px */}
            <div className={twMerge(
                "h-full w-[320px] flex-shrink-0", // Fixed width for TaskList
                "bg-white", // Background for TaskList area
                "border-r border-grey-ultra-light" // Separator for TaskList
            )}>
                <TaskList title={title}/>
            </div>

            {/* Right Pane (TaskDetail or Placeholder) - Takes remaining space */}
            <div
                className="h-full flex-1 relative overflow-hidden bg-white"> {/* Ensure this takes up remaining space and handles overflow */}
                {!selectedTaskId && <TaskDetailPlaceholder/>}
                <AnimatePresence initial={false}>
                    {selectedTaskId && (
                        <motion.div
                            key="taskDetailActual"
                            className="absolute inset-0 w-full h-full z-10 bg-white" // Ensure TaskDetail covers placeholder
                            initial={{x: '100%'}}
                            animate={{x: 0}}
                            exit={{x: '100%'}}
                            transition={{duration: 0.25, ease: [0.33, 1, 0.68, 1]}} // Spec: 0.25s ease-in-out
                        >
                            <TaskDetail/>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
MainPage.displayName = 'MainPage';
export default MainPage;