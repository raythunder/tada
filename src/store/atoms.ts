// src/store/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils'; // Import RESET
import { User, Task, TaskFilter, TaskGroupCategory, SettingsTab } from '@/types';
import {
    isToday, isWithinNext7Days, isOverdue, startOfDay, safeParseDate,
    isValid
} from '@/utils/dateUtils';

// --- Base Atoms ---

export const currentUserAtom = atom<User | null>({
    id: '1',
    name: 'Liu Yunpeng',
    email: 'yp.leao@gmail.com',
    avatar: '/vite.svg',
    isPremium: true,
});

// Helper function to determine the group category
const getTaskGroupCategory = (task: Task | Omit<Task, 'groupCategory'>): TaskGroupCategory => {
    if (task.dueDate != null) {
        const dueDateObj = safeParseDate(task.dueDate);
        if (!dueDateObj || !isValid(dueDateObj)) return 'nodate';
        // Check overdue *before* today/next7days
        if (isOverdue(dueDateObj)) return 'overdue';
        if (isToday(dueDateObj)) return 'today';
        if (isWithinNext7Days(dueDateObj)) return 'next7days'; // This correctly includes day 2-7 now due to overdue check above
        return 'later';
    }
    return 'nodate';
};

// Sample Data - ensure order is initially low numbers for visible tasks
const initialTasksData: Omit<Task, 'groupCategory'>[] = [
    // Today
    { id: '1', title: '施工组织设计评审表', completed: false, dueDate: startOfDay(new Date()).getTime(), list: 'Work', content: 'Review the construction plan details.', order: 0, createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 3600000, priority: 1, tags: ['review', 'urgent'] },
    { id: '8', title: '准备明天会议材料', completed: false, dueDate: startOfDay(new Date()).getTime(), list: 'Work', content: 'Finalize slides.', order: 1, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 100000, priority: 1 },
    // Next 7 Days (Tomorrow)
    { id: '2', title: '开发框架讲解', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000)).getTime(), list: 'Work', content: 'Prepare slides for the team meeting.', order: 2, createdAt: Date.now() - 86400000, updatedAt: Date.now(), priority: 2 },
    // Next 7 Days (Day 3)
    { id: '3', title: 'RESTful讲解', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000 * 3)).getTime(), list: 'Work', content: '', order: 3, createdAt: Date.now() - 86400000, updatedAt: Date.now(), tags: ['presentation'] },
    // No Due Date
    { id: '4', title: '欢迎加入Tada', completed: false, dueDate: null, list: 'Inbox', content: 'Explore features:\n- **Tasks**\n- Calendar\n- Summary', order: 4, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 * 5 },
    { id: '10', title: '研究 CodeMirror Themes', completed: false, dueDate: null, list: 'Dev', content: 'Find a good light/dark theme.', order: 5, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 1 },
    // Later (Day 10)
    { id: '9', title: '下周项目规划', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000 * 10)).getTime(), list: 'Planning', content: 'Define milestones for Q4.', order: 6, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 50000 },
    // Overdue
    { id: '11', title: '体检预约', completed: false, dueDate: startOfDay(new Date(Date.now() - 86400000 * 2)).getTime(), list: 'Personal', content: 'Call the clinic.', order: 7, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 3, priority: 1 }, // High prio overdue
    // Completed
    { id: '5', title: '我能用Tada做什么?', completed: true, dueDate: null, list: 'Inbox', content: 'Organize life, track projects, collaborate.', order: 8, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 3 },
    { id: '7', title: 'Swagger2讲解 (Completed)', completed: true, dueDate: new Date(2024, 6, 14).getTime(), list: 'Work', content: 'Focus on API documentation standards.', order: 10, createdAt: new Date(2024, 6, 14).getTime(), updatedAt: new Date(2024, 6, 14).getTime() },
    // Trashed
    { id: '6', title: '研究一下patch (Trashed)', completed: false, dueDate: new Date(2024, 6, 13).getTime(), list: 'Trash', content: '', order: 9, createdAt: new Date(2024, 6, 13).getTime(), updatedAt: new Date(2024, 6, 15).getTime() },
];

