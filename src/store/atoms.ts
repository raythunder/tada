// src/store/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import { User, Task, TaskFilter, TaskGroupCategory, SettingsTab } from '@/types';
import {
    isToday as isTodayCheck, // Renamed local import
    isWithinNext7Days, isOverdue as isOverdueCheck, // Renamed local import
    startOfDay, safeParseDate,
    isValid, addDays, isBefore, isSameDay, endOfDay, isAfter, subDays
} from '@/utils/dateUtils';
import { selectAtom } from 'jotai/utils';

// --- Base Atoms ---
export const currentUserAtom = atom<User | null>({
    id: '1',
    name: 'Liu Yunpeng',
    email: 'yp.leao@gmail.com',
    avatar: '/vite.svg',
    isPremium: true,
});

// Helper function to determine task group category
export const getTaskGroupCategory = (task: Omit<Task, 'groupCategory'> | Task): TaskGroupCategory => {
    if (task.completed || task.list === 'Trash') {
        return 'nodate'; // They don't appear in grouped view, assign default
    }
    if (task.dueDate != null) {
        const dueDateObj = safeParseDate(task.dueDate);
        if (!dueDateObj || !isValid(dueDateObj)) return 'nodate';

        const today = startOfDay(new Date());
        const taskDay = startOfDay(dueDateObj);

        if (isBefore(taskDay, today)) return 'overdue';
        if (isSameDay(taskDay, today)) return 'today';

        const sevenDaysFromTodayEnd = endOfDay(addDays(today, 6));
        if (!isBefore(taskDay, addDays(today, 1)) && !isAfter(taskDay, sevenDaysFromTodayEnd)) {
            return 'next7days';
        }

        return 'later';
    }
    return 'nodate';
};

// Sample Data (Use Date objects for clarity, convert to timestamp in initialization)
const initialTasksDataRaw = [
    // Overdue
    { id: '11', title: '体检预约', completed: false, dueDate: subDays(startOfDay(new Date()), 2), list: 'Personal', content: 'Call the clinic.', order: 7, createdAt: subDays(new Date(), 4).getTime(), updatedAt: subDays(new Date(), 4).getTime(), priority: 1 },
    // Today
    { id: '1', title: '施工组织设计评审表', completed: false, dueDate: startOfDay(new Date()), list: 'Work', content: 'Review the construction plan details.', order: 0, createdAt: subDays(new Date(), 3).getTime(), updatedAt: subDays(new Date(), 3).getTime(), priority: 1, tags: ['review', 'urgent'] },
    { id: '8', title: '准备明天会议材料', completed: false, dueDate: startOfDay(new Date()), list: 'Work', content: 'Finalize slides.', order: 1, createdAt: subDays(new Date(), 1).getTime(), updatedAt: subDays(new Date(), 1).getTime(), priority: 1 },
    // Next 7 Days
    { id: '2', title: '开发框架讲解', completed: false, dueDate: addDays(startOfDay(new Date()), 1), list: 'Work', content: 'Prepare slides for the team meeting.', order: 2, createdAt: subDays(new Date(), 1).getTime(), updatedAt: subDays(new Date(), 1).getTime(), priority: 2 },
    { id: '3', title: 'RESTful讲解', completed: false, dueDate: addDays(startOfDay(new Date()), 3), list: 'Work', content: '', order: 3, createdAt: subDays(new Date(), 1).getTime(), updatedAt: subDays(new Date(), 1).getTime(), tags: ['presentation'] },
    // Later
    { id: '9', title: '下周项目规划', completed: false, dueDate: addDays(startOfDay(new Date()), 10), list: 'Planning', content: 'Define milestones for Q4.', order: 6, createdAt: subDays(new Date(), 1).getTime(), updatedAt: subDays(new Date(), 1).getTime() },
    // No Date
    { id: '4', title: '欢迎加入Tada', completed: false, dueDate: null, list: 'Inbox', content: 'Explore features:\n- **Tasks**\n- Calendar\n- Summary', order: 4, createdAt: subDays(new Date(), 5).getTime(), updatedAt: subDays(new Date(), 5).getTime() },
    { id: '10', title: '研究 CodeMirror Themes', completed: false, dueDate: null, list: 'Dev', content: 'Find a good light/dark theme.', order: 5, createdAt: subDays(new Date(), 2).getTime(), updatedAt: subDays(new Date(), 2).getTime() },
    // Completed (Completed Today)
    { id: '5', title: '我能用Tada做什么?', completed: true, dueDate: null, list: 'Inbox', content: 'Organize life, track projects, collaborate.', order: 8, createdAt: subDays(new Date(), 4).getTime(), completedAt: new Date().getTime(), updatedAt: subDays(new Date(), 4).getTime() },
    // Completed (Completed Past)
    { id: '7', title: 'Swagger2讲解 (Completed)', completed: true, dueDate: new Date(2024, 5, 14).getTime(), list: 'Work', content: 'Focus on API documentation standards.', order: 10, createdAt: new Date(2024, 5, 10).getTime(), updatedAt: new Date(2024, 5, 10).getTime(), completedAt: new Date(2024, 5, 14, 15, 0, 0).getTime() },
    // Trash
    { id: '6', title: '研究一下patch (Trashed)', completed: false, dueDate: new Date(2024, 5, 13).getTime(), list: 'Trash', content: '', order: 9, createdAt: new Date(2024, 5, 10).getTime(), updatedAt: new Date(2024, 5, 10).getTime() },
];


