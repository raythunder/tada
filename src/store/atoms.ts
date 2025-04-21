// src/store/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import { User, Task, TaskFilter, TaskGroupCategory, SettingsTab } from '@/types';
import {
    isToday, isWithinNext7Days, isOverdue, startOfDay, safeParseDate,
    isValid, addDays, isBefore, isSameDay, endOfDay, isAfter
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
// Moved outside atom definition for clarity and potential reuse
export const getTaskGroupCategory = (task: Omit<Task, 'groupCategory'> | Task): TaskGroupCategory => {
    // Grouping logic primarily applies to non-completed, non-trashed tasks.
    if (task.completed || task.list === 'Trash') {
        return 'nodate'; // Assign a default category; they won't show in main groups anyway
    }
    if (task.dueDate != null) {
        const dueDateObj = safeParseDate(task.dueDate);
        if (!dueDateObj || !isValid(dueDateObj)) return 'nodate'; // Invalid date is treated as no date

        const today = startOfDay(new Date());
        const taskDay = startOfDay(dueDateObj);

        if (isBefore(taskDay, today)) return 'overdue';
        if (isSameDay(taskDay, today)) return 'today';

        const sevenDaysFromTodayEnd = endOfDay(addDays(today, 6)); // End of the 7th day from today
        if (!isBefore(taskDay, addDays(today, 1)) && !isAfter(taskDay, sevenDaysFromTodayEnd)) {
            return 'next7days';
        }

        return 'later'; // If none of the above, it's later
    }
    // No due date
    return 'nodate';
};

// Sample Data (Adjusted slightly for clarity)
const initialTasksData: Omit<Task, 'groupCategory' | 'completedAt'>[] = [
    // Overdue
    { id: '11', title: '体检预约', completed: false, dueDate: startOfDay(new Date(Date.now() - 86400000 * 2)).getTime(), list: 'Personal', content: 'Call the clinic.', order: 7, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 3, priority: 1 },
    // Today
    { id: '1', title: '施工组织设计评审表', completed: false, dueDate: startOfDay(new Date()).getTime(), list: 'Work', content: 'Review the construction plan details.', order: 0, createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 3600000, priority: 1, tags: ['review', 'urgent'] },
    { id: '8', title: '准备明天会议材料', completed: false, dueDate: startOfDay(new Date()).getTime(), list: 'Work', content: 'Finalize slides.', order: 1, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 100000, priority: 1 },
    // Next 7 Days
    { id: '2', title: '开发框架讲解', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000 * 1)).getTime(), list: 'Work', content: 'Prepare slides for the team meeting.', order: 2, createdAt: Date.now() - 86400000, updatedAt: Date.now(), priority: 2 },
    { id: '3', title: 'RESTful讲解', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000 * 3)).getTime(), list: 'Work', content: '', order: 3, createdAt: Date.now() - 86400000, updatedAt: Date.now(), tags: ['presentation'] },
    // Later
    { id: '9', title: '下周项目规划', completed: false, dueDate: startOfDay(new Date(Date.now() + 86400000 * 10)).getTime(), list: 'Planning', content: 'Define milestones for Q4.', order: 6, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 50000 },
    // No Date
    { id: '4', title: '欢迎加入Tada', completed: false, dueDate: null, list: 'Inbox', content: 'Explore features:\n- **Tasks**\n- Calendar\n- Summary', order: 4, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 * 5 },
    { id: '10', title: '研究 CodeMirror Themes', completed: false, dueDate: null, list: 'Dev', content: 'Find a good light/dark theme.', order: 5, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 1 },
    // Completed
    { id: '5', title: '我能用Tada做什么?', completed: true, dueDate: null, list: 'Inbox', content: 'Organize life, track projects, collaborate.', order: 8, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 3 },
    { id: '7', title: 'Swagger2讲解 (Completed)', completed: true, dueDate: new Date(2024, 6, 14).getTime(), list: 'Work', content: 'Focus on API documentation standards.', order: 10, createdAt: new Date(2024, 6, 14).getTime(), updatedAt: new Date(2024, 6, 14).getTime() },
    // Trash
    { id: '6', title: '研究一下patch (Trashed)', completed: false, dueDate: new Date(2024, 6, 13).getTime(), list: 'Trash', content: '', order: 9, createdAt: new Date(2024, 6, 13).getTime(), updatedAt: new Date(2024, 6, 15).getTime() },
];

