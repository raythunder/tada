// src/store/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { User, Task, TaskFilter, TaskGroupCategory, SettingsTab } from '@/types';
import { isToday, isWithinNext7Days, isOverdue, startOfDay, safeParseDate, isValid as isValidDate } from '@/utils/dateUtils'; // Use utils

// --- Base Atoms ---
export const currentUserAtom = atom<User | null>({
    id: '1', name: 'Liu Yunpeng', email: 'yp.leao@gmail.com', avatar: '/vite.svg', isPremium: true,
});

const initialTasks: Task[] = [
    { id: '11', title: '体检预约', completed: false, dueDate: startOfDay(new Date(Date.now() - 86400000 * 2)).getTime(), list: 'Personal', content: 'Call the clinic.', order: 7, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 3, priority: 1 },
    { id: '1', title: '施工组织设计评审表', completed: false, dueDate: startOfDay(new Date()).getTime(), list: 'Work', content: 'Review the construction plan details.', order: 1, createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 3600000, priority: 1, tags: ['review', 'urgent'] },
    { id: '8', title: '准备明天会议材料', completed: false, dueDate: startOfDay(new Date()).getTime(), list: 'Work', content: 'Finalize slides.', order: 0, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 100000, priority: 1 },
    { id: '2', title: '开发框架讲解', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000)).getTime(), list: 'Work', content: 'Prepare slides for the team meeting.', order: 2, createdAt: Date.now() - 86400000, updatedAt: Date.now(), priority: 2 },
    { id: '3', title: 'RESTful讲解', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000 * 3)).getTime(), list: 'Work', content: '', order: 3, createdAt: Date.now() - 86400000, updatedAt: Date.now(), tags: ['presentation'] },
    { id: '9', title: '下周项目规划', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000 * 10)).getTime(), list: 'Planning', content: 'Define milestones for Q4.', order: 4, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 50000 },
    { id: '4', title: '欢迎加入Tada', completed: false, dueDate: null, list: 'Inbox', content: 'Explore features:\n- **Tasks**\n- Calendar\n- Summary', order: 5, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 * 5 },
    { id: '10', title: '研究 CodeMirror Themes', completed: false, dueDate: null, list: 'Dev', content: 'Find a good light/dark theme.', order: 6, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 1 },
    { id: '5', title: '我能用Tada做什么?', completed: true, dueDate: null, list: 'Inbox', content: 'Organize life, track projects, collaborate.', order: 8, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 3 },
    { id: '7', title: 'Swagger2讲解 (Completed)', completed: true, dueDate: new Date(2024, 6, 14).getTime(), list: 'Work', content: 'Focus on API documentation standards.', order: 10, createdAt: new Date(2024, 6, 14).getTime(), updatedAt: new Date(2024, 6, 14).getTime() },
    { id: '6', title: '研究一下patch (Trashed)', completed: false, dueDate: new Date(2024, 6, 13).getTime(), list: 'Trash', content: '', order: 9, createdAt: new Date(2024, 6, 13).getTime(), updatedAt: new Date(2024, 6, 15).getTime() },
].sort((a, b) => a.order - b.order);

export const tasksAtom = atomWithStorage<Task[]>('tasks', initialTasks, undefined, { getOnInit: true });

// Store user-defined lists explicitly (start with a few examples + Inbox)
const initialUserDefinedLists = ['Work', 'Personal', 'Planning', 'Dev'];
export const userDefinedListsAtom = atomWithStorage<string[]>('userDefinedLists', initialUserDefinedLists, undefined, { getOnInit: true });

// UI State Atoms
export const selectedTaskIdAtom = atom<string | null>(null);
export const isSettingsOpenAtom = atom<boolean>(false);
export const settingsSelectedTabAtom = atom<SettingsTab>('account');
export const isAddListModalOpenAtom = atom<boolean>(false);
export const currentFilterAtom = atom<TaskFilter>('all');

// --- Derived Atoms ---
export const selectedTaskAtom = atom<Task | null>((get) => {
    const tasks = get(tasksAtom);
    const selectedId = get(selectedTaskIdAtom);
    return tasks.find(task => task.id === selectedId) ?? null;
});

