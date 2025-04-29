// src/store/atoms.ts
import {atom} from 'jotai';
import {atomWithStorage, createJSONStorage, RESET} from 'jotai/utils';
import {SettingsTab, Task, TaskFilter, TaskGroupCategory, User} from '@/types';
import {
    addDays,
    endOfDay,
    endOfMonth,
    endOfWeek,
    isAfter,
    isBefore,
    isSameDay,
    isToday as isTodayCheck,
    isValid,
    safeParseDate,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subDays,
    subMonths,
    subWeeks
} from '@/lib/utils/dateUtils'; // Ensure path is correct

// --- Base Atoms ---
export const currentUserAtom = atom<User | null>({
    id: '1', name: 'Liu Yunpeng', email: 'yp.leao@gmail.com', avatar: '/vite.svg', isPremium: true,
});

// Helper: Determine Task Group Category (Robust version)
export const getTaskGroupCategory = (task: Omit<Task, 'groupCategory'> | Task): TaskGroupCategory => {
    // Check derived 'completed' status first
    if (task.completed || task.list === 'Trash') {
        return 'nodate'; // Completed or trashed tasks have no date category here
    }

    if (task.dueDate != null) {
        const dueDateObj = safeParseDate(task.dueDate);
        if (dueDateObj && isValid(dueDateObj)) { // Ensure date is valid
            const todayStart = startOfDay(new Date());
            const taskDayStart = startOfDay(dueDateObj);

            if (isBefore(taskDayStart, todayStart)) return 'overdue';
            if (isSameDay(taskDayStart, todayStart)) return 'today';

            // Check for next 7 days (Today+1 to Today+7)
            const tomorrowStart = startOfDay(addDays(todayStart, 1));
            const sevenDaysFromTodayEnd = endOfDay(addDays(todayStart, 6)); // End of the 7th day FROM today
            if (!isBefore(taskDayStart, tomorrowStart) && !isAfter(taskDayStart, sevenDaysFromTodayEnd)) {
                return 'next7days';
            }

            // If it's after the 7-day window
            if (isAfter(taskDayStart, sevenDaysFromTodayEnd)) {
                return 'later';
            }
        }
    }
    // If no valid due date or date doesn't fall into other categories
    return 'nodate';
};

