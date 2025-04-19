// src/store/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import { User, Task, TaskFilter, TaskGroupCategory, SettingsTab } from '@/types';
import {
    isToday, isWithinNext7Days, isOverdue, startOfDay, safeParseDate,
    isValid, addDays,isBefore, isSameDay, endOfDay, isAfter // Added subDays for potential overdue drop target logic later
} from '@/utils/dateUtils';
import { selectAtom } from 'jotai/utils'; // Keep selectAtom for optimizations

// --- Base Atoms ---
export const currentUserAtom = atom<User | null>({
    id: '1',
    name: 'Liu Yunpeng', // Replace with actual user data if needed
    email: 'yp.leao@gmail.com',
    avatar: '/vite.svg', // Placeholder avatar
    isPremium: true,
});

// Helper function to determine task group category based on due date and completion
// Moved outside atom definition for clarity and potential reuse
const getTaskGroupCategory = (task: Omit<Task, 'groupCategory'> | Task): TaskGroupCategory => {
    // Ignore completed tasks for grouping logic (they usually appear separately)
    // Or handle them explicitly if needed (e.g., a 'completed today' group)
    // For now, assuming grouping applies to non-completed, non-trashed tasks primarily.
    if (task.completed || task.list === 'Trash') {
        // Assign a default or specific category if needed for filtering logic later
        // Returning 'nodate' might be okay if completed/trash are handled by filters
        return 'nodate';
    }

    if (task.dueDate != null) {
        const dueDateObj = safeParseDate(task.dueDate);
        if (!dueDateObj || !isValid(dueDateObj)) return 'nodate'; // Invalid date is treated as no date

        const today = startOfDay(new Date());
        const taskDay = startOfDay(dueDateObj);

        if (isBefore(taskDay, today)) return 'overdue'; // Before today
        if (isSameDay(taskDay, today)) return 'today'; // Is today

        // Check for next 7 days (exclusive of today, inclusive of 7 days from now)
        const sevenDaysFromTodayEnd = endOfDay(addDays(today, 6)); // End of the 7th day from today
        if (!isBefore(taskDay, addDays(today, 1)) && !isAfter(taskDay, sevenDaysFromTodayEnd)) {
            return 'next7days';
        }

        // If none of the above, it's later
        return 'later';
    }
    // No due date
    return 'nodate';
};

// Sample Data (Adjusted slightly for clarity)
const initialTasksData: Omit<Task, 'groupCategory'>[] = [
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
].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // Sort initial raw data

// Initialize tasks with calculated groupCategory and ensure sorted order
const initialTasks: Task[] = initialTasksData
    .map(task => ({
        ...task,
        // Calculate initial category based on current state
        groupCategory: getTaskGroupCategory(task),
    }))
    // Ensure final initial array is sorted by order, then creation date as fallback
    .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));

// Atom for storing the raw task list with persistence
const baseTasksAtom = atomWithStorage<Task[]>('tasks_v2', initialTasks, undefined, { getOnInit: true }); // Use new key if structure changed

// Main tasks atom with derived category calculation and sorting on write
export const tasksAtom = atom(
    (get) => get(baseTasksAtom), // Read: return the stored tasks
    (get, set, update: Task[] | ((prev: Task[]) => Task[]) | typeof RESET) => {
        if (update === RESET) {
            set(baseTasksAtom, initialTasks); // Reset to initial state
            return;
        }

        const previousTasks = get(baseTasksAtom); // Get current state for comparison if needed
        // Determine the next raw state (before processing)
        const nextTasksRaw = typeof update === 'function' ? update(previousTasks) : update;

        // Process tasks: Calculate groupCategory and sort
        const nextTasksProcessed = nextTasksRaw
            .map(task => {
                // Recalculate category when relevant fields change
                const originalTask = previousTasks.find(t => t.id === task.id);
                const needsCategoryUpdate = !originalTask ||
                    originalTask.dueDate !== task.dueDate ||
                    originalTask.completed !== task.completed ||
                    originalTask.list !== task.list || // List change (e.g., to Trash) affects category
                    !task.groupCategory; // Ensure category exists

                return {
                    ...task,
                    groupCategory: needsCategoryUpdate ? getTaskGroupCategory(task) : task.groupCategory,
                };
            })
            // IMPORTANT: Sort the entire list by order primarily, then creation date
            .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));

        // Write the processed and sorted list back to storage
        set(baseTasksAtom, nextTasksProcessed);
    }
);

// --- User Lists ---
const initialUserLists = ['Work', 'Planning', 'Dev', 'Personal']; // Default lists
// Atom for user-defined list names (excluding Inbox) with persistence
export const userDefinedListsAtom = atomWithStorage<string[]>('userDefinedLists_v1', initialUserLists, undefined, { getOnInit: true });

