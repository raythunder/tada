// src/store/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { User, Task, ListDisplayMode, TaskFilter, SettingsTab } from '@/types';
import { isToday, isWithinNext7Days } from '@/utils/dateUtils';

// --- Base Atoms ---

export const currentUserAtom = atom<User | null>({
    id: '1',
    name: 'Liu Yunpeng',
    email: 'yp.leao@gmail.com',
    avatar: '/vite.svg', // Default Vite logo as placeholder
    isPremium: true,
});

// Use atomWithStorage for persistence (e.g., localStorage)
// Note: Storing complex objects like Dates directly in localStorage is tricky.
// Timestamps are safer. We'll store tasks with timestamps.
const initialTasks: Task[] = [
    { id: '1', title: '施工组织设计评审表', completed: false, dueDate: Date.now(), list: 'Inbox', content: 'Review the construction plan details.', order: 0, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 3600000, priority: 1 },
    { id: '2', title: '开发框架讲解', completed: false, dueDate: Date.now() + 86400000, list: 'Work', content: 'Prepare slides for the team meeting.', order: 1, createdAt: Date.now() - 86400000, updatedAt: Date.now(), priority: 2 },
    { id: '3', title: 'RESTful讲解', completed: false, dueDate: Date.now() + 86400000 * 3, list: 'Work', content: '', order: 2, createdAt: Date.now() - 86400000, updatedAt: Date.now() },
    { id: '4', title: '欢迎加入Tada', completed: false, dueDate: null, list: 'Inbox', content: 'Explore features:\n- **Tasks**\n- Calendar\n- Summary', order: 3, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 * 5 },
    { id: '5', title: '我能用Tada做什么?', completed: true, dueDate: null, list: 'Inbox', content: 'Organize life, track projects, collaborate.', order: 4, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 3 },
    { id: '6', title: '研究一下patch', completed: true, dueDate: new Date(2024, 7, 13).getTime(), list: 'Archive', content: '', order: 5, createdAt: new Date(2024, 7, 13).getTime(), updatedAt: new Date(2024, 7, 14).getTime() },
    { id: '7', title: 'Swagger2讲解', completed: false, dueDate: new Date(2024, 7, 14).getTime(), list: 'Work', content: 'Focus on API documentation standards.', order: 6, createdAt: new Date(2024, 7, 14).getTime(), updatedAt: new Date(2024, 7, 14).getTime() },
].sort((a, b) => a.order - b.order); // Ensure initial sort by order

// Store tasks in localStorage using timestamps
export const tasksAtom = atomWithStorage<Task[]>('tasks', initialTasks);

export const selectedTaskIdAtom = atom<string | null>(null);

export const listDisplayModeAtom = atomWithStorage<ListDisplayMode>('listDisplayMode', 'expanded');

export const isSettingsOpenAtom = atom<boolean>(false);
export const settingsSelectedTabAtom = atom<SettingsTab>('account');

// Represents the current filter applied (from URL/Sidebar)
export const currentFilterAtom = atom<TaskFilter>('all');

// --- Derived Atoms ---

export const selectedTaskAtom = atom<Task | null>((get) => {
    const tasks = get(tasksAtom);
    const selectedId = get(selectedTaskIdAtom);
    return tasks.find(task => task.id === selectedId) ?? null;
});

// Filtered Tasks based on the current route/filter
export const filteredTasksAtom = atom<Task[]>((get) => {
    const tasks = get(tasksAtom);
    const filter = get(currentFilterAtom);
    // const now = Date.now();

    // Exclude trashed tasks unless the filter is 'trash'
    const activeTasks = tasks.filter(task => task.list !== 'Trash');
    const trashedTasks = tasks.filter(task => task.list === 'Trash');

    switch (filter) {
        case 'all':
            return activeTasks.filter(task => !task.completed);
        case 'today':
            return activeTasks.filter(task => !task.completed && task.dueDate && isToday(task.dueDate));
        case 'next7days':
            return activeTasks.filter(task => !task.completed && task.dueDate && isWithinNext7Days(task.dueDate));
        case 'inbox':
            return activeTasks.filter(task => !task.completed && task.list === 'Inbox');
        case 'completed':
            return activeTasks.filter(task => task.completed); // Show completed non-trashed tasks
        case 'trash':
            return trashedTasks; // Show only trashed tasks
        default:
            if (filter.startsWith('list-')) {
                const listName = filter.substring(5);
                return activeTasks.filter(task => !task.completed && task.list === listName);
            }
            if (filter.startsWith('tag-')) {
                const tagName = filter.substring(4);
                return activeTasks.filter(task => !task.completed && task.tags?.includes(tagName));
            }
            return activeTasks.filter(task => !task.completed); // Fallback to 'all' essentially
    }
});

// Atom to get task counts for the sidebar
export const taskCountsAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const activeTasks = tasks.filter(task => task.list !== 'Trash');

    const counts = {
        all: activeTasks.filter(t => !t.completed).length,
        today: activeTasks.filter(t => !t.completed && t.dueDate && isToday(t.dueDate)).length,
        next7days: activeTasks.filter(t => !t.completed && t.dueDate && isWithinNext7Days(t.dueDate)).length,
        inbox: activeTasks.filter(t => !t.completed && t.list === 'Inbox').length,
        completed: activeTasks.filter(t => t.completed).length,
        trash: tasks.filter(t => t.list === 'Trash').length,
        lists: {} as Record<string, number>,
        tags: {} as Record<string, number>,
    };

    // Calculate counts for lists and tags dynamically
    activeTasks.filter(t => !t.completed).forEach(task => {
        // List counts (excluding 'Inbox')
        if (task.list && task.list !== 'Inbox') {
            counts.lists[task.list] = (counts.lists[task.list] || 0) + 1;
        }
        // Tag counts
        task.tags?.forEach(tag => {
            counts.tags[tag] = (counts.tags[tag] || 0) + 1;
        });
    });

    return counts;
});

// Atom to get unique list names (excluding special ones)
export const userListNamesAtom = atom<string[]>((get) => {
    const tasks = get(tasksAtom);
    const specialLists = ['Inbox', 'Trash'];
    const lists = new Set<string>();
    tasks.forEach(task => {
        if (task.list && !specialLists.includes(task.list)) {
            lists.add(task.list);
        }
    });
    return Array.from(lists).sort();
});

// Atom to get unique tag names
export const userTagNamesAtom = atom<string[]>((get) => {
    const tasks = get(tasksAtom);
    const tags = new Set<string>();
    tasks.forEach(task => {
        task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
});