// --- Initial Task Data (Refined Sample Data) ---
// Using timestamps directly is generally more reliable than Date objects in initial data
const nowTs = Date.now();
const todayStartTs = startOfDay(new Date()).getTime();
const initialTasksDataRaw = [
    // Overdue
    {
        id: 'ovd1',
        title: 'Pay electricity bill',
        completionPercentage: 0,
        dueDate: subDays(todayStartTs, 3).getTime(),
        list: 'Personal',
        order: 1,
        createdAt: subDays(nowTs, 5).getTime(),
        updatedAt: subDays(nowTs, 1).getTime(),
        priority: 1,
        tags: ['bills']
    },
    {
        id: 'ovd2',
        title: 'Submit expense report',
        completionPercentage: 50,
        dueDate: subDays(todayStartTs, 1).getTime(),
        list: 'Work',
        order: 2,
        createdAt: subDays(nowTs, 4).getTime(),
        updatedAt: subDays(nowTs, 1).getTime(),
        priority: 2
    },
    // Today
    {
        id: 'tdy1',
        title: 'Team Standup Meeting',
        completionPercentage: 0,
        dueDate: todayStartTs,
        list: 'Work',
        order: 3,
        createdAt: subDays(nowTs, 1).getTime(),
        updatedAt: subDays(nowTs, 1).getTime(),
        priority: 1,
        content: "Discuss project blockers."
    },
    {
        id: 'tdy2',
        title: 'Review PR #123',
        completionPercentage: 20,
        dueDate: todayStartTs,
        list: 'Dev',
        order: 4,
        createdAt: nowTs,
        updatedAt: nowTs,
        tags: ['code-review', 'urgent']
    },
    // Next 7 Days
    {
        id: 'nxt1',
        title: 'Prepare presentation slides',
        completionPercentage: 0,
        dueDate: addDays(todayStartTs, 2).getTime(),
        list: 'Work',
        order: 5,
        createdAt: subDays(nowTs, 1).getTime(),
        updatedAt: subDays(nowTs, 1).getTime(),
        priority: 2
    },
    {
        id: 'nxt2',
        title: 'Grocery shopping',
        completionPercentage: 0,
        dueDate: addDays(todayStartTs, 5).getTime(),
        list: 'Personal',
        order: 6,
        createdAt: subDays(nowTs, 2).getTime(),
        updatedAt: subDays(nowTs, 2).getTime()
    },
    // Later
    {
        id: 'ltr1',
        title: 'Plan Q4 strategy',
        completionPercentage: 0,
        dueDate: addDays(todayStartTs, 15).getTime(),
        list: 'Planning',
        order: 7,
        createdAt: subDays(nowTs, 5).getTime(),
        updatedAt: subDays(nowTs, 5).getTime()
    },
    // No Date
    {
        id: 'nd1',
        title: 'Read new tech article',
        completionPercentage: 0,
        dueDate: null,
        list: 'Inbox',
        order: 8,
        createdAt: subDays(nowTs, 2).getTime(),
        updatedAt: subDays(nowTs, 2).getTime(),
        priority: 3
    },
    {
        id: 'nd2',
        title: 'Organize downloads folder',
        completionPercentage: 0,
        dueDate: null,
        list: 'Personal',
        order: 9,
        createdAt: subDays(nowTs, 10).getTime(),
        updatedAt: subDays(nowTs, 10).getTime()
    },
    // Completed
    {
        id: 'cmp1',
        title: 'Fix login bug',
        completionPercentage: 100,
        dueDate: subDays(todayStartTs, 4).getTime(),
        list: 'Dev',
        order: 10,
        createdAt: subDays(nowTs, 6).getTime(),
        updatedAt: subDays(nowTs, 2).getTime(),
        completedAt: subDays(nowTs, 2).getTime()
    },
    {
        id: 'cmp2',
        title: 'Send weekly update email',
        completionPercentage: 100,
        dueDate: subDays(todayStartTs, 1).getTime(),
        list: 'Work',
        order: 11,
        createdAt: subDays(nowTs, 3).getTime(),
        updatedAt: subDays(nowTs, 1).getTime(),
        completedAt: subDays(nowTs, 1).getTime()
    },
    {
        id: 'cmp3',
        title: 'Welcome to Tada!',
        completionPercentage: 100,
        dueDate: null,
        list: 'Inbox',
        order: 0,
        createdAt: subDays(nowTs, 7).getTime(),
        updatedAt: subDays(nowTs, 6).getTime(),
        completedAt: subDays(nowTs, 6).getTime()
    },
    // Trashed
    {
        id: 'trs1',
        title: 'Old draft idea',
        completionPercentage: null,
        dueDate: null,
        list: 'Trash',
        order: 12,
        createdAt: subDays(nowTs, 20).getTime(),
        updatedAt: subDays(nowTs, 15).getTime()
    },
];


// Initialize tasks with calculated groupCategory and derived completed status
const initialTasks: Task[] = initialTasksDataRaw
    .map(taskRaw => {
        const now = Date.now();
        const percentage = taskRaw.completionPercentage ?? 0;
        const isCompletedDeriv = percentage === 100 && taskRaw.list !== 'Trash'; // Completed only if 100% and not in Trash

        const taskPartial: Omit<Task, 'groupCategory'> = {
            id: taskRaw.id,
            title: taskRaw.title,
            completionPercentage: taskRaw.completionPercentage, // Keep original null/number
            dueDate: taskRaw.dueDate ?? null,
            list: taskRaw.list,
            content: taskRaw.content ?? '',
            order: taskRaw.order,
            createdAt: taskRaw.createdAt,
            updatedAt: taskRaw.updatedAt ?? taskRaw.createdAt,
            tags: taskRaw.tags ?? [],
            priority: taskRaw.priority ?? null,
            // Derived fields:
            completed: isCompletedDeriv,
            completedAt: isCompletedDeriv ? (taskRaw.completedAt ?? taskRaw.updatedAt ?? taskRaw.createdAt ?? now) : null,
        };
        return {
            ...taskPartial,
            groupCategory: getTaskGroupCategory(taskPartial),
        };
    })
    .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));


// --- Task Atoms ---
const TASK_STORAGE_KEY = 'tada_tasks_v7_shadcn';
const taskStorage = createJSONStorage<Task[]>(() => localStorage);
const baseTasksAtom = atomWithStorage<Task[]>(TASK_STORAGE_KEY, initialTasks, taskStorage, {getOnInit: true});

