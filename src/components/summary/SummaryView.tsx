// src/components/summary/SummaryView.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Popover from '@radix-ui/react-popover';
import {
    currentDisplayedSummaryAtom,
    currentSummaryFilterKeyAtom,
    currentSummaryIndexAtom,
    filteredTasksForSummaryAtom,
    isGeneratingSummaryAtom,
    referencedTasksForSummaryAtom,
    relevantStoredSummariesAtom,
    storedSummariesAtom,
    StoredSummary,
    summaryListFilterAtom,
    summaryPeriodFilterAtom,
    SummaryPeriodOption,
    summarySelectedTaskIdsAtom,
    tasksAtom,
    userListNamesAtom
} from '@/store/atoms';
import Button from '../common/Button';
import Icon from '../common/Icon';
import CodeMirrorEditor, {CodeMirrorEditorRef} from '../common/CodeMirrorEditor';
import {Task} from '@/types';
import {
    format,
    formatDateTime,
    formatRelativeDate,
    isBefore,
    isSameDay,
    isValid,
    safeParseDate,
    startOfDay
} from '@/utils/dateUtils';
import {twMerge} from 'tailwind-merge';
import SelectionCheckboxRadix from '../common/SelectionCheckbox';
import useDebounce from '@/hooks/useDebounce';
import {CustomDateRangePickerContent} from '../common/CustomDateRangePickerPopover';
import SummaryHistoryModal from './SummaryHistoryModal';

// Placeholder AI Function (keep as is)
async function generateAiSummary(tasks: Task[]): Promise<string> {
    console.log("Generating AI summary for tasks:", tasks.map(t => t.title));
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    if (tasks.length === 0) {
        return "No tasks selected or found for summary generation.";
    }

    const completedCount = tasks.filter(t => t.completed).length;
    const inProgressCount = tasks.length - completedCount;
    const lists = Array.from(new Set(tasks.map(t => t.list))).join(', ');

    let summary = `Generated summary for ${tasks.length} task(s) from list(s): ${lists}. \n`;
    summary += `- ${completedCount} completed, ${inProgressCount} in progress.\n`;

    if (inProgressCount > 0) {
        const highPriority = tasks.find(t => !t.completed && t.priority === 1);
        const overdue = tasks.find(t => !t.completed && t.dueDate && isBefore(startOfDay(safeParseDate(t.dueDate)!), startOfDay(new Date())));

        summary += "- Focus areas: ";
        if (highPriority) {
            summary += `High priority task **"${highPriority.title}"** needs attention. `;
        } else if (overdue) {
            summary += `Overdue task **"${overdue.title}"** requires action. `;
        } else {
            // Find the first non-completed task as an example focus
            const firstInProgress = tasks.find(t => !t.completed);
            summary += `Continue progress on **"${firstInProgress?.title ?? 'current tasks'}"**. `;
        }
    } else {
        summary += "- All selected tasks are complete. Well done!";
    }

    summary += "\n\n*This is a simulated AI summary.*";
    return summary.trim();
}


