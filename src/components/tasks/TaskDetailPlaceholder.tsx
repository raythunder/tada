// src/components/tasks/TaskDetailPlaceholder.tsx
import React from 'react';
import Icon from '../common/Icon';
import {twMerge} from 'tailwind-merge';

const TaskDetailPlaceholder: React.FC = () => {
    return (
        <div className={twMerge(
            "h-full flex flex-col items-center justify-center text-center p-8",
            "bg-white", // Pure white background
            "border-l-2 border-grey-ultra-light" // Match TaskDetail left separator
        )}>
            <Icon name="file-text" size={40} strokeWidth={1}
                  className="text-grey-light mb-4 opacity-80"/> {/* Thinner icon */}
            <h3 className="text-[16px] font-normal text-grey-dark mb-1">No Task Selected</h3> {/* Updated typography */}
            <p className="text-[13px] font-light text-grey-medium"> {/* Updated typography */}
                Select a task from the list to view its details.
            </p>
        </div>
    );
};

TaskDetailPlaceholder.displayName = 'TaskDetailPlaceholder';
export default TaskDetailPlaceholder;