// Main tasks atom with setter logic to keep fields consistent
export const tasksAtom = atom(
    (get) => get(baseTasksAtom),
    (get, set, update: Task[] | ((prev: Task[]) => Task[]) | typeof RESET) => {
        if (update === RESET) {
            set(baseTasksAtom, initialTasks); // Reset to initial state
            return;
        }

        const previousTasks = get(baseTasksAtom);
        const nextTasksRaw = typeof update === 'function' ? update(previousTasks) : update;
        const now = Date.now();

        // Process tasks to ensure consistency between completionPercentage, completed, and completedAt
        const nextTasksProcessed = nextTasksRaw.map(task => {
            const prevTask = previousTasks.find(p => p.id === task.id);
            let {completionPercentage, completed, completedAt, list, ...rest} = task; // Destructure

            // --- Logic to sync completion state ---
            let derivedCompleted = completed; // Start with potentially provided value
            let derivedPercentage = completionPercentage;
            let derivedCompletedAt = completedAt;

            if (list === 'Trash') {
                derivedCompleted = false;
                derivedPercentage = null; // Trashed tasks have no percentage
                derivedCompletedAt = null;
            } else {
                const percentageChanged = prevTask?.completionPercentage !== derivedPercentage;
                const completedChanged = prevTask?.completed !== derivedCompleted;

                if (percentageChanged && derivedPercentage !== null) {
                    // If percentage was the primary change
                    derivedCompleted = derivedPercentage === 100;
                } else if (completedChanged) {
                    // If completed status was the primary change
                    derivedPercentage = derivedCompleted ? 100 : null; // Set percentage accordingly
                } else {
                    // Fallback: ensure consistency if neither changed explicitly or on init
                    derivedCompleted = derivedPercentage === 100;
                }

                // Ensure completedAt reflects derivedCompleted status
                if (derivedCompleted && derivedCompletedAt === null) {
                    // If marked complete but no completedAt, set it now
                    derivedCompletedAt = prevTask?.completedAt ?? now;
                } else if (!derivedCompleted) {
                    derivedCompletedAt = null; // Ensure null if not completed
                }

                // Normalize 0% to null for percentage
                if (derivedPercentage === 0) derivedPercentage = null;
            }
            // --- End of sync logic ---

            const consistentTask = {
                ...rest, // Spread the rest of the task properties
                list,
                completionPercentage: derivedPercentage,
                completed: derivedCompleted,
                completedAt: derivedCompletedAt,
                // Assign optional fields safely
                content: task.content ?? '',
                tags: task.tags ?? [],
                priority: task.priority ?? null,
                dueDate: task.dueDate ?? null,
                updatedAt: task.updatedAt, // Keep original update timestamp for comparison
            };

            // Recalculate group category based on the *consistent* state
            const newCategory = getTaskGroupCategory(consistentTask);

            // Determine if a functional change occurred requiring an updatedAt bump
            let hasFunctionalChange = false;
            if (!prevTask) {
                hasFunctionalChange = true; // New task
            } else {
                // Compare relevant fields between the consistent new state and the previous state
                if (consistentTask.title !== prevTask.title ||
                    consistentTask.completionPercentage !== prevTask.completionPercentage || // Compare consistent percentage
                    consistentTask.completed !== prevTask.completed || // Compare consistent completed
                    consistentTask.dueDate !== prevTask.dueDate ||
                    consistentTask.list !== prevTask.list ||
                    consistentTask.content !== prevTask.content ||
                    consistentTask.order !== prevTask.order ||
                    consistentTask.priority !== prevTask.priority ||
                    JSON.stringify(consistentTask.tags) !== JSON.stringify(prevTask.tags) ||
                    newCategory !== prevTask.groupCategory || // Compare derived category
                    consistentTask.completedAt !== prevTask.completedAt // Compare consistent completedAt
                ) {
                    hasFunctionalChange = true;
                }
            }

            // Final task object with updated timestamp if needed
            return {
                ...consistentTask,
                groupCategory: newCategory,
                updatedAt: hasFunctionalChange ? now : (prevTask?.updatedAt ?? task.updatedAt ?? task.createdAt), // Update timestamp only if changed
            };
        });

        // Only update base atom if the processed list is actually different
        // Avoid unnecessary re-renders if processing didn't change functional state
        if (JSON.stringify(nextTasksProcessed) !== JSON.stringify(previousTasks)) {
            set(baseTasksAtom, nextTasksProcessed);
        }
    }
);


// --- UI State Atoms ---
export const selectedTaskIdAtom = atom<string | null>(null);
export const isSettingsOpenAtom = atom<boolean>(false);
export const settingsSelectedTabAtom = atom<SettingsTab>('account');
export const isAddListModalOpenAtom = atom<boolean>(false);
export const currentFilterAtom = atom<TaskFilter>('all');
export const searchTermAtom = atom<string>('');


