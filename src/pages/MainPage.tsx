// src/pages/MainPage.tsx
import React from 'react';
import TaskList from '../components/tasks/TaskList';
import TaskDetail from '../components/tasks/TaskDetail';
import { useAtomValue } from 'jotai';
import { selectedTaskIdAtom } from '../store/atoms';
import { TaskFilter } from '@/types';
import { cn } from "@/lib/utils";
import { AnimatePresence } from 'framer-motion';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface MainPageProps {
    title: string; // Page title (e.g., "Today", "Inbox")
    filter: TaskFilter; // Passed for context, but TaskList uses global state
}

const MainPage: React.FC<MainPageProps> = ({ title }) => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);

    return (
        // Use ResizablePanelGroup for the split view
        <ResizablePanelGroup
            direction="horizontal"
            className="h-full flex flex-1 overflow-hidden"
        >
            {/* TaskList Panel */}
            <ResizablePanel
                defaultSize={selectedTaskId ? 65 : 100} // Adjust based on detail view open state
                minSize={40} // Minimum width for task list
                // Key helps React re-render panel sizes correctly when selectedTaskId changes
                key={`list-panel-${selectedTaskId ? 'open' : 'closed'}`}
                className={cn(
                    "transition-all duration-300 ease-apple", // Smooth resize transition
                    "!overflow-visible" // Ensure popovers/menus in TaskList can overflow
                )}
            >
                <div className="h-full"> {/* Ensure TaskList takes full height */}
                    <TaskList title={title} />
                </div>
            </ResizablePanel>

            {/* AnimatePresence handles the conditional rendering and animation of TaskDetail */}
            <AnimatePresence initial={false}>
                {selectedTaskId && (
                    <>
                        <ResizableHandle withHandle />
                        <ResizablePanel
                            defaultSize={35}
                            minSize={30} // Minimum width for task detail
                            maxSize={50}
                            key={`detail-panel-${selectedTaskId}`} // Key ensures panel animates in/out correctly
                            className="!overflow-visible" // Allow popovers/menus in TaskDetail to overflow
                        >
                            {/* TaskDetail itself contains the motion.div for its own animation */}
                            <TaskDetail />
                        </ResizablePanel>
                    </>
                )}
            </AnimatePresence>

        </ResizablePanelGroup>
    );
};
MainPage.displayName = 'MainPage';
export default MainPage;