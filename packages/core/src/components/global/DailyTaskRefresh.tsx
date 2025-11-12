import React, { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { tasksAtom } from '@/store/jotai';
import { startOfDay } from '@/utils/dateUtils';

/**
 * A global, non-visual component that triggers a refresh of task data
 * when the date changes (e.g., at midnight). This ensures that date-based
 * filters and groupings (like "Today" or "Overdue") are updated automatically.
 */
const DailyTaskRefresh: React.FC = () => {
    const setTasks = useSetAtom(tasksAtom);
    const lastCheckDateRef = useRef<string>(startOfDay(new Date()).toISOString().split('T')[0]);

    useEffect(() => {
        const checkDate = () => {
            const todayDate = startOfDay(new Date()).toISOString().split('T')[0];
            if (todayDate !== lastCheckDateRef.current) {
                console.log(`Date changed from ${lastCheckDateRef.current} to ${todayDate}. Triggering task category refresh.`);
                // Trigger a re-evaluation of tasks by setting them to their current value.
                // This will cause derived atoms (like `groupedAllTasksAtom`) to recalculate.
                setTasks(currentTasks => [...(currentTasks ?? [])]);
                lastCheckDateRef.current = todayDate;
            }
        };

        // Check immediately on mount
        checkDate();

        // Check every minute for the date change
        const intervalId = setInterval(checkDate, 60 * 1000);

        // Also check when the window gains focus, in case the device was asleep
        window.addEventListener('focus', checkDate);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', checkDate);
        };
    }, [setTasks]);

    return null; // This component does not render anything
};

DailyTaskRefresh.displayName = 'DailyTaskRefresh';
export default DailyTaskRefresh;