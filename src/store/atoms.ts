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
    isOverdue as isOverdueCheck,
    isSameDay,
    isToday as isTodayCheck,
    isValid,
    isWithinNext7Days,
    safeParseDate,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subDays,
    subMonths,
    subWeeks
} from '@/utils/dateUtils';

// --- Base Atoms ---

// User Information
export const currentUserAtom = atom<User | null>({
    id: '1',
    name: 'Liu Yunpeng', // Placeholder Name
    email: 'yp.leao@gmail.com', // Placeholder Email
    avatar: '/vite.svg', // Placeholder Avatar (Vite logo)
    isPremium: true, // Example status
});

// Helper function to determine task group category
export const getTaskGroupCategory = (task: Omit<Task, 'groupCategory'> | Task): TaskGroupCategory => {
    // Use the `completed` field (derived from completionPercentage)
    if (task.completed || task.list === 'Trash') {
        return 'nodate'; // Completed or trashed tasks have no relevant due date category
    }
    if (task.dueDate != null) {
        const dueDateObj = safeParseDate(task.dueDate);
        if (!dueDateObj || !isValid(dueDateObj)) return 'nodate'; // Invalid date treated as no date

        const today = startOfDay(new Date());
        const taskDay = startOfDay(dueDateObj);

        if (isBefore(taskDay, today)) return 'overdue';
        if (isSameDay(taskDay, today)) return 'today';

        // Check for "Next 7 Days" (Today + 6 more days)
        const sevenDaysFromTodayEnd = endOfDay(addDays(today, 6));
        // isWithinNext7Days checks from today up to 6 days ahead
        if (isWithinNext7Days(taskDay)) { // Use the imported function directly
            return 'next7days';
        }

        // If due date is after the "Next 7 Days" window
        if (isAfter(taskDay, sevenDaysFromTodayEnd)) {
            return 'later';
        }
    }
    // Default to 'nodate' if no valid due date or doesn't fit other categories
    return 'nodate';
};


// --- Initial Task Data ---
const initialTasksDataRaw = [
    // Overdue
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
        id: '12',
        title: '续费健身卡',
        completionPercentage: 0,
        dueDate: subDays(startOfDay(new Date()), 1),
        list: 'Personal',
        content: 'Check for renewal offers.',
        order: 11,
        createdAt: subDays(new Date(), 2).getTime(),
        updatedAt: subDays(new Date(), 1).getTime(),
        priority: 2
    },
    // Today
    {
        id: '1',
        title: '施工组织设计评审表',
        completionPercentage: 50,
        dueDate: startOfDay(new Date()),
        list: 'Work',
        content: 'Review the construction plan details. Focus on safety section.',
        order: 0,
        createdAt: subDays(new Date(), 3).getTime(),
        updatedAt: subDays(new Date(), 3).getTime(),
        priority: 1,
        tags: ['review', 'urgent']
    },
    // Today (Completed) - Will be filtered out of active groups, but has a due date of today
    {
        id: '8',
        title: '准备明天会议材料',
        completionPercentage: 100,
        dueDate: startOfDay(new Date()),
        list: 'Work',
        content: 'Finalize slides, add Q&A section.',
        order: 1,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: new Date().getTime(),
        priority: 1,
        completedAt: new Date().getTime()
    },
    // Next 7 Days
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
        id: '14',
        title: '预约 Code Review',
        completionPercentage: 0,
        dueDate: addDays(startOfDay(new Date()), 5),
        list: 'Dev',
        content: 'For the new auth module.',
        order: 13,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: subDays(new Date(), 1).getTime(),
    },
    // Later
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
        id: '15',
        title: '季度报告初稿',
        completionPercentage: 0,
        dueDate: addDays(startOfDay(new Date()), 15),
        list: 'Work',
        content: 'Gather data from all teams.',
        order: 14,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: subDays(new Date(), 1).getTime(),
        priority: 3
    },
    // No Date
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
        id: '13',
        title: '欢迎加入Tada',
        completionPercentage: 0,
        dueDate: null,
        list: 'Inbox',
        content: 'Try creating your first task!',
        order: 12,
        createdAt: subDays(new Date(), 1).getTime(),
        updatedAt: subDays(new Date(), 1).getTime()
    },
    // No Date (Completed)
    {
        id: '4',
        title: '我能用Tada做什么?',
        completionPercentage: 100,
        dueDate: null,
        list: 'Inbox',
        content: 'Organize life, track projects, collaborate.',
        order: 4,
        createdAt: subDays(new Date(), 5).getTime(),
        updatedAt: subDays(new Date(), 5).getTime(),
        completedAt: subDays(new Date(), 3).getTime()
    },
    {
        id: '5',
        title: 'Explore Features (Copy)',
        completionPercentage: 100,
        dueDate: null,
        list: 'Inbox',
        content: 'Explore features:\n- **Tasks**\n- Calendar\n- Summary',
        order: 8,
        createdAt: subDays(new Date(), 4).getTime(),
        completedAt: new Date().getTime(),
        updatedAt: new Date().getTime()
    },
    // Completed (with past due date)
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
    // Trashed
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