// User List Names: Combines predefined lists with lists found in non-system tasks. Always includes Inbox.
export const userListNamesAtom = atom<string[]>((get) => {
    const tasks = get(tasksAtom);
    const userDefined = get(userDefinedListsAtom);
    const systemLists = ['Trash', 'Archive']; // Not considered 'user' lists for sidebar grouping

    const listsFromTasks = new Set<string>();
    tasks.forEach(task => {
        if (task.list && !systemLists.includes(task.list)) {
            listsFromTasks.add(task.list);
        }
    });

    // Ensure 'Inbox' and all user-defined lists are included, plus any found in tasks
    const combined = new Set(['Inbox', ...userDefined, ...listsFromTasks]);

    return Array.from(combined).sort((a, b) => {
        if (a === 'Inbox') return -1; // Keep Inbox first
        if (b === 'Inbox') return 1;
        return a.localeCompare(b); // Sort others alphabetically
    });
});

// Filtered Tasks: Based on currentFilterAtom, sorted by 'order'
export const filteredTasksAtom = atom<Task[]>((get) => {
    const tasks = get(tasksAtom);
    const filter = get(currentFilterAtom);
    const activeTasks = tasks.filter(task => task.list !== 'Trash');
    const trashedTasks = tasks.filter(task => task.list === 'Trash');

    let filtered: Task[];

    switch (filter) {
        case 'all':       filtered = activeTasks.filter(t => !t.completed); break;
        case 'today':     filtered = activeTasks.filter(t => !t.completed && t.dueDate != null && isToday(t.dueDate)); break;
        case 'next7days': filtered = activeTasks.filter(t => !t.completed && t.dueDate != null && isWithinNext7Days(t.dueDate)); break;
        case 'completed': filtered = activeTasks.filter(t => t.completed).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); break;
        case 'trash':     filtered = trashedTasks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); break;
        default:
            if (filter.startsWith('list-')) {
                const listName = filter.substring(5);
                filtered = activeTasks.filter(t => !t.completed && t.list === listName);
            } else if (filter.startsWith('tag-')) {
                const tagName = filter.substring(4);
                filtered = activeTasks.filter(t => !t.completed && t.tags?.includes(tagName));
            } else {
                console.warn(`Unrecognized filter: ${filter}. Falling back to 'all'.`);
                filtered = activeTasks.filter(t => !t.completed);
            }
            break;
    }

    // Default sort by 'order' for non-completed/non-trash views
    if (filter !== 'completed' && filter !== 'trash') {
        return filtered.sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));
    }
    return filtered;
});

// User Tag Names: Unique tags from non-trashed tasks
export const userTagNamesAtom = atom<string[]>((get) => {
    const tasks = get(tasksAtom);
    const tags = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => {
        task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
});

// Task Counts for Sidebar: Optimized calculation
export const taskCountsAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const allUserListNames = get(userListNamesAtom);
    const allUserTagNames = get(userTagNamesAtom);
    const activeTasks = tasks.filter(task => task.list !== 'Trash');

    const counts = {
        all: 0, today: 0, next7days: 0,
        completed: activeTasks.filter(t => t.completed).length,
        trash: tasks.filter(t => t.list === 'Trash').length,
        lists: Object.fromEntries(allUserListNames.map(name => [name, 0])),
        tags: Object.fromEntries(allUserTagNames.map(name => [name, 0])),
    };

    activeTasks.filter(t => !t.completed).forEach(task => {
        counts.all++;
        if (task.dueDate != null) {
            if (isToday(task.dueDate)) counts.today++;
            if (isWithinNext7Days(task.dueDate)) counts.next7days++;
        }
        if (task.list && task.list in counts.lists) counts.lists[task.list]++;
        task.tags?.forEach(tag => { if (tag in counts.tags) counts.tags[tag]++; });
    });

    return counts;
});

// Grouped Tasks for 'All Tasks' View: Sorted within groups by 'order'
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => {
    const allActiveNonCompleted = get(tasksAtom)
        .filter(t => t.list !== 'Trash' && !t.completed)
        .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt)); // Ensure sorted input

    const groups: Record<TaskGroupCategory, Task[]> = { overdue: [], today: [], next7days: [], later: [], nodate: [] };

    allActiveNonCompleted.forEach(task => {
        const dueDateObj = safeParseDate(task.dueDate);
        if (dueDateObj && isValidDate(dueDateObj)) { // Check validity explicitly
            if (isOverdue(dueDateObj)) groups.overdue.push(task);
            else if (isToday(dueDateObj)) groups.today.push(task);
            else if (isWithinNext7Days(dueDateObj)) groups.next7days.push(task); // Contains day 2-7
            else groups.later.push(task);
        } else {
            groups.nodate.push(task); // Includes null, undefined, or invalid dates
        }
    });
    return groups; // Groups inherit sort order from input list
});