// --- UI State Atoms ---
export const selectedTaskIdAtom = atom<string | null>(null); // ID of the currently selected task
export const isSettingsOpenAtom = atom<boolean>(false); // Settings modal visibility
export const settingsSelectedTabAtom = atom<SettingsTab>('account'); // Active tab in settings
export const isAddListModalOpenAtom = atom<boolean>(false); // Add List modal visibility
export const currentFilterAtom = atom<TaskFilter>('all'); // Currently active filter/view
export const searchTermAtom = atom<string>(''); // Current search term

// --- Derived Atoms (Optimized where possible) ---

// Selected Task Atom: Efficiently finds the selected task
// Re-computes only when selectedTaskId changes or the tasksAtom updates.
export const selectedTaskAtom = atom<Task | null>((get) => {
    const selectedId = get(selectedTaskIdAtom);
    if (!selectedId) return null;
    const tasks = get(tasksAtom); // Depends on the master tasks list
    // Find is relatively cheap here compared to re-filtering everything
    return tasks.find(task => task.id === selectedId) ?? null;
});


// User List Names Atom: Combines predefined, user-defined, and task-derived lists
// Uses selectAtom for optimization - recalculates only when tasks or userLists change relevantly.
export const userListNamesAtom = selectAtom(
    // Depend on tasks and userDefinedLists
    atom(get => ({ tasks: get(tasksAtom), userLists: get(userDefinedListsAtom) })),
    // Selector function
    (data) => {
        const listsFromTasks = new Set<string>();
        // Get all unique list names from non-trashed tasks
        data.tasks.forEach(task => { if (task.list && task.list !== 'Trash') listsFromTasks.add(task.list) });
        // Combine Inbox, user-defined lists, and lists found in tasks
        const combinedLists = new Set(['Inbox', ...data.userLists, ...Array.from(listsFromTasks)]);
        // Sort alphabetically, keeping Inbox first
        return Array.from(combinedLists).sort((a, b) => {
            if (a === 'Inbox') return -1; if (b === 'Inbox') return 1;
            return a.localeCompare(b);
        });
    },
    // Custom equality check for the resulting array (prevents unnecessary updates)
    (a, b) => JSON.stringify(a) === JSON.stringify(b)
);