// Initialize tasks with calculated groupCategory and ensure sorted order
const initialTasks: Task[] = initialTasksData
    .map(task => ({
        ...task,
        groupCategory: getTaskGroupCategory(task), // Calculate initial category
        completedAt: task.completed ? task.updatedAt : null, // Add completedAt based on initial state
    }))
    // Ensure final initial array is sorted by order, then creation date as fallback
    .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));


// Atom for storing the raw task list with persistence
const baseTasksAtom = atomWithStorage<Task[]>('tasks_v3', initialTasks, undefined, { getOnInit: true });

// Main tasks atom with refined setter logic
export const tasksAtom = atom(
    (get) => get(baseTasksAtom), // Read: return the stored tasks
    (get, set, update: Task[] | ((prev: Task[]) => Task[]) | typeof RESET) => {
        if (update === RESET) {
            set(baseTasksAtom, initialTasks); // Reset to initial state
            return;
        }

        const previousTasks = get(baseTasksAtom); // Get previous state for comparison if needed
        const nextTasksRaw = typeof update === 'function' ? update(previousTasks) : update;

        // --- Refined Update Logic ---
        // This setter primarily applies the changes from `nextTasksRaw`.
        // It avoids re-sorting the entire list unless the update function itself handles sorting (like arrayMove).
        // It ensures categories and completedAt are consistent for the potentially updated tasks.
        const nextTasksProcessed = nextTasksRaw.map(task => {
            const originalTask = previousTasks.find(pt => pt.id === task.id);
            // Determine if category needs update based on changes relevant to grouping
            const needsCategoryUpdate = !task.groupCategory || !originalTask ||
                originalTask.dueDate !== task.dueDate ||
                originalTask.completed !== task.completed ||
                originalTask.list !== task.list;

            return {
                ...task,
                // Recalculate category *only if necessary* for this task
                groupCategory: needsCategoryUpdate ? getTaskGroupCategory(task) : task.groupCategory,
                // Ensure completedAt is consistent
                completedAt: task.completed ? (task.completedAt ?? task.updatedAt) : null,
            };
        });

        // Write the processed list back to storage.
        // Sorting should be handled specifically by operations like drag-and-drop or adding tasks.
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
export const currentFilterAtom = atom<TaskFilter>('all');
export const searchTermAtom = atom<string>('');

// --- Derived Atoms (Optimized) ---

// Selected Task Atom (Optimized with selectAtom)
export const selectedTaskAtom = selectAtom(
    atom(get => ({ tasks: get(tasksAtom), selectedId: get(selectedTaskIdAtom) })),
    ({ tasks, selectedId }) => {
        if (!selectedId) return null;
        return tasks.find(task => task.id === selectedId) ?? null;
    },
    (a, b) => a === b // Shallow equality check (reference)
);


// User List Names Atom (Optimized with selectAtom)
export const userListNamesAtom = selectAtom(
    atom(get => ({ tasks: get(tasksAtom), userLists: get(userDefinedListsAtom) })),
    (data) => {
        const listsFromTasks = new Set<string>();
        data.tasks.forEach(task => { if (task.list && task.list !== 'Trash') listsFromTasks.add(task.list) });
        const combinedLists = new Set(['Inbox', ...data.userLists, ...Array.from(listsFromTasks)]);
        return Array.from(combinedLists).sort((a, b) => {
            if (a === 'Inbox') return -1; if (b === 'Inbox') return 1;
            return a.localeCompare(b);
        });
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep check for array
);


// User Tag Names Atom (Optimized with selectAtom)
export const userTagNamesAtom = selectAtom(
    tasksAtom,
    (tasks) => {
        const tags = new Set<string>();
        tasks.filter(t => t.list !== 'Trash').forEach(task => { task.tags?.forEach(tag => tags.add(tag)) });
        return Array.from(tags).sort((a, b) => a.localeCompare(b));
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep check for array
);


// Filtered Tasks Atom (Basis for display, pre-search)
export const filteredTasksAtom = atom<Task[]>((get) => {
    const tasks = get(tasksAtom);
    const filter = get(currentFilterAtom);
    let filtered: Task[];

    const activeTasks = tasks.filter(task => task.list !== 'Trash');
    const trashedTasks = tasks.filter(task => task.list === 'Trash');

    switch (filter) {
        case 'all':
            // Filter out completed, order is inherited from tasksAtom
            filtered = activeTasks.filter(task => !task.completed);
            break;
        case 'today':
            filtered = activeTasks.filter(task => !task.completed && task.dueDate != null && isToday(task.dueDate));
            break;
        case 'next7days':
            filtered = activeTasks.filter(task => {
                if (task.completed || task.dueDate == null) return false;
                const date = safeParseDate(task.dueDate);
                return date && isValid(date) && !isOverdue(date) && isWithinNext7Days(date);
            });
            break;
        case 'completed':
            // Sort completed tasks by completion time (desc)
            filtered = activeTasks.filter(task => task.completed).sort((a, b) => (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0));
            break;
        case 'trash':
            // Sort trash by update time (desc)
            filtered = trashedTasks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            break;
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
    // The order for non-completed/trash views is inherited from tasksAtom (sorted by 'order')
    return filtered;
});


// Search Filtered Tasks Atom (Applies search on top of filteredTasksAtom)
export const searchFilteredTasksAtom = atom<Task[]>((get) => {
    const baseFilteredTasks = get(filteredTasksAtom);
    const search = get(searchTermAtom).trim().toLowerCase();

    if (!search) return baseFilteredTasks;

    const searchWords = search.split(' ').filter(Boolean);

    return baseFilteredTasks.filter(task =>
        searchWords.every(word =>
            task.title.toLowerCase().includes(word) ||
            (task.content && task.content.toLowerCase().includes(word)) ||
            (task.tags && task.tags.some(tag => tag.toLowerCase().includes(word)))
        )
    );
    // Sorting order is inherited from filteredTasksAtom
});


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
            completed: activeTasks.filter(t => t.completed).length,
            trash: tasks.length - activeTasks.length,
            lists: Object.fromEntries(allUserListNames.map(name => [name, 0])),
            tags: Object.fromEntries(allUserTagNames.map(name => [name, 0])),
        };
        activeTasks.filter(t => !t.completed).forEach(task => {
            counts.all++;
            if (task.dueDate != null) {
                const date = safeParseDate(task.dueDate);
                if (date && isValid(date)) {
                    if (isToday(date)) counts.today++;
                    if (!isOverdue(date) && isWithinNext7Days(date)) counts.next7days++;
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
        });
        return counts;
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep check for counts object
);


// Grouped Tasks for 'All' view Atom (Optimized)
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => {
    const tasksToGroup = get(tasksAtom).filter(task => task.list !== 'Trash' && !task.completed);
    const groups: Record<TaskGroupCategory, Task[]> = { overdue: [], today: [], next7days: [], later: [], nodate: [] };

    // Group tasks using the category already present on the task object
    tasksToGroup.forEach(task => {
        const category = task.groupCategory; // Category is maintained by tasksAtom setter/updates
        if (groups[category]) {
            groups[category].push(task);
        } else {
            console.warn(`Task ${task.id} in groupedAllTasksAtom has unexpected category: ${category}. Placing in 'nodate'.`);
            groups.nodate.push(task);
        }
    });
    // Order is inherited from tasksAtom (sorted by 'order')
    return groups;
});