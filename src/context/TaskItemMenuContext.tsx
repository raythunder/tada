// src/context/TaskItemMenuContext.tsx
import React, { createContext, useState, useMemo, useContext } from 'react';

interface TaskItemMenuContextType {
    openItemId: string | null;
    setOpenItemId: (id: string | null) => void;
}

const TaskItemMenuContext = createContext<TaskItemMenuContextType | undefined>(undefined);

export const TaskItemMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [openItemId, setOpenItemId] = useState<string | null>(null);

    const contextValue = useMemo(() => ({
        openItemId,
        setOpenItemId,
    }), [openItemId]);

    return (
        <TaskItemMenuContext.Provider value={contextValue}>
            {children}
        </TaskItemMenuContext.Provider>
    );
};

export const useTaskItemMenu = (): TaskItemMenuContextType => {
    const context = useContext(TaskItemMenuContext);
    if (context === undefined) {
        throw new Error('useTaskItemMenu must be used within a TaskItemMenuProvider');
    }
    return context;
};
TaskItemMenuProvider.displayName = 'TaskItemMenuProvider';