// Initialize tasks: Set correct derived fields
const initialTasks: Task[] = initialTasksDataRaw
    .map(taskRaw => {
        const now = Date.now();
        // Handle null percentage as 0 for completion check, but store null
        const percentage = taskRaw.completionPercentage ?? null;
        const isCompleted = percentage === 100;

        // Validate and convert dueDate
        let dueDateTimestamp: number | null = null;
        if (taskRaw.dueDate !== null && taskRaw.dueDate !== undefined) {
            const parsedDate = safeParseDate(taskRaw.dueDate);
            if (parsedDate && isValid(parsedDate)) {
                dueDateTimestamp = parsedDate.getTime();
            } else {
                // console.warn(`Invalid dueDate for task "${taskRaw.title}". Setting to null.`);
            }
        }

        // Base task structure without groupCategory
        const taskPartial: Omit<Task, 'groupCategory'> = {
            id: taskRaw.id,
            title: taskRaw.title,
            completed: isCompleted,
            completionPercentage: percentage, // Store original null/number
            dueDate: dueDateTimestamp,
            list: taskRaw.list,
            content: taskRaw.content ?? '',
            order: taskRaw.order,
            createdAt: taskRaw.createdAt,
            updatedAt: taskRaw.updatedAt ?? now,
            completedAt: isCompleted ? (taskRaw.completedAt ?? taskRaw.updatedAt ?? now) : null,
            tags: taskRaw.tags ?? [],
            priority: taskRaw.priority ?? null,
        };

        // Add groupCategory using the helper function
        return {
            ...taskPartial,
            groupCategory: getTaskGroupCategory(taskPartial),
        };
    })
    // Initial sort (important for consistent order calculation)
    .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));


// --- Task Management Atoms ---

// Base atom with storage for the raw task list
const baseTasksAtom = atomWithStorage<Task[]>('tasks_v7_radix_final', initialTasks, undefined, {getOnInit: true});

