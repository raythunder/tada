// src/store/atoms.ts
import {atom} from 'jotai';
import {atomWithStorage, RESET} from 'jotai/utils';
import {SettingsTab, Task, TaskFilter, TaskGroupCategory, User} from '@/types';
import {
    addDays,
    endOfDay,
    isAfter,
    isBefore,
    isOverdue as isOverdueCheck,
    isSameDay,
    isToday as isTodayCheck,
    isValid,
    isWithinNext7Days,
    safeParseDate,
    startOfDay,
    subDays
} from '@/utils/dateUtils';

// --- Base Atoms ---
export const currentUserAtom = atom<User | null>({
    id: '1',
    name: 'Liu Yunpeng',
    email: 'yp.leao@gmail.com',
    avatar: '/vite.svg',
    isPremium: true,
});

// Helper function to determine task group category (relies on `completed` status)
export const getTaskGroupCategory = (task: Omit<Task, 'groupCategory'> | Task): TaskGroupCategory => {
    // Use the `completed` field, which should be kept in sync with completionPercentage by the atom setter
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

// Sample Data with completionPercentage
const initialTasksDataRaw = [
    {
        id: '11',
        title: '体检预约',
        completionPercentage: 50,
        dueDate: subDays(startOfDay(new Date()), 2),
        list: 'Personal',
        content: 'Called the clinic, waiting for callback.',
        order: 7,
        createdAt: subDays(new Date(), 4).getTime(),
        updatedAt: subDays(new Date(), 1).getTime(),
        priority: 1
    },
    {
        id: '1',
        title: '施工组织设计评审表',
        completionPercentage: null,
        dueDate: startOfDay(new Date()),
        list: 'Work',
        content: 'Review the construction plan details.',
        order: 0,
        createdAt: subDays(new Date(), 3).getTime(),
        updatedAt: subDays(new Date(), 3).getTime(),
        priority: 1,
        tags: ['review', 'urgent']
    },
    {
        id: '8',
        title: '准备明天会议材料',
        completionPercentage: 80,
        dueDate: startOfDay(new Date()),
        list: 'Work',
        content: 'Finalize slides, need to add Q&A section.',
        order: 1,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: new Date().getTime(),
        priority: 1
    },
    {
        id: '2',
        title: '开发框架讲解',
        completionPercentage: 20,
        dueDate: addDays(startOfDay(new Date()), 1),
        list: 'Work',
        content: 'Prepare slides for the team meeting. Outline done.',
        order: 2,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: new Date().getTime(),
        priority: 2
    },
    {
        id: '3',
        title: 'RESTful讲解',
        completionPercentage: 0,
        dueDate: addDays(startOfDay(new Date()), 3),
        list: 'Work',
        content: '',
        order: 3,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: subDays(new Date(), 1).getTime(),
        tags: ['presentation']
    },
    {
        id: '9',
        title: '下周项目规划',
        completionPercentage: null,
        dueDate: addDays(startOfDay(new Date()), 10),
        list: 'Planning',
        content: 'Define milestones for Q4.',
        order: 6,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: subDays(new Date(), 1).getTime()
    },
    {
        id: '4',
        title: '欢迎加入Tada',
        completionPercentage: null,
        dueDate: null,
        list: 'Inbox',
        content: 'Explore features:\n- **Tasks**\n- Calendar\n- Summary',
        order: 4,
        createdAt: subDays(new Date(), 5).getTime(),
        updatedAt: subDays(new Date(), 5).getTime()
    },
    {
        id: '10',
        title: '研究 CodeMirror Themes',
        completionPercentage: 50,
        dueDate: null,
        list: 'Dev',
        content: 'Found a few potential themes, need to test.',
        order: 5,
        createdAt: subDays(new Date(), 2).getTime(),
        updatedAt: new Date().getTime(),
        priority: 3
    },
    {
        id: '5',
        title: '我能用Tada做什么?',
        completionPercentage: 100,
        dueDate: null,
        list: 'Inbox',
        content: 'Organize life, track projects, collaborate.',
        order: 8,
        createdAt: subDays(new Date(), 4).getTime(),
        completedAt: new Date().getTime(),
        updatedAt: new Date().getTime()
    },
    {
        id: '7',
        title: 'Swagger2讲解 (Completed)',
        completionPercentage: 100,
        dueDate: new Date(2024, 5, 14).getTime(),
        list: 'Work',
        content: 'Focus on API documentation standards.',
        order: 10,
        createdAt: new Date(2024, 5, 10).getTime(),
        updatedAt: new Date(2024, 5, 14, 15, 0, 0).getTime(),
        completedAt: new Date(2024, 5, 14, 15, 0, 0).getTime()
    },
    {
        id: '6',
        title: '研究一下patch (Trashed)',
        completionPercentage: null,
        dueDate: new Date(2024, 5, 13).getTime(),
        list: 'Trash',
        content: '',
        order: 9,
        createdAt: new Date(2024, 5, 10).getTime(),
        updatedAt: new Date(2024, 5, 10).getTime()
    },
];

// Initialize tasks with calculated groupCategory and derived completed status
const initialTasks: Task[] = initialTasksDataRaw
    .map(taskRaw => {
        const now = Date.now();
        const percentage = taskRaw.completionPercentage ?? 0; // Treat null as 0
        const isCompleted = percentage === 100;
        const dueDateTimestamp = taskRaw.dueDate instanceof Date && isValid(taskRaw.dueDate) ? taskRaw.dueDate.getTime() : (taskRaw.dueDate === null ? null : undefined);
        if (dueDateTimestamp === undefined && taskRaw.dueDate !== null) {
            console.warn(`Invalid dueDate encountered for task "${taskRaw.title}". Setting to null.`);
        }

        const taskPartial: Omit<Task, 'groupCategory'> = {
            ...taskRaw,
            completed: isCompleted, // Derived from percentage
            completionPercentage: taskRaw.completionPercentage, // Keep original null/number
            dueDate: dueDateTimestamp === undefined ? null : dueDateTimestamp,
            completedAt: isCompleted ? (taskRaw.completedAt ?? taskRaw.updatedAt ?? now) : null, // Set based on derived completed status
            updatedAt: taskRaw.updatedAt ?? now,
            tags: taskRaw.tags ?? [],
            priority: taskRaw.priority ?? null,
            content: taskRaw.content ?? '',
        };
        return {
            ...taskPartial,
            groupCategory: getTaskGroupCategory(taskPartial), // Use the derived completed status for grouping
        };
    })
    .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));

