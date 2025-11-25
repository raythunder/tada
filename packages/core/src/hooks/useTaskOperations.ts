import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { tasksAtom } from '@/store/jotai';
import { Task, Subtask } from '@/types';
import storageManager from '@/services/storageManager';

/**
 * A custom hook that provides methods to perform CRUD operations on tasks.
 * It ensures that updates are reflected in the global state (Atom) immediately
 * and persisted to the storage service synchronously (or awaited async) to prevent data loss.
 */
export const useTaskOperations = () => {
    const setTasks = useSetAtom(tasksAtom);

    const createTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'groupCategory'>) => {
        const service = storageManager.get();
        // Perform the creation in the service to get the full Task object with ID and timestamps
        const newTask = service.createTask(taskData);

        // Update the atom state with the new task
        setTasks(prev => [newTask, ...(prev ?? [])]);
        return newTask;
    }, [setTasks]);

    const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
        const service = storageManager.get();
        // Persist to storage immediately
        const updatedTask = service.updateTask(taskId, updates);

        // Update atom state
        setTasks(prev => {
            const currentTasks = prev ?? [];
            return currentTasks.map(t => t.id === taskId ? updatedTask : t);
        });
        return updatedTask;
    }, [setTasks]);

    const deleteTask = useCallback((taskId: string) => {
        const service = storageManager.get();
        // Persist deletion immediately
        service.deleteTask(taskId);

        // Update atom state
        setTasks(prev => {
            const currentTasks = prev ?? [];
            return currentTasks.filter(t => t.id !== taskId);
        });
    }, [setTasks]);

    const batchUpdateTasks = useCallback(async (tasks: Task[]) => {
        const service = storageManager.get();
        if (service.batchUpdateTasks) {
            await service.batchUpdateTasks(tasks);
        } else {
            service.updateTasks(tasks);
        }
        // Update atom state
        setTasks(tasks);
    }, [setTasks]);

    // --- Subtask Operations ---

    const createSubtask = useCallback((taskId: string, subtaskData: { title: string, order: number, dueDate: number | null }) => {
        const service = storageManager.get();
        const newSubtask = service.createSubtask(taskId, subtaskData);

        setTasks(prev => {
            const currentTasks = prev ?? [];
            return currentTasks.map(t => {
                if (t.id === taskId) {
                    const subtasks = t.subtasks ? [...t.subtasks, newSubtask] : [newSubtask];
                    return { ...t, subtasks: subtasks.sort((a, b) => a.order - b.order) };
                }
                return t;
            });
        });
        return newSubtask;
    }, [setTasks]);

    const updateSubtask = useCallback((taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
        const service = storageManager.get();
        const updatedSubtask = service.updateSubtask(subtaskId, updates);

        setTasks(prev => {
            const currentTasks = prev ?? [];
            return currentTasks.map(t => {
                if (t.id === taskId && t.subtasks) {
                    return {
                        ...t,
                        subtasks: t.subtasks.map(s => s.id === subtaskId ? updatedSubtask : s)
                    };
                }
                return t;
            });
        });
        return updatedSubtask;
    }, [setTasks]);

    const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
        const service = storageManager.get();
        service.deleteSubtask(subtaskId);

        setTasks(prev => {
            const currentTasks = prev ?? [];
            return currentTasks.map(t => {
                if (t.id === taskId && t.subtasks) {
                    return {
                        ...t,
                        subtasks: t.subtasks.filter(s => s.id !== subtaskId)
                    };
                }
                return t;
            });
        });
    }, [setTasks]);

    return {
        createTask,
        updateTask,
        deleteTask,
        batchUpdateTasks,
        createSubtask,
        updateSubtask,
        deleteSubtask
    };
};