// Main tasks atom: Handles getting and sophisticated setting logic
export const tasksAtom = atom(
    // Getter: Simply returns the current state of baseTasksAtom
    (get) => get(baseTasksAtom),
    // Setter: Processes updates, derives state, and updates baseTasksAtom
    (get, set, update: Task[] | ((prev: Task[]) => Task[]) | typeof RESET) => {
        if (update === RESET) {
            // Handle reset action
            set(baseTasksAtom, initialTasks); // Reset to initial state
            return;
        }

        const previousTasks = get(baseTasksAtom);
        // Determine the next raw task list based on the update type
        const nextTasksRaw = typeof update === 'function' ? update(previousTasks) : update;
        const now = Date.now();

        // Process each task to derive/validate state and update timestamp if needed
        const nextTasksProcessed = nextTasksRaw.map(task => {
            const previousTaskState = previousTasks.find(p => p.id === task.id);

            let currentPercentage = task.completionPercentage ?? null;
            let isCompleted = task.completed;

            // --- State Derivation Logic ---
            if (task.list === 'Trash') {
                // Trashed tasks are never "completed" or "in progress" visually
                currentPercentage = null;
                isCompleted = false;
            } else if (previousTaskState && task.completed !== undefined && task.completed !== previousTaskState.completed) {
                // If 'completed' was explicitly toggled
                isCompleted = task.completed;
                currentPercentage = isCompleted ? 100 : (previousTaskState.completionPercentage === 100 ? null : previousTaskState.completionPercentage); // Go to 100 or back to previous (or null)
            } else if (task.completionPercentage !== undefined && (!previousTaskState || task.completionPercentage !== previousTaskState.completionPercentage)) {
                // If 'completionPercentage' changed explicitly
                currentPercentage = task.completionPercentage === 0 ? null : task.completionPercentage; // Treat 0 as null
                isCompleted = currentPercentage === 100;
            } else {
                // Fallback: Ensure completed matches percentage if neither triggered the update
                isCompleted = currentPercentage === 100;
            }
            // --- End State Derivation ---

            // Calculate completedAt based on the derived completed status
            const newCompletedAt = isCompleted ? (task.completedAt ?? previousTaskState?.completedAt ?? task.updatedAt ?? now) : null;

            // Create the validated task object *before* category calculation
            const validatedTask: Omit<Task, 'groupCategory'> = {
                ...task,
                content: task.content ?? '',
                tags: task.tags ?? [],
                priority: task.priority ?? null,
                completionPercentage: currentPercentage,
                completed: isCompleted,
                completedAt: newCompletedAt,
                // Ensure updatedAt exists
                updatedAt: task.updatedAt ?? (previousTaskState?.updatedAt ?? task.createdAt),
            };

            // Calculate the group category based on the potentially updated state
            const newCategory = getTaskGroupCategory(validatedTask);

            // Determine if functional changes occurred warranting an updatedAt bump
            let changed = false;
            if (!previousTaskState) {
                changed = true; // New task
            } else {
                // Compare relevant fields that signify a functional update
                if (validatedTask.title !== previousTaskState.title ||
                    validatedTask.completionPercentage !== previousTaskState.completionPercentage || // Change in progress %
                    validatedTask.completed !== previousTaskState.completed || // Change in completion status
                    validatedTask.dueDate !== previousTaskState.dueDate ||
                    validatedTask.list !== previousTaskState.list ||
                    validatedTask.content !== previousTaskState.content ||
                    validatedTask.order !== previousTaskState.order ||
                    validatedTask.priority !== previousTaskState.priority ||
                    JSON.stringify(validatedTask.tags?.sort()) !== JSON.stringify(previousTaskState.tags?.sort()) || // Compare sorted tags
                    newCategory !== previousTaskState.groupCategory) // Change in derived group category
                {
                    changed = true;
                }
            }

            // Final task object for the new state
            const finalTask = {...validatedTask, groupCategory: newCategory};

            // Update timestamp only if functionally changed
            if (changed) {
                return {...finalTask, updatedAt: now};
            } else {
                // If no functional change, return the object with the *original* updatedAt
                // This prevents unnecessary re-renders due to timestamp changes alone
                return {...finalTask, updatedAt: previousTaskState!.updatedAt};
            }
        });

        // Only update the underlying atom if the processed list *actually* differs
        // This is a safeguard against potential infinite loops if processing logic is complex
        if (JSON.stringify(nextTasksProcessed) !== JSON.stringify(previousTasks)) {
            // console.log("Updating baseTasksAtom due to detected changes.");
            set(baseTasksAtom, nextTasksProcessed);
        } else {
            // console.log("Skipping baseTasksAtom update - no functional changes detected.");
        }
    }
);


// --- UI State Atoms ---

// ID of the currently selected task for detail view
export const selectedTaskIdAtom = atom<string | null>(null);
// Controls visibility of the Settings modal
export const isSettingsOpenAtom = atom<boolean>(false);
// Tracks the currently selected tab within the Settings modal
export const settingsSelectedTabAtom = atom<SettingsTab>('account');
// Controls visibility of the Add List modal
export const isAddListModalOpenAtom = atom<boolean>(false);
// Tracks the currently active filter (e.g., 'today', 'list-Work') based on routing
export const currentFilterAtom = atom<TaskFilter>('all');
// Holds the current search input value
export const searchTermAtom = atom<string>('');


// --- Summary View Atoms ---