// --- Summary View Atoms ---
export interface StoredSummary { /* ... (keep as is) ... */
    id: string;
    createdAt: number;
    periodKey: string;
    listKey: string;
    taskIds: string[];
    summaryText: string;
    updatedAt?: number;
}

export type SummaryPeriodKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';
export type SummaryPeriodOption = SummaryPeriodKey | { start: number; end: number };
export const summaryPeriodFilterAtom = atom<SummaryPeriodOption>('thisWeek');
export const summaryListFilterAtom = atom<string>('all');
export const summarySelectedTaskIdsAtom = atom<Set<string>>(new Set<string>());
const summaryStorage = createJSONStorage<StoredSummary[]>(() => localStorage);
export const storedSummariesAtom = atomWithStorage<StoredSummary[]>('tada_summaries_v2_shadcn', [], summaryStorage, {getOnInit: true});
export const currentSummaryIndexAtom = atom<number>(0);
export const isGeneratingSummaryAtom = atom<boolean>(false);


// --- Derived Atoms ---
export const selectedTaskAtom = atom((get) => { /* ... (no change) ... */
    const tasks = get(tasksAtom);
    const selectedId = get(selectedTaskIdAtom);
    if (!selectedId) return null;
    return tasks.find(task => task.id === selectedId) ?? null;
});
const initialUserLists = ['Work', 'Planning', 'Dev', 'Personal']; // Default lists
export const userDefinedListsAtom = atomWithStorage<string[]>('userDefinedLists_v2_shadcn', initialUserLists, undefined, {getOnInit: true});
export const userListNamesAtom = atom((get) => { /* ... (no change) ... */
    const tasks = get(tasksAtom);
    const userLists = get(userDefinedListsAtom);
    const listsFromTasks = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => {
        if (task.list) listsFromTasks.add(task.list)
    });
    const combinedLists = new Set(['Inbox', ...userLists, ...Array.from(listsFromTasks)]);
    combinedLists.delete('Trash');
    return Array.from(combinedLists).sort((a, b) => {
        if (a === 'Inbox') return -1;
        if (b === 'Inbox') return 1;
        return a.localeCompare(b);
    });
});
export const userTagNamesAtom = atom((get) => { /* ... (no change) ... */
    const tasks = get(tasksAtom);
    const tags = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => {
        task.tags?.forEach(tag => tags.add(tag))
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
});
export const taskCountsAtom = atom((get) => { /* ... (no change, uses derived 'completed') ... */
    const tasks = get(tasksAtom);
    const allUserListNames = get(userListNamesAtom);
    const allUserTagNames = get(userTagNamesAtom);
    const activeTasks = tasks.filter(task => task.list !== 'Trash');
    const counts = {
        all: 0,
        today: 0,
        next7days: 0,
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
                    const today = startOfDay(new Date());
                    const dateOnly = startOfDay(date);
                    const sevenDaysFromTodayEnd = endOfDay(addDays(today, 6));
                    if (!isBefore(dateOnly, today) && !isAfter(dateOnly, sevenDaysFromTodayEnd)) counts.next7days++;
                }
            }
            if (task.list && Object.prototype.hasOwnProperty.call(counts.lists, task.list)) counts.lists[task.list]++;
            task.tags?.forEach(tag => {
                if (Object.prototype.hasOwnProperty.call(counts.tags, tag)) counts.tags[tag]++;
            });
        }
    });
    return counts;
});
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => { /* ... (no change, uses task.groupCategory) ... */
    const tasksToGroup = get(tasksAtom).filter(task => task.list !== 'Trash' && !task.completed).sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));
    const groups: Record<TaskGroupCategory, Task[]> = {overdue: [], today: [], next7days: [], later: [], nodate: []};
    tasksToGroup.forEach(task => {
        const category = task.groupCategory;
        if (Object.prototype.hasOwnProperty.call(groups, category)) groups[category].push(task); else {
            console.warn(`Task ${task.id} in groupedAllTasksAtom has unexpected category: ${category}.`);
            groups.nodate.push(task);
        }
    });
    return groups;
});
export const rawSearchResultsAtom = atom<Task[]>((get) => { /* ... (no change) ... */
    const search = get(searchTermAtom).trim().toLowerCase();
    if (!search) return [];
    const allTasks = get(tasksAtom);
    const searchWords = search.split(' ').filter(Boolean);
    return allTasks.filter(task => searchWords.every(word => task.title.toLowerCase().includes(word) || (task.content && task.content.toLowerCase().includes(word)) || (task.tags && task.tags.some(tag => tag.toLowerCase().includes(word))) || (task.list.toLowerCase().includes(word)))).sort((a, b) => {
        const aIsActive = a.list !== 'Trash' && !a.completed;
        const bIsActive = b.list !== 'Trash' && !b.completed;
        if (aIsActive !== bIsActive) return aIsActive ? -1 : 1;
        return (a.order ?? 0) - (b.order ?? 0) || (a.createdAt - b.createdAt);
    });
});


