// src/components/summary/SummaryView.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
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
import {Task} from '@/types';
import {cn} from '@/lib/utils';
import {
    format,
    formatDateTime,
    formatRelativeDate,
    isBefore,
    isSameDay,
    isValid,
    safeParseDate,
    startOfDay
} from '@/lib/utils/dateUtils';
import Icon from '../common/Icon';
import {Button} from '@/components/ui/button';
import {Checkbox} from "@/components/ui/checkbox";
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import CodeMirrorEditor, {CodeMirrorEditorRef} from '../common/CodeMirrorEditor';
import CustomDateRangePickerPopover from "@/components/common/CustomDateRangePickerPopover"; // Use refactored range picker
import SummaryHistoryModal from './SummaryHistoryModal'; // Use refactored history modal
import useDebounce from '@/hooks/useDebounce';
import {Label} from "@/components/ui/label.tsx";

// Placeholder AI Function (remains the same)
async function generateAiSummary(tasks: Task[]): Promise<string> { /* ... */
    console.log("Generating AI summary for tasks:", tasks.map(t => t.title));
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (tasks.length === 0) return "No tasks selected or found for summary generation.";
    const summary = `Summary for ${tasks.length} selected task(s):\n\nHighlights include progress on **${tasks[0]?.title ?? 'selected tasks'}** (${tasks[0]?.completionPercentage ?? 0}% from list "${tasks[0]?.list ?? ''}").\n\nOverall status seems ${tasks.length > 3 ? 'active' : 'manageable'}.\n\nConsider potential blockers or next steps for tasks like **${tasks[tasks.length - 1]?.title ?? 'other items'}**.\n\n*Simulated summary based on selection.*`;
    return summary.trim();
}