// Structure for stored summaries
export interface StoredSummary {
    id: string;
    createdAt: number; // Timestamp when generated
    periodKey: string; // Key representing the date filter (e.g., 'thisWeek', 'custom_...')
    listKey: string; // Key representing the list filter (e.g., 'all', 'list-Work')
    taskIds: string[]; // IDs of tasks included in the summary
    summaryText: string; // The generated summary content
    updatedAt?: number; // Timestamp if edited later
}

// Type for the period filter dropdown options
export type SummaryPeriodKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';
export type SummaryPeriodOption = SummaryPeriodKey | { start: number; end: number }; // Allows predefined keys or custom range

// Atom for the selected period filter in the Summary view
export const summaryPeriodFilterAtom = atom<SummaryPeriodOption>('thisWeek');
// Atom for the selected list filter in the Summary view
export const summaryListFilterAtom = atom<string>('all'); // 'all' or list name
// Atom tracking the IDs of tasks explicitly selected by the user for summary generation
export const summarySelectedTaskIdsAtom = atom<Set<string>>(new Set<string>());
// Atom for storing generated summaries with persistence (localStorage)
const summaryStorage = createJSONStorage<StoredSummary[]>(() => localStorage);
export const storedSummariesAtom = atomWithStorage<StoredSummary[]>(
    'tada_summaries_v2_radix', // Updated storage key
    [], // Initial value: empty array
    summaryStorage,
    {getOnInit: true} // Load from storage on init
);
// Atom tracking the index of the currently viewed summary within the relevant list
export const currentSummaryIndexAtom = atom<number>(0);
// Atom indicating if a summary generation is currently in progress
export const isGeneratingSummaryAtom = atom<boolean>(false);


// --- Derived Atoms ---

// Derives the full Task object for the currently selected task ID
export const selectedTaskAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const selectedId = get(selectedTaskIdAtom);
    if (!selectedId) return null;
    return tasks.find(task => task.id === selectedId) ?? null;
});

// Stores user-defined list names persistently
const initialUserLists = ['Work', 'Planning', 'Dev', 'Personal'];
export const userDefinedListsAtom = atomWithStorage<string[]>(
    'userDefinedLists_v2_radix', // Updated storage key
    initialUserLists,
    undefined,
    {getOnInit: true}
);

// Derives a sorted list of all unique list names (Inbox + user-defined + from tasks)
export const userListNamesAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const userLists = get(userDefinedListsAtom);
    const listsFromTasks = new Set<string>();
    // Extract lists from tasks (excluding Trash)
    tasks.filter(t => t.list !== 'Trash').forEach(task => {
        if (task.list) listsFromTasks.add(task.list);
    });
    // Combine default 'Inbox', user-defined lists, and lists found in tasks
    const combinedLists = new Set(['Inbox', ...userLists, ...Array.from(listsFromTasks)]);
    combinedLists.delete('Trash'); // Ensure Trash is never shown as a selectable list
    // Sort alphabetically, keeping 'Inbox' first
    return Array.from(combinedLists).sort((a, b) => {
        if (a === 'Inbox') return -1;
        if (b === 'Inbox') return 1;
        return a.localeCompare(b);
    });
});

// Derives a sorted list of all unique tag names from active tasks
export const userTagNamesAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const tags = new Set<string>();
    tasks.filter(t => t.list !== 'Trash').forEach(task => { // Exclude tags from trashed items
        task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b)); // Sort tags alphabetically
});