// --- Main Summary View Component ---
const SummaryView: React.FC = () => {
    const [period, setPeriod] = useAtom(summaryPeriodFilterAtom);
    const [listFilter, setListFilter] = useAtom(summaryListFilterAtom);
    const availableLists = useAtomValue(userListNamesAtom);
    const filteredTasks = useAtomValue(filteredTasksForSummaryAtom);
    const [selectedTaskIds, setSelectedTaskIds] = useAtom(summarySelectedTaskIdsAtom);
    const relevantSummaries = useAtomValue(relevantStoredSummariesAtom);
    const allStoredSummaries = useAtomValue(storedSummariesAtom);
    const [currentIndex, setCurrentIndex] = useAtom(currentSummaryIndexAtom);
    const currentSummary = useAtomValue(currentDisplayedSummaryAtom);
    const setStoredSummaries = useSetAtom(storedSummariesAtom);
    const filterKey = useAtomValue(currentSummaryFilterKeyAtom);
    const [isGenerating, setIsGenerating] = useAtom(isGeneratingSummaryAtom);
    const referencedTasks = useAtomValue(referencedTasksForSummaryAtom);
    const allTasks = useAtomValue(tasksAtom);

    const [summaryEditorContent, setSummaryEditorContent] = useState('');
    const debouncedEditorContent = useDebounce(summaryEditorContent, 700);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const hasUnsavedChangesRef = useRef(false);
    const isInternalEditorUpdate = useRef(false);

    // State for popovers and modals
    const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
    const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
    const [isRefTasksDropdownOpen, setIsRefTasksDropdownOpen] = useState(false);


    // --- Effects ---
    useEffect(() => {
        // Reset selections when filters change
        setSelectedTaskIds(new Set());
        setCurrentIndex(0); // Go back to the newest summary for the new filter
        hasUnsavedChangesRef.current = false; // Discard unsaved changes on filter change
    }, [period, listFilter, setCurrentIndex, setSelectedTaskIds]);

    useEffect(() => {
        // Load content when the current summary changes (due to index or filter change)
        const summaryToLoad = relevantSummaries[currentIndex];
        const summaryText = summaryToLoad?.summaryText ?? '';
        const currentEditorText = editorRef.current?.getView()?.state.doc.toString();

        // Only update if the text actually differs, prevents unnecessary updates
        if (summaryText !== currentEditorText) {
            isInternalEditorUpdate.current = true; // Mark as internal update
            setSummaryEditorContent(summaryText);
            hasUnsavedChangesRef.current = false; // Reset unsaved flag when loading new content
        }
        // Make sure dropdowns close if summary changes
        setIsRefTasksDropdownOpen(false);
    }, [currentIndex, relevantSummaries]); // Depend only on index and the relevant summaries list

    useEffect(() => {
        // Debounced save for editor changes
        if (hasUnsavedChangesRef.current && currentSummary?.id) {
            const summaryIdToUpdate = currentSummary.id;
            // console.log(`Debounced save triggered for summary ${summaryIdToUpdate}`);
            setStoredSummaries(prev => prev.map(s => s.id === summaryIdToUpdate ? {
                ...s,
                summaryText: debouncedEditorContent,
                updatedAt: Date.now()
            } : s));
            hasUnsavedChangesRef.current = false; // Reset flag after saving
        }
    }, [debouncedEditorContent, currentSummary?.id, setStoredSummaries]);


    // --- Callbacks ---
    const forceSaveCurrentSummary = useCallback(() => {
        if (hasUnsavedChangesRef.current && currentSummary?.id) {
            const id = currentSummary.id;
            // console.log(`Force saving summary ${id}`);
            setStoredSummaries(p => p.map(s => s.id === id ? {
                ...s,
                summaryText: summaryEditorContent, // Use direct state, not debounced
                updatedAt: Date.now()
            } : s));
            hasUnsavedChangesRef.current = false; // Reset flag after saving
        }
    }, [currentSummary?.id, setStoredSummaries, summaryEditorContent]);

    // Combined handler for period dropdown changes
    const handlePeriodValueChange = useCallback((selectedValue: string) => {
        forceSaveCurrentSummary(); // Save before changing filter
        if (selectedValue === 'custom') {
            // Use setTimeout to ensure dropdown closes before popover opens
            setTimeout(() => {
                setIsRangePickerOpen(true);
            }, 0);
        } else {
            setPeriod(selectedValue as SummaryPeriodOption);
            setIsRangePickerOpen(false); // Ensure picker is closed if selecting predefined
        }
    }, [setPeriod, setIsRangePickerOpen, forceSaveCurrentSummary]); // Added forceSave


    const handleListChange = useCallback((newList: string) => {
        forceSaveCurrentSummary(); // Save before changing filter
        setListFilter(newList);
    }, [setListFilter, forceSaveCurrentSummary]); // Added forceSave

    // Task selection handler used by TaskItemMiniInline
    const handleTaskSelectionChange = useCallback((taskId: string, isSelected: boolean | 'indeterminate') => {
        // Parent component handles the actual Set update based on the boolean state
        if (typeof isSelected === 'boolean') {
            setSelectedTaskIds(prev => {
                const newSet = new Set(prev);
                if (isSelected) newSet.add(taskId); else newSet.delete(taskId);
                return newSet;
            });
        }
        // Ignore clicks on the 'indeterminate' state itself if that case arises
    }, [setSelectedTaskIds]);

    // Handler for the "Select All" checkbox
    const handleSelectAllTasks = useCallback(() => {
        // Select only non-trashed tasks
        const nonTrashedTaskIds = filteredTasks.filter(t => t.list !== 'Trash').map(t => t.id);
        setSelectedTaskIds(new Set(nonTrashedTaskIds));
    }, [filteredTasks, setSelectedTaskIds]);

    const handleDeselectAllTasks = useCallback(() => {
        setSelectedTaskIds(new Set());
    }, [setSelectedTaskIds]);

    const handleSelectAllToggle = useCallback((isChecked: boolean | 'indeterminate') => {
        // When clicking the select-all checkbox, treat indeterminate as unchecking all
        if (isChecked === true) {
            handleSelectAllTasks();
        } else { // Handles false and 'indeterminate' clicks
            handleDeselectAllTasks();
        }
    }, [handleSelectAllTasks, handleDeselectAllTasks]);


    const handleGenerateClick = useCallback(async () => {
        forceSaveCurrentSummary(); // Save any pending edits before generating
        setIsGenerating(true);
        // Ensure only non-trashed selected tasks are included
        const tasksToSummarize = allTasks.filter(t => selectedTaskIds.has(t.id) && t.list !== 'Trash');
        try {
            const newSummaryText = await generateAiSummary(tasksToSummarize);
            const [periodKey, listKey] = filterKey.split('__');
            const newSummaryEntry: StoredSummary = {
                id: `summary-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                createdAt: Date.now(),
                periodKey,
                listKey,
                taskIds: tasksToSummarize.map(t => t.id),
                summaryText: newSummaryText,
            };
            // Update stored summaries, putting the new one first
            setStoredSummaries(prev => [newSummaryEntry, ...prev]);
            // Set index to 0 to view the newly generated summary
            setCurrentIndex(0);
            // The useEffect listening to [currentIndex, relevantSummaries] will handle loading the editor
            hasUnsavedChangesRef.current = false; // New summary loaded, no unsaved changes
        } catch (error) {
            console.error("Error generating summary:", error);
            // Optionally, show an error message to the user
            isInternalEditorUpdate.current = true;
            setSummaryEditorContent(`Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
            hasUnsavedChangesRef.current = false;
        } finally {
            setIsGenerating(false);
        }
        // Optional: Deselect tasks after generation based on desired UX.
        // handleDeselectAllTasks();
    }, [selectedTaskIds, allTasks, filterKey, setIsGenerating, setStoredSummaries, setCurrentIndex, forceSaveCurrentSummary]); // Added forceSave

    const handleEditorChange = useCallback((newValue: string) => {
        // Only update local state and mark unsaved if it's not an internal update
        if (!isInternalEditorUpdate.current) {
            setSummaryEditorContent(newValue);
            hasUnsavedChangesRef.current = true;
        }
        // Reset the internal update flag after the first change event
        isInternalEditorUpdate.current = false;
    }, []);

    const handlePrevSummary = useCallback(() => {
        forceSaveCurrentSummary();
        setCurrentIndex(prev => Math.min(prev + 1, relevantSummaries.length - 1));
    }, [setCurrentIndex, relevantSummaries.length, forceSaveCurrentSummary]);

    const handleNextSummary = useCallback(() => {
        forceSaveCurrentSummary();
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, [setCurrentIndex, forceSaveCurrentSummary]);

    // Callback for the Date Range Picker Popover Content
    const handleRangeApply = useCallback((startDate: Date, endDate: Date) => {
        forceSaveCurrentSummary(); // Save before applying range
        setPeriod({start: startDate.getTime(), end: endDate.getTime()});
        setIsRangePickerOpen(false); // Close the popover after applying
    }, [setPeriod, setIsRangePickerOpen, forceSaveCurrentSummary]); // Added forceSave

    const openHistoryModal = useCallback(() => {
        forceSaveCurrentSummary(); // Save before opening modal
        setIsHistoryModalOpen(true);
    }, [forceSaveCurrentSummary]);
    const closeHistoryModal = useCallback(() => setIsHistoryModalOpen(false), []);
    const closeRangePicker = useCallback(() => setIsRangePickerOpen(false), []);

    // --- Memoized Values ---
    const periodOptions = useMemo((): { label: string, value: SummaryPeriodOption | 'custom' }[] => [
        {label: 'Today', value: 'today'}, {label: 'Yesterday', value: 'yesterday'},
        {label: 'This Week', value: 'thisWeek'}, {label: 'Last Week', value: 'lastWeek'},
        {label: 'This Month', value: 'thisMonth'}, {label: 'Last Month', value: 'lastMonth'},
        {label: 'Custom Range...', value: 'custom'},
    ], []);

    const listOptions = useMemo(() => [
        {label: 'All Lists', value: 'all'},
        ...availableLists.filter(name => name !== 'Trash').map(listName => ({label: listName, value: listName})) // Exclude Trash
    ], [availableLists]);

    const selectedPeriodLabel = useMemo(() => {
        const option = periodOptions.find(p => typeof period === 'string' && p.value === period);
        if (option) return option.label;
        if (typeof period === 'object') {
            const startStr = format(period.start, 'MMM d');
            const endStr = format(period.end, 'MMM d');
            const startYear = format(period.start, 'yyyy');
            const endYear = format(period.end, 'yyyy');
            const currentYear = format(new Date(), 'yyyy');

            if (isSameDay(period.start, period.end)) {
                return startYear !== currentYear ? format(period.start, 'MMM d, yyyy') : startStr;
            }

            if (startYear !== endYear) {
                return `${format(period.start, 'MMM d, yyyy')} - ${format(period.end, 'MMM d, yyyy')}`;
            } else if (startYear !== currentYear) {
                return `${startStr} - ${endStr}, ${startYear}`;
            } else {
                return `${startStr} - ${endStr}`;
            }
        }
        return 'Select Period';
    }, [period, periodOptions]);

    const selectedListLabel = useMemo(() => {
        const option = listOptions.find(l => l.value === listFilter);
        return option ? option.label : 'Select List'; // Default text if filter is somehow invalid
    }, [listFilter, listOptions]);

    // Generate button is disabled if generating or no non-trashed tasks are selected
    const isGenerateDisabled = useMemo(() => {
        if (isGenerating) return true;
        if (selectedTaskIds.size === 0) return true;
        // Check if *any* selected task is not in Trash
        const selectedTasks = allTasks.filter(t => selectedTaskIds.has(t.id));
        return !selectedTasks.some(t => t.list !== 'Trash');
    }, [isGenerating, selectedTaskIds, allTasks]);

    const tasksUsedCount = useMemo(() => currentSummary?.taskIds.length ?? 0, [currentSummary]);
    const summaryTimestamp = useMemo(() => currentSummary ? formatDateTime(currentSummary.createdAt) : null, [currentSummary]);

    // Calculate selectAllState considering only non-trashed tasks
    const selectableTasks = useMemo(() => filteredTasks.filter(t => t.list !== 'Trash'), [filteredTasks]);
    const allSelectableTasksSelected = useMemo(() => selectableTasks.length > 0 && selectableTasks.every(task => selectedTaskIds.has(task.id)), [selectableTasks, selectedTaskIds]);
    const someSelectableTasksSelected = useMemo(() => selectableTasks.some(task => selectedTaskIds.has(task.id)) && !allSelectableTasksSelected, [selectedTaskIds, allSelectableTasksSelected, selectableTasks]);

    const selectAllState = useMemo(() => {
        if (allSelectableTasksSelected) return true;
        if (someSelectableTasksSelected) return 'indeterminate';
        return false;
    }, [allSelectableTasksSelected, someSelectableTasksSelected]);


    const totalRelevantSummaries = useMemo(() => relevantSummaries.length, [relevantSummaries]);
    const displayedIndex = useMemo(() => totalRelevantSummaries > 0 ? (currentIndex + 1) : 0, [totalRelevantSummaries, currentIndex]);

    const dropdownContentClasses = "min-w-[160px] z-50 bg-glass-100 dark:bg-neutral-800/95 backdrop-blur-xl rounded-lg shadow-strong border border-black/10 dark:border-white/10 p-1 data-[state=open]:animate-slideUpAndFade data-[state=closed]:animate-slideDownAndFade";

    // --- Render Functions ---
    const renderReferencedTasksDropdown = () => (
        <div
            className="bg-glass-100/95 dark:bg-neutral-800/90 backdrop-blur-xl rounded-lg shadow-xl border border-black/10 dark:border-white/10 max-h-72 w-80 styled-scrollbar overflow-y-auto p-1.5">
            <div
                className="px-1.5 py-1 text-xs font-semibold text-muted-foreground dark:text-neutral-400 border-b border-black/10 dark:border-white/10 sticky top-0 bg-glass-100/80 dark:bg-neutral-800/80 backdrop-blur-md z-10">
                Referenced Tasks ({referencedTasks.length})
            </div>
            {referencedTasks.length > 0 ? (
                <ul className="pt-1 space-y-0.5">
                    {referencedTasks.map(task => (
                        <li key={task.id}
                            className="flex items-start p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-100 ease-apple"
                            title={task.title}>
                            <div className={twMerge(
                                "flex-shrink-0 w-4 h-4 rounded-full border mt-[1px] mr-2.5 flex items-center justify-center", // Increased margin
                                task.completed
                                    ? "bg-primary/90 border-primary/90"
                                    : task.completionPercentage && task.completionPercentage > 0
                                        ? "border-primary/70 dark:border-primary/60" // Indicate progress with border
                                        : "bg-white/40 dark:bg-neutral-700/30 border-gray-400/80 dark:border-neutral-500" // Default unchecked
                            )}>
                                {task.completed && <Icon name="check" size={9} className="text-white" strokeWidth={3}/>}
                                {/* Show dot for in-progress */}
                                {task.completionPercentage && task.completionPercentage > 0 && !task.completed && (
                                    <div className="w-1.5 h-1.5 bg-primary/80 dark:bg-primary/70 rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className={twMerge(
                                    "text-[12.5px] font-medium text-gray-800 dark:text-neutral-100 leading-snug truncate",
                                    task.completed && "line-through text-muted-foreground dark:text-neutral-500"
                                )}>
                                    {task.title || "Untitled"}
                                </p>
                                <div
                                    className="flex items-center space-x-2 mt-0.5 text-[10.5px] text-muted-foreground dark:text-neutral-400">
                                    {task.completionPercentage && !task.completed && (
                                        <span
                                            className="font-medium text-primary/90 dark:text-primary-light/80">[{task.completionPercentage}%]</span>
                                    )}
                                    {task.dueDate && isValid(safeParseDate(task.dueDate)) && (
                                        <span className="flex items-center whitespace-nowrap">
                                            <Icon name="calendar" size={10} className="mr-0.5 opacity-60"/>
                                            {formatRelativeDate(task.dueDate)}
                                        </span>
                                    )}
                                    {task.list && task.list !== 'Inbox' && (
                                        <span
                                            className="flex items-center bg-black/10 dark:bg-white/10 px-1 py-0 rounded-[3px] max-w-[70px] truncate"
                                            title={task.list}>
                                            <Icon name={task.list === 'Trash' ? 'trash' : 'list'} size={9}
                                                  className="mr-0.5 opacity-60 flex-shrink-0"/>
                                            <span className="truncate">{task.list}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-muted-foreground dark:text-neutral-500 italic p-4 text-center">No referenced
                    tasks found.</p>
            )}
        </div>
    );


    // --- UPDATED Task Item Mini Component (Inline) ---
    const TaskItemMiniInline: React.FC<{
        task: Task;
        isSelected: boolean;
        onSelectionChange: (id: string, selected: boolean | 'indeterminate') => void;
    }> = React.memo(({task, isSelected, onSelectionChange}) => {
        const parsedDueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
        const overdue = useMemo(() => parsedDueDate != null && isValid(parsedDueDate) && isBefore(startOfDay(parsedDueDate), startOfDay(new Date())) && !task.completed, [parsedDueDate, task.completed]);
        const uniqueId = `summary-task-${task.id}`;
        const isDisabled = task.list === 'Trash'; // Disable selection for trashed tasks

        // Handler for the label click
        const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
            // Prevent default label behavior if the click is directly on the checkbox input itself
            if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                return;
            }
            // If not disabled, toggle the selection state
            if (!isDisabled) {
                onSelectionChange(task.id, !isSelected);
            }
        };


        return (
            // Use a label to make the whole item clickable
            // Clicking the label will toggle the associated checkbox input
            <label
                htmlFor={uniqueId}
                className={twMerge(
                    "flex items-center p-1.5 rounded-md transition-colors duration-150 ease-apple cursor-pointer", // Use cursor-pointer
                    isSelected && !isDisabled ? "bg-primary/15 dark:bg-primary/25" : "hover:bg-black/10 dark:hover:bg-white/5",
                    isDisabled && "opacity-60 cursor-not-allowed" // Apply disabled styles
                )}
                onClick={handleLabelClick} // Use onClick for the label
            >
                <SelectionCheckboxRadix
                    id={uniqueId}
                    checked={isSelected}
                    onChange={(checkedState) => onSelectionChange(task.id, checkedState)} // Pass state directly
                    aria-label={`Select task: ${task.title || 'Untitled'}`}
                    className="mr-2.5 flex-shrink-0 pointer-events-none" // Make checkbox visually part of label, but label handles click
                    size={16}
                    disabled={isDisabled}
                />
                <div className="flex-1 overflow-hidden">
                    {/* Task Title */}
                    <span className={twMerge(
                        "text-sm text-gray-800 dark:text-neutral-100 block truncate",
                        task.completed && !isDisabled && "line-through text-muted-foreground dark:text-neutral-500",
                        isDisabled && "text-muted-foreground dark:text-neutral-500"
                    )}>
                        {task.title || <span className="italic">Untitled Task</span>}
                    </span>
                    {/* Task Metadata */}
                    <div
                        className="text-xs text-muted-foreground dark:text-neutral-400 flex items-center space-x-2 mt-0.5 flex-wrap gap-y-0.5">
                        {/* Progress Percentage */}
                        {task.completionPercentage && task.completionPercentage < 100 && !isDisabled && (
                            <span
                                className="text-primary/90 dark:text-primary-light/80 font-medium">[{task.completionPercentage}%]</span>
                        )}
                        {/* Due Date */}
                        {parsedDueDate && isValid(parsedDueDate) && (
                            <span className={twMerge(
                                "flex items-center whitespace-nowrap",
                                overdue && !task.completed && !isDisabled && "text-red-600 dark:text-red-400 font-medium",
                                task.completed && !isDisabled && "line-through"
                            )}>
                                <Icon name="calendar" size={11} className="mr-0.5 opacity-70"/>
                                {formatRelativeDate(parsedDueDate)}
                            </span>
                        )}
                        {/* List Name */}
                        {task.list && task.list !== 'Inbox' && (
                            <span
                                className="flex items-center bg-black/10 dark:bg-white/10 px-1 rounded text-[10px] max-w-[70px] truncate"
                                title={task.list}>
                                <Icon name={task.list === 'Trash' ? 'trash' : 'list'} size={10}
                                      className="mr-0.5 opacity-70"/>
                                <span className="truncate">{task.list}</span>
                            </span>
                        )}
                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <span className="flex items-center space-x-1">
                                {task.tags.slice(0, 1).map(tag => (
                                    <span key={tag}
                                          className="bg-black/10 dark:bg-white/10 px-1 rounded text-[10px] max-w-[60px] truncate">#{tag}</span>
                                ))}
                                {task.tags.length > 1 && <span
                                    className="text-[10px] text-muted-foreground/80 dark:text-neutral-500">+{task.tags.length - 1}</span>}
                            </span>
                        )}
                    </div>
                </div>
            </label>
        );
    });
    TaskItemMiniInline.displayName = 'TaskItemMiniInline';


    return (
        <div className="h-full flex flex-col bg-glass-alt-100 dark:bg-neutral-900 overflow-hidden">
            {/* Page Header */}
            <div
                className="px-3 md:px-4 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center flex-shrink-0 bg-glass-100 dark:bg-neutral-800/70 backdrop-blur-lg z-10 h-12 shadow-sm">
                {/* Left Section: Title + History */}
                <div className="w-1/3 flex items-center space-x-2">
                    <h1 className="text-base font-semibold text-gray-800 dark:text-neutral-100 truncate">AI Summary</h1>
                    <Tooltip.Provider>
                        <Tooltip.Root delayDuration={200}>
                            <Tooltip.Trigger asChild>
                                <Button variant="ghost" size="icon" icon="history" onClick={openHistoryModal}
                                        className="w-7 h-7 text-muted-foreground dark:text-neutral-400 hover:bg-black/15 dark:hover:bg-white/10"
                                        aria-label="View Summary History"/>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content
                                    className="text-xs bg-black/80 dark:bg-neutral-900/90 text-white dark:text-neutral-100 px-2 py-1 rounded shadow-md select-none z-[70]"
                                    sideOffset={4}>
                                    View All Generated Summaries
                                    <Tooltip.Arrow className="fill-black/80 dark:fill-neutral-900/90"/>
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </div>

                {/* Center Section: Filters */}
                <div className="flex-1 flex justify-center items-center space-x-2">
                    {/* Popover Root for the Date Range Picker */}
                    <Popover.Root modal={true} open={isRangePickerOpen} onOpenChange={setIsRangePickerOpen}>
                        <DropdownMenu.Root open={isPeriodDropdownOpen} onOpenChange={setIsPeriodDropdownOpen}>
                            {/* Anchor the Popover to the Dropdown Trigger */}
                            <Popover.Anchor asChild>
                                <DropdownMenu.Trigger asChild>
                                    <Button variant="ghost" size="sm"
                                            className="text-sm h-8 px-2 text-gray-700 dark:text-neutral-200 font-medium hover:bg-black/15 dark:hover:bg-white/10 min-w-[120px] tabular-nums">
                                        <Icon name="calendar-days" size={14} className="mr-1.5 opacity-70"/>
                                        {selectedPeriodLabel}
                                        <Icon name="chevron-down" size={14} className="ml-auto opacity-60 pl-1"/>
                                    </Button>
                                </DropdownMenu.Trigger>
                            </Popover.Anchor>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content className={dropdownContentClasses} sideOffset={5} align="center"
                                                      onCloseAutoFocus={e => e.preventDefault()}>
                                    <DropdownMenu.RadioGroup
                                        value={typeof period === 'string' ? period : 'custom'}
                                        onValueChange={handlePeriodValueChange}
                                    >
                                        {periodOptions.map(p => {
                                            // Determine value for Radix item, 'custom' for the object type
                                            const itemValue = typeof p.value === 'string' ? p.value : 'custom';
                                            const itemKey = p.label; // Use label as key since value can be object or string
                                            return (
                                                <DropdownMenu.RadioItem
                                                    key={itemKey}
                                                    value={itemValue} // Use the string representation for value
                                                    className={twMerge(
                                                        "relative flex cursor-pointer select-none items-center rounded-[3px] px-2.5 py-1 text-sm outline-none transition-colors data-[disabled]:pointer-events-none h-7",
                                                        "focus:bg-black/15 data-[highlighted]:bg-black/15 dark:focus:bg-white/10 dark:data-[highlighted]:bg-white/10",
                                                        // Checked state logic
                                                        (typeof period === 'string' && period === itemValue) || (typeof period === 'object' && itemValue === 'custom')
                                                            ? "bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light font-medium data-[highlighted]:bg-primary/25 dark:data-[highlighted]:bg-primary/40"
                                                            : "text-gray-700 data-[highlighted]:text-gray-800 dark:text-neutral-300 dark:data-[highlighted]:text-neutral-100",
                                                        "data-[disabled]:opacity-50"
                                                    )}
                                                    // onSelect handles the logic, including opening Popover for 'custom'
                                                >
                                                    {p.label}
                                                </DropdownMenu.RadioItem>
                                            );
                                        })}
                                    </DropdownMenu.RadioGroup>
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>

                        {/* Date Range Picker Popover Content */}
                        <Popover.Portal>
                            <Popover.Content
                                side="bottom"
                                align="center"
                                sideOffset={5}
                                className={twMerge(
                                    "z-[60] radix-popover-content", // Ensure high z-index
                                    "data-[state=open]:animate-slideUpAndFade",
                                    "data-[state=closed]:animate-slideDownAndFade"
                                )}
                                onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
                                onCloseAutoFocus={(e) => e.preventDefault()} // Keep focus on trigger
                                // Modal popover handles outside interaction automatically
                            >
                                <CustomDateRangePickerContent
                                    initialStartDate={typeof period === 'object' ? new Date(period.start) : undefined}
                                    initialEndDate={typeof period === 'object' ? new Date(period.end) : undefined}
                                    onApplyRange={handleRangeApply}
                                    closePopover={closeRangePicker}
                                />
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root> {/* End Popover Root for Date Range */}


                    {/* List Dropdown */}
                    <DropdownMenu.Root open={isListDropdownOpen} onOpenChange={setIsListDropdownOpen}>
                        <DropdownMenu.Trigger asChild>
                            <Button variant="ghost" size="sm"
                                    className="text-sm h-8 px-2 text-gray-700 dark:text-neutral-200 font-medium hover:bg-black/15 dark:hover:bg-white/10 min-w-[110px]">
                                <Icon name="list" size={14} className="mr-1.5 opacity-70"/>
                                {selectedListLabel}
                                <Icon name="chevron-down" size={14} className="ml-auto opacity-60 pl-1"/>
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className={twMerge(dropdownContentClasses, "max-h-60 overflow-y-auto styled-scrollbar-thin")}
                                sideOffset={5} align="center" onCloseAutoFocus={e => e.preventDefault()}>
                                <DropdownMenu.RadioGroup value={listFilter} onValueChange={handleListChange}>
                                    {listOptions.map(l => (
                                        <DropdownMenu.RadioItem
                                            key={l.value} value={l.value}
                                            className={twMerge(
                                                "relative flex cursor-pointer select-none items-center rounded-[3px] px-2.5 py-1 text-sm outline-none transition-colors data-[disabled]:pointer-events-none h-7",
                                                "focus:bg-black/15 data-[highlighted]:bg-black/15 dark:focus:bg-white/10 dark:data-[highlighted]:bg-white/10",
                                                "data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary data-[state=checked]:font-medium data-[highlighted]:data-[state=checked]:bg-primary/25 dark:data-[state=checked]:bg-primary/30 dark:data-[state=checked]:text-primary-light dark:data-[highlighted]:data-[state=checked]:bg-primary/40",
                                                "data-[state=unchecked]:text-gray-700 data-[highlighted]:data-[state=unchecked]:text-gray-800 dark:data-[state=unchecked]:text-neutral-300 dark:data-[highlighted]:data-[state=unchecked]:text-neutral-100",
                                                "data-[disabled]:opacity-50"
                                            )}>
                                            {l.label}
                                        </DropdownMenu.RadioItem>
                                    ))}
                                </DropdownMenu.RadioGroup>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>

                {/* Right Section: Generate Button */}
                <div className="w-1/3 flex justify-end">
                    <Button variant="primary" size="sm" icon={isGenerating ? undefined : "sparkles"}
                            loading={isGenerating} onClick={handleGenerateClick} disabled={isGenerateDisabled}
                            className="px-3 !h-8">
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 md:p-3 gap-2 md:gap-3 min-h-0">
                {/* Left Pane: Task List */}
                <div
                    className="w-full md:w-[320px] h-1/2 md:h-full flex flex-col bg-glass-alt-100 dark:bg-neutral-800/60 backdrop-blur-xl rounded-lg shadow-lg border border-black/10 dark:border-white/10 overflow-hidden flex-shrink-0">
                    {/* Task List Header */}
                    <div
                        className="px-3 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center flex-shrink-0 h-11">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-neutral-100 truncate">Tasks
                            ({selectableTasks.length})</h2> {/* Show count of selectable tasks */}
                        {/* Select All Checkbox */}
                        <SelectionCheckboxRadix
                            id="select-all-summary-tasks"
                            checked={selectAllState === true}
                            indeterminate={selectAllState === 'indeterminate'}
                            // Use the combined toggle handler
                            onChange={handleSelectAllToggle}
                            aria-label={allSelectableTasksSelected ? "Deselect all tasks" : (someSelectableTasksSelected ? "Deselect some tasks" : "Select all tasks")}
                            className="mr-1"
                            size={18}
                            disabled={selectableTasks.length === 0} // Disable if no selectable tasks
                        />
                    </div>
                    {/* Scrollable Task List */}
                    <div className="flex-1 overflow-y-auto styled-scrollbar p-2 space-y-1">
                        {filteredTasks.length === 0 ? (
                            // Empty state when filters match no tasks
                            <div
                                className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-neutral-500 px-4 text-center pt-10">
                                <Icon name="archive" size={36}
                                      className="mb-3 text-gray-300 dark:text-neutral-600 opacity-80"/>
                                <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">No relevant tasks
                                    found</p>
                                <p className="text-xs mt-1 text-muted dark:text-neutral-500">Adjust filters or check
                                    task status/progress.</p>
                            </div>
                        ) : (
                            // Render task items
                            filteredTasks.map(task => (
                                <TaskItemMiniInline key={task.id} task={task} isSelected={selectedTaskIds.has(task.id)}
                                                    onSelectionChange={handleTaskSelectionChange}/>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Pane: Summary */}
                <div
                    className="flex-1 h-1/2 md:h-full flex flex-col bg-glass-100 dark:bg-neutral-800/80 backdrop-blur-xl rounded-lg shadow-lg border border-black/10 dark:border-white/10 overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden p-3 min-h-0"> {/* Allow content to scroll */}
                        {totalRelevantSummaries > 0 || isGenerating ? (
                            <>
                                {/* Summary Header */}
                                <div className="flex justify-between items-center mb-2 flex-shrink-0 h-6">
                                    {/* Timestamp */}
                                    <span className="text-xs text-muted-foreground dark:text-neutral-400">
                                         {isGenerating ? 'Generating summary...' : (summaryTimestamp ? `Generated: ${summaryTimestamp}` : 'Unsaved Summary')}
                                    </span>
                                    {/* Controls: Referenced Tasks + Navigation */}
                                    <div className="flex items-center space-x-2">
                                        {/* Referenced Tasks Dropdown */}
                                        <DropdownMenu.Root open={isRefTasksDropdownOpen}
                                                           onOpenChange={setIsRefTasksDropdownOpen}>
                                            <DropdownMenu.Trigger asChild disabled={!currentSummary || isGenerating}>
                                                <button
                                                    className={twMerge(
                                                        "flex items-center text-xs h-6 px-1.5 rounded transition-colors duration-150 ease-apple focus:outline-none",
                                                        !currentSummary || isGenerating
                                                            ? "text-muted-foreground/50 dark:text-neutral-500 cursor-not-allowed"
                                                            : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-blue-500/10 dark:focus-visible:bg-blue-500/15"
                                                    )}
                                                    aria-haspopup="true"
                                                >
                                                    <Icon name="file-text" size={12} className="mr-1 opacity-70"/>
                                                    {tasksUsedCount} tasks used
                                                    <Icon name="chevron-down" size={12} className="ml-0.5 opacity-60"/>
                                                </button>
                                            </DropdownMenu.Trigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.Content
                                                    className={twMerge("z-[55] radix-dropdown-content p-0")} // Remove padding for custom content
                                                    sideOffset={4} align="end"
                                                    // Keep dropdown open on interaction inside
                                                    onInteractOutside={e => e.preventDefault()}
                                                    onFocusOutside={e => e.preventDefault()}
                                                    onCloseAutoFocus={e => e.preventDefault()}
                                                >
                                                    {renderReferencedTasksDropdown()}
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Root>

                                        {/* Summary Navigation */}
                                        {totalRelevantSummaries > 1 && !isGenerating && (
                                            <>
                                                <Button variant="ghost" size="icon" icon="chevron-left"
                                                        onClick={handlePrevSummary}
                                                        disabled={currentIndex >= totalRelevantSummaries - 1}
                                                        className="w-6 h-6 text-muted-foreground dark:text-neutral-400"
                                                        aria-label="Older summary"/>
                                                <span
                                                    className="text-xs font-medium text-muted-foreground dark:text-neutral-300 tabular-nums">
                                                     {displayedIndex} / {totalRelevantSummaries}
                                                </span>
                                                <Button variant="ghost" size="icon" icon="chevron-right"
                                                        onClick={handleNextSummary} disabled={currentIndex <= 0}
                                                        className="w-6 h-6 text-muted-foreground dark:text-neutral-400"
                                                        aria-label="Newer summary"/>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* CodeMirror Editor Container */}
                                <div
                                    className="flex-1 min-h-0 border border-black/10 dark:border-white/10 rounded-md overflow-hidden bg-glass-inset-100 dark:bg-neutral-700/30 shadow-inner relative">
                                    <CodeMirrorEditor
                                        key={isGenerating ? 'generating' : (currentSummary?.id ?? 'no-summary')}
                                        ref={editorRef}
                                        value={summaryEditorContent}
                                        onChange={handleEditorChange}
                                        placeholder={isGenerating ? "Generating..." : "AI generated summary will appear here..."}
                                        className="!h-full !bg-transparent"
                                        readOnly={isGenerating || !currentSummary} // Read-only during generation or if no summary selected
                                    />
                                    {/* Saving Indicator */}
                                    {hasUnsavedChangesRef.current && !isGenerating && currentSummary && (
                                        <span
                                            className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/70 dark:text-neutral-400/70 italic animate-pulse">
                                            saving...
                                        </span>
                                    )}
                                    {/* Loading Overlay */}
                                    {isGenerating && (
                                        <div
                                            className="absolute inset-0 bg-glass-alt/30 backdrop-blur-sm flex items-center justify-center z-10">
                                            <Icon name="loader" size={24} className="text-primary animate-spin"/>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            // Empty state when no summaries match filters
                            <div
                                className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-neutral-500 px-6 text-center">
                                <Icon name="sparkles" size={40}
                                      className="mb-3 text-gray-300 dark:text-neutral-600 opacity-80"/>
                                <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">No Summary
                                    Available</p>
                                <p className="text-xs mt-1 text-muted dark:text-neutral-500">
                                    Select tasks and click 'Generate' or adjust filters.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary History Modal */}
            <SummaryHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={closeHistoryModal}
                summaries={allStoredSummaries}
                allTasks={allTasks}
            />
        </div>
    );
};
SummaryView.displayName = 'SummaryView';
export default SummaryView;