// Initialize tasks with calculated group categories and sort
const initialTasks: Task[] = initialTasksData
    .map(task => ({
        ...task,
        groupCategory: getTaskGroupCategory(task),
    }))
    .sort((a, b) => a.order - b.order);

// --- Tasks Atom with automatic category update and sorting persistence ---
const baseTasksAtom = atomWithStorage<Task[]>('tasks', initialTasks, undefined, { getOnInit: true });

export const tasksAtom = atom(
    (get) => get(baseTasksAtom),
    (get, set, update: Task[] | ((prev: Task[]) => Task[]) | typeof RESET) => {
        if (update === RESET) {
            set(baseTasksAtom, initialTasks); // Reset to initial state
            return;
        }
        const previousTasks = get(baseTasksAtom);
        const nextTasksRaw = typeof update === 'function' ? update(previousTasks) : update;

        // Update category and ensure tasks are sorted by order for persistence
        const nextTasksProcessed = nextTasksRaw
            .map(task => {
                const originalTask = previousTasks.find(t => t.id === task.id);
                // Recalculate category if dueDate changed, it's new, or category missing
                if (!originalTask || originalTask.dueDate !== task.dueDate || !task.groupCategory) {
                    return { ...task, groupCategory: getTaskGroupCategory(task) };
                }
                return task;
            })
            .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt)); // Persist sorting by order

        set(baseTasksAtom, nextTasksProcessed);
    }
);


// --- User Lists ---
const initialUserLists = ['Work', 'Planning', 'Dev', 'Personal'];
export const userDefinedListsAtom = atomWithStorage<string[]>('userDefinedLists', initialUserLists, undefined, { getOnInit: true });

// --- UI State Atoms ---
export const selectedTaskIdAtom = atom<string | null>(null);
export const isSettingsOpenAtom = atom<boolean>(false);
export const settingsSelectedTabAtom = atom<SettingsTab>('account');
export const isAddListModalOpenAtom = atom<boolean>(false);
export const currentFilterAtom = atom<TaskFilter>('all');
export const searchTermAtom = atom<string>(''); // Atom for the search term

// --- Derived Atoms ---

export const selectedTaskAtom = atom<Task | null>((get) => {
    const tasks = get(tasksAtom);
    const selectedId = get(selectedTaskIdAtom);
    return tasks.find(task => task.id === selectedId) ?? null;
});

// Memoized list names
export const userListNamesAtom = atom<string[]>((get) => {
    const tasks = get(tasksAtom);
    const userDefinedLists = get(userDefinedListsAtom);
    const listsFromTasks = new Set<string>(['Inbox']); // Always include Inbox
    tasks.forEach(task => { if (task.list && task.list !== 'Trash' && task.list !== 'Archive') listsFromTasks.add(task.list) });
    const combinedLists = new Set(['Inbox', ...userDefinedLists, ...Array.from(listsFromTasks)]);
    return Array.from(combinedLists).sort((a, b) => {
        if (a === 'Inbox') return -1; if (b === 'Inbox') return 1; return a.localeCompare(b);
    });
});

// Memoized tag names
export const userTagNamesAtom = atom<string[]>((get) => {
    const tasks = get(tasksAtom);
    const tags = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => { task.tags?.forEach(tag => tags.add(tag)) });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
});