// Derives counts for different task categories (used in Sidebar)
export const taskCountsAtom = atom((get) => {
    const tasks = get(tasksAtom);
    const allUserListNames = get(userListNamesAtom);
    const allUserTagNames = get(userTagNamesAtom);

    // Pre-filter tasks for efficiency
    const activeTasks = tasks.filter(task => task.list !== 'Trash');
    const trashedTasksCount = tasks.length - activeTasks.length;

    // Initialize counts object
    const counts = {
        all: 0, // Count of active, non-completed tasks
        today: 0, // Active tasks due today
        next7days: 0, // Active tasks due within the next 7 days (inclusive)
        completed: 0, // Count of *active* (non-trashed) completed tasks
        trash: trashedTasksCount, // Count of trashed tasks
        lists: Object.fromEntries(allUserListNames.map(name => [name, 0])),
        tags: Object.fromEntries(allUserTagNames.map(name => [name, 0])),
    };

    // Iterate through active tasks to populate counts
    activeTasks.forEach(task => {
        if (task.completed) {
            counts.completed++;
        } else {
            // Count for 'All Tasks' view (active, non-completed)
            counts.all++;

            // Count for date-based views
            if (task.dueDate != null) {
                const date = safeParseDate(task.dueDate);
                if (date && isValid(date)) {
                    if (isTodayCheck(date)) counts.today++;
                    // Check if due date is not overdue AND within the next 7 days
                    if (!isOverdueCheck(date) && isWithinNext7Days(date)) {
                        counts.next7days++;
                    }
                }
            }

            // Count for lists
            if (task.list && Object.prototype.hasOwnProperty.call(counts.lists, task.list)) {
                counts.lists[task.list]++;
            }

            // Count for tags
            task.tags?.forEach(tag => {
                if (Object.prototype.hasOwnProperty.call(counts.tags, tag)) {
                    counts.tags[tag]++;
                }
            });
        }
    });

    return counts;
});

// Derives tasks grouped by category ('overdue', 'today', etc.) for the 'All Tasks' view
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => {
    // Filter for active (non-trash, non-completed) tasks and sort them
    const tasksToGroup = get(tasksAtom)
        .filter(task => task.list !== 'Trash' && !task.completed)
        .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt)); // Sort by order, then creation time

    const groups: Record<TaskGroupCategory, Task[]> = {
        overdue: [], today: [], next7days: [], later: [], nodate: []
    };

    // Assign tasks to groups based on their pre-calculated groupCategory
    tasksToGroup.forEach(task => {
        // Use the groupCategory calculated by the tasksAtom setter
        const category = task.groupCategory;
        if (Object.prototype.hasOwnProperty.call(groups, category)) {
            groups[category].push(task);
        } else {
            // Fallback for unexpected categories
            console.warn(`Task ${task.id} in groupedAllTasksAtom has unexpected category: ${category}. Placing in 'nodate'.`);
            groups.nodate.push(task);
        }
    });

    return groups;
});

// Derives a flat list of tasks matching the current search term
export const rawSearchResultsAtom = atom<Task[]>((get) => {
    const search = get(searchTermAtom).trim().toLowerCase();
    if (!search) return []; // Return empty array if search is empty

    const allTasks = get(tasksAtom);
    const searchWords = search.split(' ').filter(Boolean); // Split search into words

    // Filter tasks where *every* search word is found in title, content, tags, or list name
    return allTasks.filter(task =>
        searchWords.every(word =>
            task.title.toLowerCase().includes(word) ||
            (task.content && task.content.toLowerCase().includes(word)) ||
            (task.tags && task.tags.some(tag => tag.toLowerCase().includes(word))) ||
            (task.list.toLowerCase().includes(word))
        )
    )
        // Sort search results: active first, then by order/creation date
        .sort((a, b) => {
            const aIsActive = a.list !== 'Trash' && !a.completed;
            const bIsActive = b.list !== 'Trash' && !b.completed;
            // Prioritize active tasks
            if (aIsActive !== bIsActive) return aIsActive ? -1 : 1;
            // Then sort by order, fallback to creation date
            return (a.order ?? 0) - (b.order ?? 0) || (a.createdAt - b.createdAt);
        });
});


// --- Derived Atoms for Summary View ---

// Creates a unique key representing the current filter combination for storing/retrieving summaries
export const currentSummaryFilterKeyAtom = atom<string>((get) => {
    const period = get(summaryPeriodFilterAtom);
    const list = get(summaryListFilterAtom);
    let periodStr: string;

    if (typeof period === 'string') {
        periodStr = period; // Use predefined keys like 'today', 'thisWeek'
    } else {
        // Create a consistent key for custom date ranges
        periodStr = `custom_${startOfDay(period.start).getTime()}_${endOfDay(period.end).getTime()}`;
    }
    // Create list key (prefix 'list-' unless 'all')
    const listStr = list === 'all' ? 'all' : `list-${list}`;

    return `${periodStr}__${listStr}`; // Combine keys
});

