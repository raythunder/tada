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
// Removed selectAtom import as it's not used correctly here
// import { selectAtom } from 'jotai/utils';

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
        return 'nodate';
    }
    if (task.dueDate != null) {
        const dueDateObj = safeParseDate(task.dueDate);
        if (!dueDateObj || !isValid(dueDateObj)) return 'nodate';
        const today = startOfDay(new Date());
        const taskDay = startOfDay(dueDateObj);
        if (isBefore(taskDay, today)) return 'overdue';
        if (isSameDay(taskDay, today)) return 'today';
        const tomorrow = startOfDay(addDays(today, 1));
        const sevenDaysFromTodayEnd = endOfDay(addDays(today, 6));
        if (!isBefore(taskDay, tomorrow) && !isAfter(taskDay, sevenDaysFromTodayEnd)) {
            return 'next7days';
        }
        if (isAfter(taskDay, sevenDaysFromTodayEnd)) {
            return 'later';
        }
    }
    return 'nodate';
};

// Sample Data (Using Date objects for clarity, converted below)
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
    { id: '10', title: '研究 CodeMirror Themes', completed: false, dueDate: null, list: 'Dev', content: 'Find a good light/dark theme.', order: 5, createdAt: subDays(new Date(), 2).getTime(), updatedAt: subDays(new Date(), 2).getTime(), priority: 3 },
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
        const taskPartial: Omit<Task, 'groupCategory'> = {
            ...taskRaw,
            dueDate: dueDateTimestamp === undefined ? null : dueDateTimestamp,
            completedAt: taskRaw.completed ? (taskRaw.completedAt ?? taskRaw.updatedAt ?? now) : null,
            updatedAt: taskRaw.updatedAt ?? now,
            tags: taskRaw.tags ?? [],
            priority: taskRaw.priority ?? null,
            content: taskRaw.content ?? '',
        };
        return {
            ...taskPartial,
            groupCategory: getTaskGroupCategory(taskPartial),
        };
    })
    .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));

// Atom for storing the raw task list with persistence
const baseTasksAtom = atomWithStorage<Task[]>('tasks_v5_derived_state', initialTasks, undefined, { getOnInit: true });

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

        let hasChanges = false;
        const nextTasksProcessed = nextTasksRaw.map(task => {
            const validatedTask = {
                ...task,
                content: task.content ?? '',
                tags: task.tags ?? [],
                priority: task.priority ?? null,
                // Ensure completedAt is ONLY set if task is completed
                completedAt: task.completed ? (task.completedAt ?? task.updatedAt) : null,
            };
            const newCategory = getTaskGroupCategory(validatedTask);
            const newCompletedAt = validatedTask.completedAt; // Use the validated value

            if (newCategory !== validatedTask.groupCategory || newCompletedAt !== task.completedAt) { // Compare validated completedAt with original task's
                hasChanges = true;
                return { ...validatedTask, groupCategory: newCategory, completedAt: newCompletedAt };
            }
            // Check if validation itself caused changes
            if (JSON.stringify(task) !== JSON.stringify(validatedTask)) {
                hasChanges = true;
                return validatedTask;
            }
            return task;
        });

        if (hasChanges || JSON.stringify(nextTasksProcessed) !== JSON.stringify(previousTasks)) {
            set(baseTasksAtom, nextTasksProcessed);
        }
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

// --- Derived Atoms ---

// FIX 3: Correct selectedTaskAtom definition
// Selected Task Atom - Standard derived atom pattern
export const selectedTaskAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const selectedId = get(selectedTaskIdAtom);
    if (!selectedId) return null;
    return tasks.find(task => task.id === selectedId) ?? null;
});


// User List Names Atom (using atom(get => ...) for simpler dependency tracking)
export const userListNamesAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const userLists = get(userDefinedListsAtom);
    const listsFromTasks = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => { if (task.list) listsFromTasks.add(task.list) });
    const combinedLists = new Set(['Inbox', ...userLists, ...Array.from(listsFromTasks)]);
    combinedLists.delete('Trash');
    return Array.from(combinedLists).sort((a, b) => {
        if (a === 'Inbox') return -1; if (b === 'Inbox') return 1;
        return a.localeCompare(b);
    });
});


// User Tag Names Atom (using atom(get => ...))
export const userTagNamesAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const tags = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => { task.tags?.forEach(tag => tags.add(tag)) });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
});


// Task Counts Atom (using atom(get => ...))
export const taskCountsAtom = atom((get) => {
    const tasks = get(tasksAtom);
    // Get derived list/tag names inside this atom's read function
    const allUserListNames = get(userListNamesAtom);
    const allUserTagNames = get(userTagNamesAtom);

    const activeTasks = tasks.filter(task => task.list !== 'Trash');
    const counts = {
        all: 0, today: 0, next7days: 0,
        completed: 0,
        trash: tasks.filter(task => task.list === 'Trash').length,
        lists: Object.fromEntries(allUserListNames.map(name => [name, 0])),
        tags: Object.fromEntries(allUserTagNames.map(name => [name, 0])),
    };

    activeTasks.forEach(task => {
        if (task.completed) {
            counts.completed++;
        } else {
            counts.all++;
            if (task.dueDate != null) {
                const date = safeParseDate(task.dueDate);
                if (date && isValid(date)) {
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
});


// Grouped Tasks for 'All' view Atom
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => {
    const tasksToGroup = get(tasksAtom)
        .filter(task => task.list !== 'Trash' && !task.completed)
        .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));
    const groups: Record<TaskGroupCategory, Task[]> = { overdue: [], today: [], next7days: [], later: [], nodate: [] };
    tasksToGroup.forEach(task => {
        const category = task.groupCategory; // Use pre-calculated category
        if (Object.prototype.hasOwnProperty.call(groups, category)) {
            groups[category].push(task);
        } else {
            console.warn(`Task ${task.id} in groupedAllTasksAtom has unexpected category: ${category}. Placing in 'nodate'.`);
            groups.nodate.push(task);
        }
    });
    return groups;
});

// Raw Search Results Atom
export const rawSearchResultsAtom = atom<Task[]>((get) => {
    const search = get(searchTermAtom).trim().toLowerCase();
    if (!search) return [];
    const allTasks = get(tasksAtom);
    const searchWords = search.split(' ').filter(Boolean);
    return allTasks
        .filter(task =>
            searchWords.every(word =>
                task.title.toLowerCase().includes(word) ||
                (task.content && task.content.toLowerCase().includes(word)) ||
                (task.tags && task.tags.some(tag => tag.toLowerCase().includes(word))) ||
                (task.list.toLowerCase().includes(word))
            )
        )
        .sort((a, b) => {
            const aIsActive = a.list !== 'Trash' && !a.completed;
            const bIsActive = b.list !== 'Trash' && !b.completed;
            if (aIsActive !== bIsActive) return aIsActive ? -1 : 1;
            return (a.order ?? 0) - (b.order ?? 0) || (a.createdAt - b.createdAt);
        });
});