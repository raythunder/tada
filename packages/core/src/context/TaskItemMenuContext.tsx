import React, {createContext, useContext, useMemo, useState} from 'react';

/**
 * Defines the shape of the context data for managing open menus on task items.
 */
interface TaskItemMenuContextType {
    openItemId: string | null; // ID of the task whose menu/picker is open
    setOpenItemId: (id: string | null) => void; // Function to set the open item ID
}

/**
 * React context to manage the state of which task item's menu/popover is currently open.
 * This ensures that only one menu is open at a time across the entire task list.
 */
const TaskItemMenuContext = createContext<TaskItemMenuContextType | undefined>(undefined);

/**
 * Provider component for the TaskItemMenuContext.
 */
export const TaskItemMenuProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [openItemId, setOpenItemId] = useState<string | null>(null);

    // Memoize the context value to prevent unnecessary re-renders of consumers
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
TaskItemMenuProvider.displayName = 'TaskItemMenuProvider';


/**
 * Custom hook to consume the TaskItemMenuContext.
 * Throws an error if used outside of a TaskItemMenuProvider.
 */
export const useTaskItemMenu = (): TaskItemMenuContextType => {
    const context = useContext(TaskItemMenuContext);
    if (context === undefined) {
        throw new Error('useTaskItemMenu must be used within a TaskItemMenuProvider');
    }
    return context;
};