// Filters all tasks based on the current Summary view filters (Period and List)
export const filteredTasksForSummaryAtom = atom<Task[]>((get) => {
    const allTasks = get(tasksAtom);
    const period = get(summaryPeriodFilterAtom);
    const listFilter = get(summaryListFilterAtom);
    const now = new Date();
    const todayStart = startOfDay(now);

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    // Determine date range based on the period filter
    switch (period) {
        case 'today':
            startDate = todayStart;
            endDate = endOfDay(now);
            break;
        case 'yesterday':
            startDate = startOfDay(subDays(todayStart, 1));
            endDate = endOfDay(startDate);
            break;
        case 'thisWeek':
            startDate = startOfWeek(todayStart);
            endDate = endOfWeek(todayStart);
            break;
        case 'lastWeek':
            startDate = startOfWeek(subWeeks(todayStart, 1));
            endDate = endOfWeek(startDate);
            break;
        case 'thisMonth':
            startDate = startOfMonth(todayStart);
            endDate = endOfMonth(todayStart);
            break;
        case 'lastMonth':
            startDate = startOfMonth(subMonths(todayStart, 1));
            endDate = endOfMonth(startDate);
            break;
        default: // Handle custom range object
            if (typeof period === 'object' && period.start && period.end) {
                startDate = startOfDay(new Date(period.start));
                endDate = endOfDay(new Date(period.end));
            }
            break;
    }

    // Validate the calculated date range
    if ((startDate && !isValid(startDate)) || (endDate && !isValid(endDate))) {
        console.error("Invalid date range for summary filter", {period, startDate, endDate});
        return []; // Return empty if range is invalid
    }

    // Filter tasks
    return allTasks.filter(task => {
        // Rule 1: Must not be trashed
        if (task.list === 'Trash') return false;

        // Rule 2: Must have some progress (not 0% or null)
        if (task.completionPercentage === null || task.completionPercentage === 0) return false;

        // Rule 3: Match list filter (if not 'all')
        if (listFilter !== 'all' && task.list !== listFilter) return false;

        // Rule 4: Match date range (if a range is active)
        if (startDate && endDate) {
            if (!task.dueDate) return false; // Task must have a due date to match a range
            const dueDate = safeParseDate(task.dueDate);
            if (!dueDate || !isValid(dueDate)) return false; // Due date must be valid

            const dueDateStart = startOfDay(dueDate); // Compare based on the day
            // Check if due date falls outside the range
            if (isBefore(dueDateStart, startDate) || isAfter(dueDateStart, endDate)) return false;
        }

        // If all checks pass, include the task
        return true;
    })
        // Sort the filtered tasks consistently
        .sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || a.order - b.order || a.createdAt - b.createdAt);
});

// Retrieves stored summaries that match the current filter key
export const relevantStoredSummariesAtom = atom<StoredSummary[]>((get) => {
    const allSummaries = get(storedSummariesAtom);
    const filterKey = get(currentSummaryFilterKeyAtom);
    const [periodKey, listKey] = filterKey.split('__'); // Extract keys

    // Filter summaries matching both period and list keys
    return allSummaries
        .filter(s => s.periodKey === periodKey && s.listKey === listKey)
        .sort((a, b) => b.createdAt - a.createdAt); // Sort by creation time DESC (newest first)
});

// Gets the specific summary object currently being displayed based on the index
export const currentDisplayedSummaryAtom = atom<StoredSummary | null>((get) => {
    const relevantSummaries = get(relevantStoredSummariesAtom);
    const index = get(currentSummaryIndexAtom);
    // Return the summary at the current index, or null if index is out of bounds
    return relevantSummaries[index] ?? null;
});

// Gets the full Task objects referenced by the currently displayed summary
export const referencedTasksForSummaryAtom = atom<Task[]>((get) => {
    const currentSummary = get(currentDisplayedSummaryAtom);
    if (!currentSummary) return []; // No summary selected, no referenced tasks

    const allTasks = get(tasksAtom);
    const referencedIds = new Set(currentSummary.taskIds); // Efficient lookup

    // Filter all tasks to find those whose IDs are in the summary's list
    return allTasks
        .filter(task => referencedIds.has(task.id))
        // Sort referenced tasks consistently (e.g., by due date, then order)
        .sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || a.order - b.order);
});