// --- Derived Atoms for Summary View (Logic remains the same) ---
export const currentSummaryFilterKeyAtom = atom<string>((get) => { /* ... */
    const period = get(summaryPeriodFilterAtom);
    const list = get(summaryListFilterAtom);
    let periodStr: string;
    if (typeof period === 'string') periodStr = period; else periodStr = `custom_${startOfDay(period.start).getTime()}_${endOfDay(period.end).getTime()}`;
    const listStr = list === 'all' ? 'all' : `list-${list}`;
    return `${periodStr}__${listStr}`;
});
export const filteredTasksForSummaryAtom = atom<Task[]>((get) => { /* ... */
    const allTasks = get(tasksAtom);
    const period = get(summaryPeriodFilterAtom);
    const listFilter = get(summaryListFilterAtom);
    const now = new Date();
    const todayStart = startOfDay(now);
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    switch (period) {
        case 'today':
            startDate = todayStart;
            endDate = endOfDay(now);
            break;
        case 'yesterday':
            startDate = startOfDay(subDays(todayStart, 1));
            endDate = endOfDay(subDays(todayStart, 1));
            break;
        case 'thisWeek':
            startDate = startOfWeek(todayStart);
            endDate = endOfWeek(todayStart);
            break;
        case 'lastWeek':
            const lwStart = startOfWeek(subWeeks(todayStart, 1));
            startDate = lwStart;
            endDate = endOfWeek(lwStart);
            break;
        case 'thisMonth':
            startDate = startOfMonth(todayStart);
            endDate = endOfMonth(todayStart);
            break;
        case 'lastMonth':
            const lmStart = startOfMonth(subMonths(todayStart, 1));
            startDate = lmStart;
            endDate = endOfMonth(lmStart);
            break;
        default:
            if (typeof period === 'object' && period.start && period.end) {
                startDate = startOfDay(new Date(period.start));
                endDate = endOfDay(new Date(period.end));
            }
            break;
    }
    if ((startDate && !isValid(startDate)) || (endDate && !isValid(endDate))) {
        console.error("Invalid date range", {period, startDate, endDate});
        return [];
    }
    return allTasks.filter(task => {
        if (task.completionPercentage === null || task.completionPercentage === 0) return false;
        if (listFilter !== 'all' && task.list !== listFilter) return false;
        if (startDate && endDate) {
            if (!task.dueDate) return false;
            const dueDate = safeParseDate(task.dueDate);
            if (!dueDate || !isValid(dueDate)) return false;
            const dueDateStart = startOfDay(dueDate);
            if (isBefore(dueDateStart, startDate) || isAfter(dueDateStart, endDate)) return false;
        }
        if (task.list === 'Trash') return false;
        return true;
    }).sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || a.order - b.order || a.createdAt - b.createdAt);
});
export const relevantStoredSummariesAtom = atom<StoredSummary[]>((get) => { /* ... */
    const allSummaries = get(storedSummariesAtom);
    const filterKey = get(currentSummaryFilterKeyAtom);
    return allSummaries.filter(s => s.periodKey === filterKey.split('__')[0] && s.listKey === filterKey.split('__')[1]).sort((a, b) => b.createdAt - a.createdAt);
});
export const currentDisplayedSummaryAtom = atom<StoredSummary | null>((get) => { /* ... */
    const relevantSummaries = get(relevantStoredSummariesAtom);
    const index = get(currentSummaryIndexAtom);
    return relevantSummaries[index] ?? null;
});
export const referencedTasksForSummaryAtom = atom<Task[]>((get) => { /* ... */
    const currentSummary = get(currentDisplayedSummaryAtom);
    if (!currentSummary) return [];
    const allTasks = get(tasksAtom);
    const referencedIds = new Set(currentSummary.taskIds);
    return allTasks.filter(task => referencedIds.has(task.id)).sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || a.order - b.order);
});