// Initialize tasks with calculated groupCategory, completedAt, and converted timestamps
const initialTasks: Task[] = initialTasksDataRaw
    .map(taskRaw => {
        const now = Date.now();
        const dueDateTimestamp = taskRaw.dueDate instanceof Date && isValid(taskRaw.dueDate) ? taskRaw.dueDate.getTime() : (taskRaw.dueDate === null ? null : undefined);
        if (dueDateTimestamp === undefined && taskRaw.dueDate !== null) {
            console.warn(`Invalid dueDate encountered for task "${taskRaw.title}". Setting to null.`);
        }

        const taskPartial = {
            ...taskRaw,
            dueDate: dueDateTimestamp === undefined ? null : dueDateTimestamp,
            completedAt: taskRaw.completed ? (taskRaw.completedAt ?? now) : null, // Ensure completedAt is set if completed
            updatedAt: taskRaw.updatedAt ?? now, // Ensure updatedAt exists
        };
        return {
            ...taskPartial,
            groupCategory: getTaskGroupCategory(taskPartial), // Calculate initial category
        };
    })
    // Ensure final initial array is sorted by order, then creation date as fallback
    .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));


// Atom for storing the raw task list with persistence
const baseTasksAtom = atomWithStorage<Task[]>('tasks_v4_recalc', initialTasks, undefined, { getOnInit: true });

// Main tasks atom with refined setter logic
export const tasksAtom = atom(
    (get) => get(baseTasksAtom),
    (get, set, update: Task[] | ((prev: Task[]) => Task[]) | typeof RESET) => {
        if (update === RESET) {
            set(baseTasksAtom, initialTasks);
            return;
        }

        const previousTasks = get(baseTasksAtom);
        const nextTasksRaw = typeof update === 'function' ? update(previousTasks) : update;

        // --- Always recalculate category and completedAt on write ---
        // This ensures consistency whenever tasks are updated (add, edit, dnd, complete)
        const nextTasksProcessed = nextTasksRaw.map(task => {
            // Always recalculate category on write
            const newCategory = getTaskGroupCategory(task);
            // Ensure completedAt is consistent
            const newCompletedAt = task.completed ? (task.completedAt ?? task.updatedAt) : null;

            // Return a new object only if category or completedAt actually changed
            if (newCategory !== task.groupCategory || newCompletedAt !== task.completedAt) {
                return {
                    ...task,
                    groupCategory: newCategory,
                    completedAt: newCompletedAt,
                };
            }
            return task; // Return original object if no change in derived fields
        });

        // Write the processed list back to storage.
        // Preserve order from the update, don't re-sort here.
        set(baseTasksAtom, nextTasksProcessed);
    }
);

// --- User Lists ---
const initialUserLists = ['Work', 'Planning', 'Dev', 'Personal'];
export const userDefinedListsAtom = atomWithStorage<string[]>('userDefinedLists_v1', initialUserLists, undefined, { getOnInit: true });

// --- UI State Atoms ---
export const selectedTaskIdAtom = atom<string | null>(null);
export const isSettingsOpenAtom = atom<boolean>(false);
export const settingsSelectedTabAtom = atom<SettingsTab>('account');
export const isAddListModalOpenAtom = atom<boolean>(false);
export const currentFilterAtom = atom<TaskFilter>('all'); // Represents the active filter selected in the Sidebar
export const searchTermAtom = atom<string>('');

// --- Derived Atoms (Optimized) ---

// Selected Task Atom
export const selectedTaskAtom = selectAtom(
    atom(get => ({ tasks: get(tasksAtom), selectedId: get(selectedTaskIdAtom) })),
    ({ tasks, selectedId }) => selectedId ? tasks.find(task => task.id === selectedId) ?? null : null,
    (a, b) => a === b // Reference equality check
);