// User Tag Names Atom: Extracts unique tags from tasks
// Optimized with selectAtom.
export const userTagNamesAtom = selectAtom(
    tasksAtom, // Depends only on tasksAtom
    (tasks) => {
        const tags = new Set<string>();
        // Get unique tags from non-trashed tasks
        tasks.filter(t => t.list !== 'Trash').forEach(task => { task.tags?.forEach(tag => tags.add(tag)) });
        // Sort tags alphabetically
        return Array.from(tags).sort((a, b) => a.localeCompare(b));
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep equality check
);


// Filtered Tasks Atom: Filters tasks based on currentFilterAtom
// This needs to recompute whenever tasks or the filter change.
export const filteredTasksAtom = atom<Task[]>((get) => {
    const tasks = get(tasksAtom); // Dependency: Master task list
    const filter = get(currentFilterAtom); // Dependency: Current filter setting
    let filtered: Task[];

    // console.log(`Filtering tasks for filter: ${filter}`); // Debugging

    // Filter logic based on the 'filter' value
    const activeTasks = tasks.filter(task => task.list !== 'Trash'); // Tasks not in Trash
    const trashedTasks = tasks.filter(task => task.list === 'Trash'); // Tasks in Trash

    switch (filter) {
        case 'all':
            // 'All' view shows non-completed, non-trashed tasks
            // Sorting is handled by groupedAllTasksAtom for this view if not searching
            filtered = activeTasks.filter(task => !task.completed);
            break;
        case 'today':
            // Today's non-completed tasks
            filtered = activeTasks.filter(task => {
                if (task.completed || !task.dueDate) return false;
                const date = safeParseDate(task.dueDate);
                return date && isValid(date) && isToday(date);
            });
            break;
        case 'next7days':
            // Non-completed tasks due in the next 7 days (inclusive of today, up to 6 days from now)
            filtered = activeTasks.filter(task => {
                if (task.completed || !task.dueDate) return false;
                const date = safeParseDate(task.dueDate);
                // Use isWithinNext7Days which includes today based on dateUtils logic
                return date && isValid(date) && !isOverdue(date) && isWithinNext7Days(date);
            });
            break;
        case 'completed':
            // Completed tasks, sorted by update time (most recent first)
            filtered = activeTasks.filter(task => task.completed).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            break;
        case 'trash':
            // Trashed tasks, sorted by update time (most recent first)
            filtered = trashedTasks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            break;
        default:
            if (filter.startsWith('list-')) {
                const listName = filter.substring(5);
                // Non-completed tasks in a specific list
                filtered = activeTasks.filter(task => !task.completed && task.list === listName);
            } else if (filter.startsWith('tag-')) {
                const tagName = filter.substring(4);
                // Non-completed tasks with a specific tag
                filtered = activeTasks.filter(task => !task.completed && task.tags?.includes(tagName));
            } else {
                // Fallback or handle unrecognized filters
                console.warn(`Unrecognized filter: ${filter}. Falling back to 'all'.`);
                filtered = activeTasks.filter(task => !task.completed);
            }
            break;
    }

    // Return the filtered list. Sorting by `order` is implicitly handled because
    // the source `tasksAtom` is always kept sorted by order.
    // Completed/Trash views have their own specific sorting.
    return filtered;
});


// Search Filtered Tasks Atom: Applies search term ON TOP of the current filter results
// Recomputes when search term or filteredTasksAtom change.
export const searchFilteredTasksAtom = atom<Task[]>((get) => {
    const tasks = get(filteredTasksAtom); // Dependency: Results from the current filter
    const search = get(searchTermAtom).trim().toLowerCase(); // Dependency: Search term

    // If no search term, return the already filtered tasks
    if (!search) {
        return tasks;
    }

    const searchWords = search.split(' ').filter(Boolean); // Split search into words

    // Filter the 'filteredTasks' further based on search words
    return tasks.filter(task =>
        // Check if ALL search words are present in title, content, or tags
        searchWords.every(word =>
            task.title.toLowerCase().includes(word) ||
            (task.content && task.content.toLowerCase().includes(word)) ||
            (task.tags && task.tags.some(tag => tag.toLowerCase().includes(word)))
        )
    );
    // Sorting order is inherited from filteredTasksAtom
});


// Task Counts Atom (Memoized)
// Calculates counts for different categories based on the full task list.
export const taskCountsAtom = selectAtom(
    // Depend on tasks, user lists, user tags
    atom(get => ({
        tasks: get(tasksAtom),
        allUserListNames: get(userListNamesAtom),
        allUserTagNames: get(userTagNamesAtom)
    })),
    // Selector function
    (data) => {
        // console.log('Recalculating task counts'); // Debugging
        const { tasks, allUserListNames, allUserTagNames } = data;

        const activeTasks = tasks.filter(task => task.list !== 'Trash'); // Exclude trash from active counts
        const counts = {
            all: 0, // Count of non-completed, active tasks
            today: 0,
            next7days: 0,
            completed: activeTasks.filter(t => t.completed).length, // Count of completed active tasks
            trash: tasks.length - activeTasks.length, // Count of trashed tasks
            // Initialize list counts
            lists: Object.fromEntries(allUserListNames.map(name => [name, 0])),
            // Initialize tag counts
            tags: Object.fromEntries(allUserTagNames.map(name => [name, 0])),
        };

        // Iterate over active, non-completed tasks to increment counts
        activeTasks.filter(t => !t.completed).forEach(task => {
            counts.all++; // Increment total active count

            // Increment date-based counts
            if (task.dueDate != null) {
                const date = safeParseDate(task.dueDate);
                if (date && isValid(date)) {
                    if (isToday(date)) counts.today++;
                    // Use the same logic as filteredTasksAtom for next7days
                    if (!isOverdue(date) && isWithinNext7Days(date)) {
                        counts.next7days++;
                    }
                }
            }

            // Increment list count if list exists in counts object
            if (task.list && Object.prototype.hasOwnProperty.call(counts.lists, task.list)) {
                counts.lists[task.list]++;
            }

            // Increment tag counts
            task.tags?.forEach(tag => {
                if (Object.prototype.hasOwnProperty.call(counts.tags, tag)) {
                    counts.tags[tag]++;
                }
            });
        });
        return counts;
    },
    // Deep equality check for the counts object
    (a, b) => JSON.stringify(a) === JSON.stringify(b)
);


// Grouped Tasks for 'All' view Atom (Memoized)
// Groups non-completed, non-trashed tasks by category.
export const groupedAllTasksAtom = atom((get): Record<TaskGroupCategory, Task[]> => {
    // Get active, non-completed tasks
    const tasksToGroup = get(tasksAtom).filter(task => task.list !== 'Trash' && !task.completed);

    // Initialize groups
    const groups: Record<TaskGroupCategory, Task[]> = {
        overdue: [], today: [], next7days: [], later: [], nodate: []
    };

    // Group tasks based on their calculated groupCategory
    tasksToGroup.forEach(task => {
        // Use the category already calculated and stored in the task object
        const category = task.groupCategory;
        if (groups[category]) {
            groups[category].push(task);
        } else {
            // Fallback: should ideally not happen if category calculation is robust
            console.warn(`Task ${task.id} has unexpected category: ${category}`);
            groups.nodate.push(task);
        }
    });

    // IMPORTANT: Sorting within each group is already handled because the source
    // `tasksAtom` is always kept sorted by order. If tasksAtom wasn't sorted,
    // you would need to sort each group here:
    for (const key in groups) {
        groups[key as TaskGroupCategory].sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));
    }

    return groups;
});