// Filtered Tasks (applies ONLY the sidebar/route filter)
export const filteredTasksAtom = atom<Task[]>((get) => {
    const tasks = get(tasksAtom);
    const filter = get(currentFilterAtom);
    const activeTasks = tasks.filter(task => task.list !== 'Trash');
    const trashedTasks = tasks.filter(task => task.list === 'Trash');
    let filtered: Task[];

    switch (filter) {
        case 'all': filtered = activeTasks.filter(task => !task.completed); break;
        case 'today': filtered = activeTasks.filter(task => !task.completed && task.dueDate != null && isToday(task.dueDate)); break;
        case 'next7days': filtered = activeTasks.filter(task => !task.completed && task.dueDate != null && isWithinNext7Days(task.dueDate)); break;
        case 'completed': filtered = activeTasks.filter(task => task.completed).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); break;
        case 'trash': filtered = trashedTasks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); break;
        default:
            if (filter.startsWith('list-')) {
                const listName = filter.substring(5);
                filtered = activeTasks.filter(task => !task.completed && task.list === listName);
            } else if (filter.startsWith('tag-')) {
                const tagName = filter.substring(4);
                filtered = activeTasks.filter(task => !task.completed && task.tags?.includes(tagName));
            } else {
                console.warn(`Unrecognized filter: ${filter}. Falling back to 'all'.`);
                filtered = activeTasks.filter(task => !task.completed);
            }
            break;
    }
    // Sort by order, except for completed/trash
    if (filter !== 'completed' && filter !== 'trash') {
        return filtered.sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));
    }
    return filtered;
});

// Search Filtered Tasks (applies search ON TOP of the current filter)
export const searchFilteredTasksAtom = atom<Task[]>((get) => {
    const tasks = get(filteredTasksAtom); // Start with already filtered tasks
    const search = get(searchTermAtom).trim().toLowerCase();

    if (!search) {
        return tasks; // No search term, return filtered tasks
    }

    // Apply search filtering
    return tasks.filter(task =>
        task.title.toLowerCase().includes(search) ||
        (task.content && task.content.toLowerCase().includes(search)) ||
        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(search)))
    );
    // Sorting is already applied by filteredTasksAtom
});


// Task Counts Atom (Memoized)
export const taskCountsAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const allUserListNames = get(userListNamesAtom);
    const allUserTagNames = get(userTagNamesAtom);
    const activeTasks = tasks.filter(task => task.list !== 'Trash');

    const counts = {
        all: 0, today: 0, next7days: 0,
        completed: activeTasks.filter(t => t.completed).length,
        trash: tasks.filter(t => t.list === 'Trash').length,
        lists: {} as Record<string, number>, tags: {} as Record<string, number>,
    };

    allUserListNames.forEach(listName => { counts.lists[listName] = 0; });
    allUserTagNames.forEach(tagName => { counts.tags[tagName] = 0; });

    activeTasks.filter(t => !t.completed).forEach(task => {
        counts.all++;
        if (task.dueDate != null) {
            const dueDateObj = safeParseDate(task.dueDate);
            if (dueDateObj && isValid(dueDateObj)) {
                if (isToday(dueDateObj)) counts.today++;
                if (isWithinNext7Days(dueDateObj)) counts.next7days++;
            }
        }
        if (task.list && Object.prototype.hasOwnProperty.call(counts.lists, task.list)) { counts.lists[task.list]++; }
        task.tags?.forEach(tag => { if (Object.prototype.hasOwnProperty.call(counts.tags, tag)) { counts.tags[tag]++; } });
    });
    return counts;
});

// Grouped Tasks for 'All' view (Memoized)
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => {
    // Use the search-filtered tasks if a search is active, otherwise use all active non-completed
    const search = get(searchTermAtom).trim().toLowerCase();
    const baseTasks = search
        ? get(searchFilteredTasksAtom) // Use search results if searching
        : get(tasksAtom).filter(task => task.list !== 'Trash' && !task.completed);

    // Sort the base list first
    const sortedTasks = baseTasks.sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));

    const groups: Record<TaskGroupCategory, Task[]> = { overdue: [], today: [], next7days: [], later: [], nodate: [] };

    sortedTasks.forEach(task => {
        const category = task.groupCategory ?? getTaskGroupCategory(task);
        if (groups[category]) {
            groups[category].push(task);
        } else {
            groups.nodate.push(task); // Fallback
        }
    });

    return groups;
});