// User List Names Atom
export const userListNamesAtom = selectAtom(
    atom(get => ({ tasks: get(tasksAtom), userLists: get(userDefinedListsAtom) })),
    ({ tasks, userLists }) => {
        const listsFromTasks = new Set<string>();
        tasks.forEach(task => { if (task.list && task.list !== 'Trash') listsFromTasks.add(task.list) });
        const combinedLists = new Set(['Inbox', ...userLists, ...Array.from(listsFromTasks)]);
        return Array.from(combinedLists).sort((a, b) => {
            if (a === 'Inbox') return -1; if (b === 'Inbox') return 1;
            return a.localeCompare(b);
        });
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep check for array change
);

// User Tag Names Atom
export const userTagNamesAtom = selectAtom(
    tasksAtom,
    (tasks) => {
        const tags = new Set<string>();
        tasks.filter(t => t.list !== 'Trash').forEach(task => { task.tags?.forEach(tag => tags.add(tag)) });
        return Array.from(tags).sort((a, b) => a.localeCompare(b));
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep check for array change
);


// Task Counts Atom (Optimized with selectAtom)
export const taskCountsAtom = selectAtom(
    atom(get => ({
        tasks: get(tasksAtom),
        allUserListNames: get(userListNamesAtom),
        allUserTagNames: get(userTagNamesAtom)
    })),
    ({ tasks, allUserListNames, allUserTagNames }) => {
        const activeTasks = tasks.filter(task => task.list !== 'Trash');
        const counts = {
            all: 0, today: 0, next7days: 0,
            completed: 0, // Initialize completed count
            trash: tasks.filter(task => task.list === 'Trash').length, // Count trash items
            lists: Object.fromEntries(allUserListNames.map(name => [name, 0])),
            tags: Object.fromEntries(allUserTagNames.map(name => [name, 0])),
        };

        activeTasks.forEach(task => {
            if (task.completed) {
                counts.completed++;
            } else {
                // Count only non-completed tasks for other categories
                counts.all++;
                if (task.dueDate != null) {
                    const date = safeParseDate(task.dueDate);
                    if (date && isValid(date)) {
                        // Use the imported checks correctly
                        if (isTodayCheck(date)) counts.today++;
                        if (!isOverdueCheck(date) && isWithinNext7Days(date)) counts.next7days++;
                    }
                }
                if (task.list && Object.prototype.hasOwnProperty.call(counts.lists, task.list)) {
                    counts.lists[task.list]++;
                }
                task.tags?.forEach(tag => {
                    if (Object.prototype.hasOwnProperty.call(counts.tags, tag)) {
                        counts.tags[tag]++;
                    }
                });
            }
        });
        return counts;
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep check for counts object
);


// Grouped Tasks for 'All' view Atom (Only non-completed, non-trash tasks)
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => {
    // Filter tasks *before* grouping
    const tasksToGroup = get(tasksAtom)
        .filter(task => task.list !== 'Trash' && !task.completed)
        .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt)); // Ensure sorted by order

    const groups: Record<TaskGroupCategory, Task[]> = { overdue: [], today: [], next7days: [], later: [], nodate: [] };

    tasksToGroup.forEach(task => {
        const category = task.groupCategory; // Use pre-calculated category
        if (groups[category]) {
            groups[category].push(task);
        } else {
            // This case should ideally not happen if groupCategory is always valid
            console.warn(`Task ${task.id} in groupedAllTasksAtom has unexpected category: ${category}. Placing in 'nodate'.`);
            groups.nodate.push(task);
        }
    });
    return groups;
});

export const rawSearchResultsAtom = atom<Task[]>((get) => {
    const search = get(searchTermAtom).trim().toLowerCase();
    if (!search) return []; // Return empty array if no search term

    const tasks = get(tasksAtom); // Get ALL tasks (including completed and trash)
    const searchWords = search.split(' ').filter(Boolean);

    return tasks.filter(task => // Filter ALL tasks
        searchWords.every(word =>
            task.title.toLowerCase().includes(word) ||
            (task.content && task.content.toLowerCase().includes(word)) ||
            (task.tags && task.tags.some(tag => tag.toLowerCase().includes(word)))
        )
    ).sort((a, b) => { // Sort results: non-completed/non-trash first, then order, then creation date
        const aIsActive = a.list !== 'Trash' && !a.completed;
        const bIsActive = b.list !== 'Trash' && !b.completed;
        if (aIsActive !== bIsActive) return aIsActive ? -1 : 1; // Active items first

        // If both active or both inactive, sort by order then date
        return (a.order ?? 0) - (b.order ?? 0) || (a.createdAt - b.createdAt);
    });
});