// Summary View Component (Refactored)
const SummaryView: React.FC = () => {
    // Atoms (remain the same)
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

    // Local State & Refs (remain the same)
    const [summaryEditorContent, setSummaryEditorContent] = useState('');
    const debouncedEditorContent = useDebounce(summaryEditorContent, 700);
    const editorRef = useRef<CodeMirrorEditorRef>(null);
    const hasUnsavedChangesRef = useRef(false);
    const isInternalEditorUpdate = useRef(false);
    const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Effects (remain the same logic)
    useEffect(() => {
        setSelectedTaskIds(new Set());
        setCurrentIndex(0);
    }, [period, listFilter, setCurrentIndex, setSelectedTaskIds]);
    useEffect(() => {
        const summaryToLoad = relevantSummaries[currentIndex];
        const summaryText = summaryToLoad?.summaryText ?? '';
        if (summaryText !== editorRef.current?.getView()?.state.doc.toString()) {
            const isEditorFocused = editorRef.current?.getView()?.hasFocus ?? false;
            if (!isEditorFocused) {
                isInternalEditorUpdate.current = true;
                setSummaryEditorContent(summaryText);
                hasUnsavedChangesRef.current = false;
            }
        }
    }, [currentIndex, relevantSummaries]);
    useEffect(() => { /* Save debounced content */
        if (hasUnsavedChangesRef.current && currentSummary?.id) {
            const summaryIdToUpdate = currentSummary.id;
            setStoredSummaries(prev => prev.map(s => s.id === summaryIdToUpdate ? {
                ...s,
                summaryText: debouncedEditorContent,
                updatedAt: Date.now()
            } : s));
            hasUnsavedChangesRef.current = false;
        }
    }, [debouncedEditorContent, currentSummary?.id, setStoredSummaries]);

    // Callbacks (adapted for shadcn components)
    const handlePeriodChange = useCallback((newPeriodValue: string) => { // Value from RadioItem is string
        if (newPeriodValue === 'custom') {
            setIsRangePickerOpen(true); // Open range picker state
            // Trigger is handled separately now by Popover
        } else {
            setPeriod(newPeriodValue as SummaryPeriodOption);
            setIsRangePickerOpen(false);
        }
    }, [setPeriod]);
    const handleListChange = useCallback((newList: string) => {
        setListFilter(newList);
    }, [setListFilter]);
    const handleTaskSelectionChange = useCallback((taskId: string) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId); else newSet.add(taskId);
            return newSet;
        });
    }, [setSelectedTaskIds]);
    const handleSelectAllTasks = useCallback((checked: boolean | 'indeterminate') => {
        if (checked === true) setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
        else setSelectedTaskIds(new Set());
    }, [filteredTasks, setSelectedTaskIds]);
    const handleGenerateClick = useCallback(async () => { /* ... (same logic) ... */
        setIsGenerating(true);
        const tasksToSummarize = allTasks.filter(t => selectedTaskIds.has(t.id));
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
            setStoredSummaries(prev => [newSummaryEntry, ...prev]);
            setCurrentIndex(0);
        } catch (error) {
            console.error("Error generating summary:", error);
        } finally {
            setIsGenerating(false);
        }
    }, [selectedTaskIds, allTasks, filterKey, setIsGenerating, setStoredSummaries, setCurrentIndex]);
    const handleEditorChange = useCallback((newValue: string) => { /* ... (same logic) ... */
        setSummaryEditorContent(newValue);
        if (!isInternalEditorUpdate.current) hasUnsavedChangesRef.current = true;
        isInternalEditorUpdate.current = false;
    }, []);
    const forceSaveCurrentSummary = useCallback(() => { /* ... (same logic) ... */
        if (hasUnsavedChangesRef.current && currentSummary?.id) {
            const id = currentSummary.id;
            setStoredSummaries(p => p.map(s => s.id === id ? {
                ...s,
                summaryText: summaryEditorContent,
                updatedAt: Date.now()
            } : s));
            hasUnsavedChangesRef.current = false;
            console.log("Force saved summary:", id);
        }
    }, [currentSummary?.id, setStoredSummaries, summaryEditorContent]);
    const handlePrevSummary = useCallback(() => {
        forceSaveCurrentSummary();
        setCurrentIndex(prev => Math.min(prev + 1, relevantSummaries.length - 1));
    }, [setCurrentIndex, relevantSummaries.length, forceSaveCurrentSummary]);
    const handleNextSummary = useCallback(() => {
        forceSaveCurrentSummary();
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, [setCurrentIndex, forceSaveCurrentSummary]);
    const handleRangeApply = useCallback((startDate: Date, endDate: Date) => {
        setPeriod({start: startDate.getTime(), end: endDate.getTime()});
        setIsRangePickerOpen(false);
    }, [setPeriod]);
    const openHistoryModal = useCallback(() => setIsHistoryModalOpen(true), []);
    const closeHistoryModal = useCallback(() => setIsHistoryModalOpen(false), []);

    // --- Memoized Values ---
    const periodOptions = useMemo((): { label: string, value: string }[] => [{
        label: 'Today',
        value: 'today'
    }, {label: 'Yesterday', value: 'yesterday'}, {label: 'This Week', value: 'thisWeek'}, {
        label: 'Last Week',
        value: 'lastWeek'
    }, {label: 'This Month', value: 'thisMonth'}, {label: 'Last Month', value: 'lastMonth'}, {
        label: 'Custom Range...',
        value: 'custom'
    },], []);
    const listOptions = useMemo(() => [{
        label: 'All Lists',
        value: 'all'
    }, ...availableLists.map(listName => ({label: listName, value: listName}))], [availableLists]);
    const selectedPeriodLabel = useMemo(() => { /* ... (same logic) ... */
        if (typeof period === 'string') {
            const option = periodOptions.find(p => p.value === period);
            if (option) return option.label;
        }
        if (typeof period === 'object') {
            const startStr = format(period.start, 'MMM d');
            const endStr = format(period.end, 'MMM d');
            const startYear = format(period.start, 'yyyy');
            const endYear = format(period.end, 'yyyy');
            if (isSameDay(period.start, period.end)) return startYear !== format(new Date(), 'yyyy') ? format(period.start, 'MMM d, yyyy') : startStr;
            const currentYear = format(new Date(), 'yyyy');
            if (startYear !== endYear) return `${format(period.start, 'MMM d, yyyy')} - ${format(period.end, 'MMM d, yyyy')}`; else if (startYear !== currentYear) return `${startStr} - ${endStr}, ${startYear}`; else return `${startStr} - ${endStr}`;
        }
        return 'Select Period';
    }, [period, periodOptions]);
    const selectedListLabel = useMemo(() => {
        const option = listOptions.find(l => l.value === listFilter);
        return option ? option.label : 'Unknown List';
    }, [listFilter, listOptions]);
    const isGenerateDisabled = useMemo(() => isGenerating || selectedTaskIds.size === 0, [isGenerating, selectedTaskIds]);
    const tasksUsedCount = useMemo(() => currentSummary?.taskIds.length ?? 0, [currentSummary]);
    const summaryTimestamp = useMemo(() => currentSummary ? formatDateTime(currentSummary.createdAt) : null, [currentSummary]);
    const allTasksSelected = useMemo(() => filteredTasks.length > 0 && filteredTasks.every(task => selectedTaskIds.has(task.id)), [filteredTasks, selectedTaskIds]);
    const someTasksSelected = useMemo(() => selectedTaskIds.size > 0 && !allTasksSelected, [selectedTaskIds, allTasksSelected]);
    const selectAllCheckboxState = useMemo(() => allTasksSelected ? true : (someTasksSelected ? 'indeterminate' : false), [allTasksSelected, someTasksSelected]);
    const totalRelevantSummaries = useMemo(() => relevantSummaries.length, [relevantSummaries]);
    const displayedIndex = useMemo(() => totalRelevantSummaries - currentIndex, [totalRelevantSummaries, currentIndex]);

    // Render Function for Referenced Tasks Dropdown
    const renderReferencedTasksDropdown = () => (
        <DropdownMenuContent align="end"
                             className="w-80 max-h-72 overflow-hidden p-0 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
            <div
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50 sticky top-0 bg-popover/80 backdrop-blur-md z-10">
                Referenced Tasks ({referencedTasks.length})
            </div>
            {referencedTasks.length > 0 ? (
                <ScrollArea className="h-[calc(min(18rem,theme(space.72)))]"> {/* Max height scroll */}
                    <div className="p-1.5 space-y-0.5">
                        {referencedTasks.map(task => (
                            <div key={task.id}
                                 className="flex items-start p-1.5 rounded hover:bg-accent/50 transition-colors"
                                 title={task.title}>
                                <div
                                    className={cn("flex-shrink-0 w-4 h-4 rounded-full border mt-[1px] mr-2.5 flex items-center justify-center", task.completed ? "bg-primary/90 border-primary/90" : task.completionPercentage && task.completionPercentage > 0 ? "border-primary/70" : "bg-background/40 border-muted/50")}>
                                    {task.completed && <Icon name="check" size={9} className="text-primary-foreground"
                                                             strokeWidth={3}/>}
                                    {task.completionPercentage && task.completionPercentage > 0 && !task.completed && (
                                        <div className="w-1.5 h-1.5 bg-primary/80 rounded-full"></div>)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className={cn("text-[12.5px] font-medium text-foreground leading-snug truncate", task.completed && "line-through text-muted-foreground")}> {task.title || "Untitled"} </p>
                                    <div
                                        className="flex items-center space-x-2 mt-0.5 text-[10.5px] text-muted-foreground">
                                        {task.completionPercentage && !task.completed && (<span
                                            className="font-medium text-primary/90">[{task.completionPercentage}%]</span>)}
                                        {task.dueDate && isValid(safeParseDate(task.dueDate)) && (
                                            <span className="flex items-center whitespace-nowrap"> <Icon name="calendar"
                                                                                                         size={10}
                                                                                                         className="mr-0.5 opacity-60"/> {formatRelativeDate(task.dueDate)} </span>)}
                                        {task.list && task.list !== 'Inbox' && (<Badge variant="secondary"
                                                                                       className="px-1 py-0 text-[9px] font-normal h-[14px]"
                                                                                       title={task.list}> <Icon
                                            name="list" size={9} className="mr-0.5 opacity-60 flex-shrink-0"/> <span
                                            className="truncate max-w-[60px]">{task.list}</span> </Badge>)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            ) : (<p className="text-xs text-muted-foreground italic p-4 text-center">No referenced tasks found.</p>)}
        </DropdownMenuContent>
    );

    return (
        <div className="h-full flex flex-col bg-background/50 dark:bg-background/30 overflow-hidden">
            {/* Page Header */}
            <div className={cn(
                "px-3 md:px-4 py-2 border-b border-border/60 flex justify-between items-center flex-shrink-0",
                "bg-background/60 dark:bg-black/20 backdrop-blur-lg z-10 h-12 shadow-sm"
            )}>
                <div className="w-1/3 flex items-center space-x-2">
                    <h1 className="text-base font-semibold text-foreground truncate">AI Summary</h1>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={openHistoryModal}
                                    className="w-7 h-7 text-muted-foreground hover:bg-accent"
                                    aria-label="View Summary History">
                                <Icon name="history" size={16}/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="tooltip-content"><p>View Summary History</p></TooltipContent>
                    </Tooltip>
                </div>
                <div className="flex-1 flex justify-center items-center space-x-1 sm:space-x-2">
                    {/* Period Dropdown */}
                    <Popover open={isRangePickerOpen} onOpenChange={setIsRangePickerOpen}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                {/* Wrap DropdownMenuTrigger with PopoverTrigger */}
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm"
                                            className="text-xs sm:text-sm h-8 px-2 font-medium min-w-[110px] sm:min-w-[120px]">
                                        <Icon name="calendar-days" size={14} className="mr-1 sm:mr-1.5 opacity-70"/>
                                        <span className="truncate">{selectedPeriodLabel}</span>
                                        <Icon name="chevron-down" size={14} className="ml-auto opacity-60 pl-1"/>
                                    </Button>
                                </PopoverTrigger>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center"
                                                 className="w-48 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                                <DropdownMenuRadioGroup
                                    value={typeof period === 'string' ? period : (period?.start ? 'custom' : '')}
                                    onValueChange={handlePeriodChange}>
                                    {periodOptions.map(p => (
                                        <DropdownMenuRadioItem key={p.value} value={p.value} className="cursor-pointer">
                                            {p.label}
                                            {p.value === 'custom' && <span className="ml-auto"></span>}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {/* PopoverContent for the Date Range Picker */}
                        <PopoverContent className="w-auto p-0" align="start">
                            <CustomDateRangePickerPopover
                                initialStartDate={typeof period === 'object' ? new Date(period.start) : undefined}
                                initialEndDate={typeof period === 'object' ? new Date(period.end) : undefined}
                                onApplyRange={handleRangeApply}
                                trigger={<></>} // Trigger handled by PopoverTrigger above
                            />
                        </PopoverContent>
                    </Popover>

                    {/* List Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm"
                                    className="text-xs sm:text-sm h-8 px-2 font-medium min-w-[100px] sm:min-w-[110px]">
                                <Icon name="list" size={14} className="mr-1 sm:mr-1.5 opacity-70"/>
                                <span className="truncate">{selectedListLabel}</span>
                                <Icon name="chevron-down" size={14} className="ml-auto opacity-60 pl-1"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center"
                                             className="max-h-60 overflow-y-auto styled-scrollbar-thin w-48 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl">
                            <DropdownMenuRadioGroup value={listFilter} onValueChange={handleListChange}>
                                {listOptions.map(l => (
                                    <DropdownMenuRadioItem key={l.value} value={l.value} className="cursor-pointer">
                                        {l.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="w-1/3 flex justify-end">
                    <Button variant="default" size="sm" onClick={handleGenerateClick} disabled={isGenerateDisabled}
                            className="px-3 !h-8">
                        {isGenerating ? <Icon name="loader" size={16} className="animate-spin mr-1.5"/> :
                            <Icon name="sparkles" size={16} className="mr-1.5"/>}
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 md:p-3 gap-2 md:gap-3 min-h-0">
                {/* Left Pane: Task List */}
                <div
                    className="w-full md:w-[340px] lg:w-[380px] h-1/2 md:h-full flex flex-col bg-card/40 dark:bg-card/20 backdrop-blur-lg rounded-lg shadow-lg border border-border/50 overflow-hidden flex-shrink-0">
                    <div
                        className="px-3 py-2 border-b border-border/50 flex justify-between items-center flex-shrink-0 h-11">
                        <h2 className="text-sm font-semibold text-foreground truncate">Select Tasks
                            ({filteredTasks.length})</h2>
                        <div className="flex items-center">
                            <Label htmlFor="select-all-summary-tasks"
                                   className="text-xs mr-2 text-muted-foreground select-none">
                                {selectedTaskIds.size} selected
                            </Label>
                            <Checkbox
                                id="select-all-summary-tasks"
                                checked={selectAllCheckboxState}
                                onCheckedChange={handleSelectAllTasks}
                                aria-label={allTasksSelected ? "Deselect all tasks" : "Select all tasks"}
                                className="mr-1"
                            />
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {filteredTasks.length === 0 ? (
                                <div
                                    className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center pt-16">
                                    <Icon name="archive" size={36} className="mb-3 opacity-40"/>
                                    <p className="text-sm font-medium">No tasks match criteria</p>
                                    <p className="text-xs mt-1">Adjust filters or ensure tasks have completion not 0%.</p>
                                </div>
                            ) : (
                                filteredTasks.map(task => (
                                    <TaskItemMini key={task.id} task={task} isSelected={selectedTaskIds.has(task.id)}
                                                  onSelectionChange={handleTaskSelectionChange}/>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Pane: Summary */}
                <div
                    className="flex-1 h-1/2 md:h-full flex flex-col bg-card/70 dark:bg-card/40 backdrop-blur-xl rounded-lg shadow-lg border border-border/50 overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden p-3">
                        {totalRelevantSummaries > 0 || isGenerating ? (
                            <>
                                <div className="flex justify-between items-center mb-2 flex-shrink-0 h-6">
                                     <span className="text-xs text-muted-foreground">
                                         {isGenerating ? 'Generating summary...' : (summaryTimestamp ? `Generated: ${summaryTimestamp}` : 'Unsaved Summary')}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                        <DropdownMenu>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            className={cn("flex items-center text-xs h-6 px-1.5 rounded transition-colors", !currentSummary || isGenerating ? "text-muted-foreground/50 cursor-not-allowed" : "text-blue-600 hover:bg-blue-500/10")}
                                                            disabled={!currentSummary || isGenerating}
                                                        >
                                                            <Icon name="file-text" size={12}
                                                                  className="mr-1 opacity-70"/> {tasksUsedCount} tasks
                                                            used
                                                            <Icon name="chevron-down" size={12}
                                                                  className="ml-0.5 opacity-60"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent className="tooltip-content"><p>View tasks used for this
                                                    summary</p></TooltipContent>
                                            </Tooltip>
                                            {renderReferencedTasksDropdown()}
                                        </DropdownMenu>

                                        {totalRelevantSummaries > 1 && !isGenerating && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={handlePrevSummary}
                                                        disabled={currentIndex >= totalRelevantSummaries - 1}
                                                        className="w-6 h-6 text-muted-foreground"
                                                        aria-label="Older summary"><Icon name="chevron-left" size={16}/></Button>
                                                <span
                                                    className="text-xs font-medium text-muted-foreground tabular-nums w-10 text-center"> {displayedIndex}/{totalRelevantSummaries} </span>
                                                <Button variant="ghost" size="icon" onClick={handleNextSummary}
                                                        disabled={currentIndex <= 0}
                                                        className="w-6 h-6 text-muted-foreground"
                                                        aria-label="Newer summary"><Icon name="chevron-right"
                                                                                         size={16}/></Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className="flex-1 min-h-0 border border-border/50 rounded-md overflow-hidden bg-background/30 dark:bg-black/20 shadow-inner relative">
                                    <CodeMirrorEditor
                                        ref={editorRef} value={summaryEditorContent} onChange={handleEditorChange}
                                        placeholder={isGenerating ? "Generating..." : "AI generated summary will appear here..."}
                                        className="!h-full !border-none !bg-transparent !shadow-none"
                                        readOnly={isGenerating}
                                        key={currentSummary?.id || 'new'} // Force remount if ID changes
                                    />
                                    {hasUnsavedChangesRef.current && (
                                        <Badge variant="outline"
                                               className="absolute bottom-2 right-2 text-[10px] px-1 py-0 border-none bg-amber-500/10 text-amber-700 dark:text-amber-300 animate-pulse">
                                            saving...
                                        </Badge>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center h-full text-muted-foreground px-6 text-center">
                                <Icon name="sparkles" size={40} className="mb-3 opacity-40"/>
                                <p className="text-sm font-medium">Generate Your First Summary</p>
                                <p className="text-xs mt-1">Select tasks from the list and click 'Generate'.</p>
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

// --- Child Component: TaskItemMini ---
const TaskItemMini: React.FC<{
    task: Task;
    isSelected: boolean;
    onSelectionChange: (id: string) => void; // Simplified: just pass ID
}> = React.memo(({task, isSelected, onSelectionChange}) => {
    const parsedDueDate = useMemo(() => safeParseDate(task.dueDate), [task.dueDate]);
    const overdue = useMemo(() => parsedDueDate != null && isValid(parsedDueDate) && isBefore(startOfDay(parsedDueDate), startOfDay(new Date())) && !task.completed, [parsedDueDate, task.completed]);
    const uniqueId = `summary-task-${task.id}`;

    const handleCheckedChange = useCallback((_checked: boolean | 'indeterminate') => {
        onSelectionChange(task.id); // Let parent toggle based on ID
    }, [onSelectionChange, task.id]);

    return (
        <div className={cn(
            "flex items-center p-1.5 rounded-md transition-colors duration-150 ease-apple cursor-pointer",
            isSelected ? "bg-primary/15 dark:bg-primary/25" : "hover:bg-accent/80 dark:hover:bg-accent/50",
            task.list === 'Trash' ? "opacity-60" : ""
        )}>
            <Checkbox
                id={uniqueId}
                checked={isSelected}
                onCheckedChange={handleCheckedChange}
                aria-label={`Select task: ${task.title || 'Untitled'}`}
                className="mr-2.5 flex-shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label htmlFor={uniqueId} className="flex-1 overflow-hidden cursor-pointer"> {/* Label wraps content */}
                <span
                    className={cn("text-sm text-foreground block truncate", task.completed && "line-through text-muted-foreground")}>
                    {task.title || <span className="italic">Untitled Task</span>}
                 </span>
                <div className="text-xs text-muted-foreground flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-0.5">
                    {task.completionPercentage && task.completionPercentage < 100 && (<Badge variant="outline"
                                                                                             className="px-1 py-0 text-[9px] border-primary/50 text-primary/90 bg-primary/10"> {task.completionPercentage}% </Badge>)}
                    {parsedDueDate && isValid(parsedDueDate) && (<Badge variant="outline"
                                                                        className={cn("px-1 py-0 text-[9px] border-border/50", overdue && !task.completed && "text-destructive border-destructive/50 bg-destructive/10", task.completed && "line-through")}>
                        <Icon name="calendar" size={10}
                              className="mr-0.5 opacity-70"/> {formatRelativeDate(parsedDueDate)} </Badge>)}
                    {task.list && task.list !== 'Inbox' && (
                        <Badge variant="secondary" className="px-1 py-0 text-[9px] max-w-[70px]" title={task.list}>
                            <Icon name={task.list === 'Trash' ? 'trash' : 'list'} size={10}
                                  className="mr-0.5 opacity-70"/> <span className="truncate">{task.list}</span>
                        </Badge>)}
                    {task.tags && task.tags.length > 0 && (
                        <span className="flex items-center gap-1"> {task.tags.slice(0, 1).map(tag => (
                            <Badge key={tag} variant="outline"
                                   className="px-1 py-0 text-[9px] border-border/50">#{tag}</Badge>))} {task.tags.length > 1 &&
                            <Badge variant="outline"
                                   className="px-1 py-0 text-[9px] border-border/50">+{task.tags.length - 1}</Badge>} </span>)}
                </div>
            </label>
        </div>
    );
});
TaskItemMini.displayName = 'TaskItemMini';

export default SummaryView;