// Atom for storing the raw task list with persistence
const baseTasksAtom = atomWithStorage<Task[]>('tasks_v6_percentage', initialTasks, undefined, {getOnInit: true});

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
        let hasFunctionalChanges = false; // Track changes that affect state/logic
        const now = Date.now();

        const nextTasksProcessed = nextTasksRaw.map(task => {
            const previousTaskState = previousTasks.find(p => p.id === task.id);

            // --- Start Derivation Logic ---
            let currentPercentage = task.completionPercentage ?? 0;
            if (previousTaskState && task.completed !== previousTaskState.completed) {
                currentPercentage = task.completed ? 100 : (previousTaskState.completionPercentage === 100 ? 0 : (previousTaskState.completionPercentage ?? 0));
            } else if (task.list === 'Trash') {
                currentPercentage = 0;
            }
            const isCompleted = currentPercentage === 100;
            const newCompletedAt = isCompleted ? (task.completedAt ?? previousTaskState?.completedAt ?? task.updatedAt ?? now) : null;
            // --- End Derivation Logic ---

            const validatedTask = {
                ...task,
                content: task.content ?? '',
                tags: task.tags ?? [],
                priority: task.priority ?? null,
                completionPercentage: currentPercentage === 0 ? null : currentPercentage,
                completed: isCompleted,
                completedAt: newCompletedAt,
                updatedAt: task.updatedAt // Keep original updatedAt unless changed below
            };
            const newCategory = getTaskGroupCategory(validatedTask);

            let changed = false;
            if (validatedTask.completed !== task.completed ||
                validatedTask.completedAt !== task.completedAt ||
                validatedTask.completionPercentage !== task.completionPercentage ||
                newCategory !== task.groupCategory) {
                changed = true;
            } else if (previousTaskState && JSON.stringify(task) !== JSON.stringify(previousTaskState)) {
                changed = true;
            } else if (!previousTaskState) {
                changed = true;
            }

            if (changed) {
                hasFunctionalChanges = true;
                // Create comparable objects excluding updatedAt
                const comparableNew = {...validatedTask, updatedAt: undefined, groupCategory: newCategory};
                // Ensure previousTaskState exists before creating comparableOld and accessing its properties
                const comparableOld = previousTaskState ? {...previousTaskState, updatedAt: undefined} : null;

                // FIX: Check previousTaskState exists before accessing its updatedAt
                const finalUpdatedAt = (previousTaskState && comparableOld && JSON.stringify(comparableNew) === JSON.stringify(comparableOld))
                    ? previousTaskState.updatedAt // No functional change, keep old timestamp
                    : now; // Functional change occurred, update timestamp

                return {...validatedTask, groupCategory: newCategory, updatedAt: finalUpdatedAt};
            }

            if (previousTaskState && JSON.stringify(task) === JSON.stringify(previousTaskState)) {
                return previousTaskState;
            }

            // Fallback
            hasFunctionalChanges = true;
            return {...validatedTask, groupCategory: newCategory, updatedAt: now};
        });

        if (hasFunctionalChanges || JSON.stringify(nextTasksProcessed) !== JSON.stringify(previousTasks)) {
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

// --- Derived Atoms ---

// Selected Task Atom
export const selectedTaskAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const selectedId = get(selectedTaskIdAtom);
    if (!selectedId) return null;
    return tasks.find(task => task.id === selectedId) ?? null;
});

// User List Names Atom
export const userListNamesAtom = atom((get) => {
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
// --- User Defined Lists Atom ---
const initialUserLists = ['Work', 'Planning', 'Dev', 'Personal'];
export const userDefinedListsAtom = atomWithStorage<string[]>('userDefinedLists_v1', initialUserLists, undefined, {getOnInit: true});

// User Tag Names Atom
export const userTagNamesAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const tags = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => {
        task.tags?.forEach(tag => tags.add(tag))
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
});

// Task Counts Atom
export const taskCountsAtom = atom((get) => {
    const tasks = get(tasksAtom);
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
        if (task.completed) { // Uses derived completed status
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
        .filter(task => task.list !== 'Trash' && !task.completed) // Filter based on derived completed status
        .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));
    const groups: Record<TaskGroupCategory, Task[]> = {overdue: [], today: [], next7days: [], later: [], nodate: []};
    tasksToGroup.forEach(task => {
        const category = task.groupCategory; // Use pre-calculated category (based on derived completed status)
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