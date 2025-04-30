// src/components/summary/SummaryHistoryModal.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {twMerge} from 'tailwind-merge';
import {StoredSummary} from '@/store/atoms'; // Assuming StoredSummary is exported from atoms
import Button from '../common/Button';
import Icon from '../common/Icon';
import useDebounce from '@/hooks/useDebounce'; // Ensure this hook exists and is imported correctly
import {format, formatDistanceToNowStrict, isSameDay, isValid, parseISO, startOfDay, subDays} from 'date-fns';
import CodeMirrorEditor from '../common/CodeMirrorEditor';
import {Task} from '@/types';
import Highlighter from 'react-highlight-words';
import {IconName} from "@/components/common/IconMap"; // Ensure IconName is exported correctly
import * as DialogPrimitive from '@radix-ui/react-dialog'; // Import Radix Dialog

// --- Helper: Get Filter Labels (Keep as is) ---
const getFilterLabels = (periodKey: string, listKey: string): { periodLabel: string, listLabel: string } => {
    let periodLabel = 'Date Range';
    let listLabel = 'All Lists';
    if (periodKey === 'today') periodLabel = 'Today';
    else if (periodKey === 'yesterday') periodLabel = 'Yesterday';
    else if (periodKey === 'thisWeek') periodLabel = 'This Week';
    else if (periodKey === 'lastWeek') periodLabel = 'Last Week';
    else if (periodKey === 'thisMonth') periodLabel = 'This Month';
    else if (periodKey === 'lastMonth') periodLabel = 'Last Month';
    else if (periodKey.startsWith('custom_')) {
        try {
            const [, startTs, endTs] = periodKey.split('_');
            const startDate = new Date(Number(startTs));
            const endDate = new Date(Number(endTs));
            if (isValid(startDate) && isValid(endDate)) {
                const currentYear = new Date().getFullYear();
                const startYear = startDate.getFullYear();
                const endYear = endDate.getFullYear();
                if (isSameDay(startDate, endDate)) {
                    periodLabel = format(startDate, startYear === currentYear ? 'MMM d' : 'MMM d, yyyy');
                } else {
                    const startFormat = startYear === currentYear ? 'MMM d' : 'MMM d, yyyy';
                    const endFormat = endYear === currentYear ? 'MMM d' : 'MMM d, yyyy';
                    periodLabel = `${format(startDate, startFormat)} - ${format(endDate, endFormat)}`;
                }
            } else {
                periodLabel = 'Custom Range';
            }
        } catch (e) {
            console.error("Error parsing custom date range key:", e);
            periodLabel = 'Custom Range';
        }
    }
    if (listKey !== 'all' && listKey.startsWith('list-')) {
        listLabel = listKey.substring(5);
    } else if (listKey !== 'all') {
        listLabel = listKey;
    }
    return {periodLabel, listLabel};
};

// --- Helper: Referenced Task Item (Keep as is) ---
interface ReferencedTaskItemProps {
    task: Task;
}

const ReferencedTaskItem: React.FC<ReferencedTaskItemProps> = React.memo(({task}) => {
    const iconName: IconName = task.completed ? "check-square" : "square";
    const iconColor = task.completed ? "text-green-600 dark:text-green-500" : "text-neutral-400 dark:text-neutral-500";
    const textColor = task.completed ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-800 dark:text-neutral-200";
    const showPercentage = !task.completed && task.completionPercentage && task.completionPercentage > 0;
    return (
        <li className="flex items-center py-1 px-1.5 rounded-md transition-colors duration-150 ease-out group"
            title={task.title}>
            <Icon name={iconName} size={13} className={twMerge("mr-2 flex-shrink-0 transition-colors", iconColor)}
                  strokeWidth={task.completed ? 2.5 : 1.75}/>
            <div className="flex items-baseline flex-1 overflow-hidden">
                <span className={twMerge("text-xs truncate", textColor, task.completed && "line-through")}>
                    {task.title || <span className="italic">Untitled Task</span>}
                </span>
                {showPercentage && (<span
                    className="ml-1.5 text-[9px] text-primary/90 dark:text-primary/80 font-medium select-none flex-shrink-0">[{task.completionPercentage}%]</span>)}
            </div>
        </li>
    );
});
ReferencedTaskItem.displayName = 'ReferencedTaskItem';

// --- Main Modal Component (Using Radix Dialog) ---
interface SummaryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summaries: StoredSummary[];
    allTasks: Task[];
}

const SummaryHistoryModal: React.FC<SummaryHistoryModalProps> = ({
                                                                     isOpen,
                                                                     onClose, // Used by Radix onOpenChange
                                                                     summaries,
                                                                     allTasks,
                                                                 }) => {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    // Effect for default selection and reset
    useEffect(() => {
        if (isOpen) {
            const validSelectionExists = summaries.some(s => s.id === selectedSummaryId);
            if (summaries.length > 0 && (!validSelectionExists || debouncedSearchTerm)) {
                // If no valid selection or searching, select first *visible* item
                const firstVisibleGroup = filteredGroupedSummaries[0];
                setSelectedSummaryId(firstVisibleGroup?.items[0]?.id ?? null);
            } else if (summaries.length === 0) {
                setSelectedSummaryId(null);
            }
            // Reset search term when modal opens? Optional.
            // setSearchTerm('');
        } else {
            // Reset state when modal closes
            // setSelectedSummaryId(null); // Keep selection maybe?
            // setSearchTerm('');
        }
    }, [isOpen, summaries, selectedSummaryId, debouncedSearchTerm]); // Add dependencies

    // Memoized data processing (Keep as is)
    const selectedSummary = useMemo(() => summaries.find(s => s.id === selectedSummaryId) ?? null, [selectedSummaryId, summaries]);
    const selectedReferencedTasks = useMemo(() => {
        if (!selectedSummary) return [];
        const referencedIds = new Set(selectedSummary.taskIds);
        return allTasks.filter(task => referencedIds.has(task.id)).sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1) || a.title.localeCompare(b.title));
    }, [selectedSummary, allTasks]);

    const groupedSummaries = useMemo(() => {
        const groups: Record<string, StoredSummary[]> = {};
        const sortedSummaries = [...summaries].sort((a, b) => b.createdAt - a.createdAt);
        sortedSummaries.forEach(summary => {
            const date = new Date(summary.createdAt);
            const dateKey = format(date, 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(summary);
        });
        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return sortedKeys.map(key => ({dateKey: key, items: groups[key]}));
    }, [summaries]);

    const filteredGroupedSummaries = useMemo(() => {
        if (!debouncedSearchTerm) return groupedSummaries;
        const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
        const filtered: { dateKey: string; items: StoredSummary[] }[] = [];
        groupedSummaries.forEach(group => {
            const matchingItems = group.items.filter(summary => {
                const {periodLabel, listLabel} = getFilterLabels(summary.periodKey, summary.listKey);
                return summary.summaryText.toLowerCase().includes(lowerSearchTerm) || periodLabel.toLowerCase().includes(lowerSearchTerm) || listLabel.toLowerCase().includes(lowerSearchTerm);
            });
            if (matchingItems.length > 0) filtered.push({dateKey: group.dateKey, items: matchingItems});
        });
        return filtered;
    }, [groupedSummaries, debouncedSearchTerm]);

    // Callbacks and Handlers (Keep as is)
    const formatDateGroupKey = (dateKey: string): string => {
        const date = parseISO(dateKey);
        if (!isValid(date)) return "Invalid Date";
        const now = new Date();
        if (isSameDay(date, now)) return 'Today';
        if (isSameDay(date, startOfDay(subDays(now, 1)))) return 'Yesterday';
        return format(date, date.getFullYear() === now.getFullYear() ? 'MMMM d' : 'MMMM d, yyyy');
    };
    const handleSelectSummary = useCallback((summaryId: string) => {
        setSelectedSummaryId(summaryId);
    }, []);
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
        // If search cleared, re-evaluate default selection
        if (newSearchTerm === '') {
            const currentSelectionStillVisible = filteredGroupedSummaries.some(g => g.items.some(s => s.id === selectedSummaryId));
            if (!currentSelectionStillVisible && summaries.length > 0) {
                setSelectedSummaryId(summaries[0].id);
            }
        }
    };
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        searchInputRef.current?.focus();
        // Reset selection to the first overall item if current is no longer valid
        if (!summaries.some(s => s.id === selectedSummaryId) && summaries.length > 0) {
            setSelectedSummaryId(summaries[0].id);
        }
    }, [summaries, selectedSummaryId]);

    // Highlighter props (Keep as is)
    const highlighterProps = useMemo(() => ({
        highlightClassName: "bg-primary/20 dark:bg-primary/30 text-inherit font-semibold rounded-[1px] px-0",
        searchWords: debouncedSearchTerm.split(' ').filter(Boolean),
        autoEscape: true,
        textToHighlight: '',
    }), [debouncedSearchTerm]);

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-50 bg-black/65 dark:bg-black/75 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"/>
                {/* Content */}
                <DialogPrimitive.Content
                    className={twMerge(
                        // Base positioning and sizing
                        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] gap-0 p-0 duration-200", // No gap, no padding on content itself
                        // Appearance
                        "border border-neutral-300/50 dark:border-neutral-700/50 bg-neutral-50 dark:bg-neutral-800/90 backdrop-blur-3xl rounded-xl shadow-2xl",
                        // Layout & Constraints
                        "h-[80vh] max-h-[80vh] flex flex-col overflow-hidden", // Flex column, constrained height
                        // Radix Animations
                        "data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out"
                    )}
                    // Prevent closing on inner click automatically handled by Radix? Maybe not, add handler if needed.
                    onInteractOutside={(e) => e.preventDefault()} // Prevent closing on click outside IF NEEDED (usually desired)
                    onEscapeKeyDown={onClose} // Ensure ESC closes
                >
                    {/* Header */}
                    <div
                        className="px-5 py-3 border-b border-neutral-200/70 dark:border-neutral-700/50 flex justify-between items-center flex-shrink-0 h-[50px]">
                        <DialogPrimitive.Title
                            className="text-base font-semibold text-neutral-800 dark:text-neutral-100 flex items-center">
                            <Icon name="history" size={16} className="mr-2 text-neutral-500 dark:text-neutral-400"/>
                            Summary History
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Close asChild>
                            <Button variant="ghost" size="icon" icon="x"
                                    className="text-neutral-500 dark:text-neutral-400 hover:bg-neutral-500/10 dark:hover:bg-neutral-700/50 w-7 h-7 -mr-1.5"
                                    aria-label="Close history"/>
                        </DialogPrimitive.Close>
                    </div>

                    {/* Main Content: Two Panes */}
                    <div
                        className="flex flex-1 overflow-hidden min-h-0"> {/* Crucial: min-h-0 for flex children scroll */}
                        {/* --- Left Pane: Search + History List --- */}
                        <div
                            className="w-[320px] border-r border-neutral-200/70 dark:border-neutral-700/50 flex flex-col overflow-hidden flex-shrink-0 bg-neutral-100/50 dark:bg-neutral-800/60">
                            {/* Search Area */}
                            <div
                                className="p-3 border-b border-neutral-200/70 dark:border-neutral-700/50 flex-shrink-0">
                                <div className="relative">
                                    <Icon name="search" size={15}
                                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 z-10"/>
                                    <input
                                        ref={searchInputRef} type="search" placeholder="Search history..."
                                        value={searchTerm} onChange={handleSearchChange}
                                        className={twMerge("w-full h-8 pl-8 pr-7 text-sm rounded-md focus:outline-none", "bg-neutral-200/60 dark:bg-neutral-700/60", "border border-transparent focus:border-primary/40 dark:focus:border-primary/60", "focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30", "placeholder:text-neutral-400 dark:placeholder:text-neutral-500", "text-neutral-800 dark:text-neutral-100", "transition-colors duration-150 ease-in-out")}
                                        aria-label="Search summaries"
                                    />
                                    {searchTerm && (<button onClick={handleClearSearch}
                                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 z-10 transition-colors"
                                                            aria-label="Clear search"><Icon name="x-circle" size={14}/>
                                    </button>)}
                                </div>
                            </div>
                            {/* List Area */}
                            <div className="flex-1 overflow-y-auto styled-scrollbar-thin">
                                {summaries.length === 0 ? (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-10 px-4 italic">No
                                        summaries generated yet.</p>
                                ) : filteredGroupedSummaries.length === 0 ? (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-10 px-4 italic">No
                                        summaries match "{debouncedSearchTerm}".</p>
                                ) : (
                                    filteredGroupedSummaries.map(({dateKey, items}) => (
                                        <div key={dateKey} className="pt-2">
                                            <h3 className="px-3.5 pt-2 pb-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide sticky top-0 bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm z-10 border-b border-neutral-200/50 dark:border-neutral-700/30">{formatDateGroupKey(dateKey)}</h3>
                                            <ul className="px-2 py-1">
                                                {items.map((summary) => {
                                                    const {
                                                        periodLabel,
                                                        listLabel
                                                    } = getFilterLabels(summary.periodKey, summary.listKey);
                                                    const isSelected = selectedSummaryId === summary.id;
                                                    const summarySnippet = summary.summaryText.substring(0, 100) + (summary.summaryText.length > 100 ? '...' : '');
                                                    return (
                                                        <li key={summary.id}>
                                                            <button
                                                                className={twMerge("w-full text-left p-2.5 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors duration-100 ease-out rounded-lg mb-0.5", "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-100 dark:focus-visible:ring-offset-neutral-800", isSelected && "bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25")}
                                                                onClick={() => handleSelectSummary(summary.id)}
                                                                aria-current={isSelected ? 'page' : undefined}>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span
                                                                        className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">{format(summary.createdAt, 'p')}</span>
                                                                    <div
                                                                        className="flex items-center space-x-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                                                        <span
                                                                            className="inline-flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-[1px] rounded-full text-[9px] font-medium"
                                                                            title={periodLabel}><Icon
                                                                            name="calendar-days" size={9}
                                                                            className="mr-1 opacity-70 flex-shrink-0"/><span
                                                                            className="truncate">{periodLabel}</span></span>
                                                                        <span
                                                                            className="inline-flex items-center bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-[1px] rounded-full text-[9px] font-medium"
                                                                            title={listLabel}><Icon name="list" size={9}
                                                                                                    className="mr-1 opacity-70 flex-shrink-0"/><span
                                                                            className="truncate">{listLabel}</span></span>
                                                                    </div>
                                                                </div>
                                                                <p className={twMerge("text-xs text-neutral-600 dark:text-neutral-400 leading-snug", isSelected && "text-neutral-800 dark:text-neutral-200")}>
                                                                    <Highlighter {...highlighterProps}
                                                                                 textToHighlight={summarySnippet}/>
                                                                </p>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* --- Right Pane: Summary Detail --- */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-neutral-900/50">
                            {selectedSummary ? (
                                <div className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden">
                                    {/* Detail Header */}
                                    <div className="flex justify-between items-center mb-3 flex-shrink-0">
                                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                            <span
                                                className="inline-flex items-center bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium"><Icon
                                                name="calendar-days" size={11}
                                                className="mr-1 opacity-70"/>{getFilterLabels(selectedSummary.periodKey, selectedSummary.listKey).periodLabel}</span>
                                            <span
                                                className="inline-flex items-center bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 px-2 py-0.5 rounded-full text-[11px] font-medium"><Icon
                                                name="list" size={11}
                                                className="mr-1 opacity-70"/>{getFilterLabels(selectedSummary.periodKey, selectedSummary.listKey).listLabel}</span>
                                        </div>
                                        <span
                                            className="text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap pl-2">
                                             {formatDistanceToNowStrict(selectedSummary.createdAt, {addSuffix: true})}
                                            {selectedSummary.updatedAt && selectedSummary.updatedAt > selectedSummary.createdAt + 10000 &&
                                                <span className="italic ml-1">(edited)</span>}
                                         </span>
                                    </div>
                                    {/* Summary Content Editor */}
                                    <div
                                        className={twMerge("flex-1 min-h-0 mb-3 rounded-lg overflow-hidden relative", "bg-neutral-100/50 dark:bg-neutral-800/40", "border border-neutral-200/80 dark:border-neutral-700/50")}>
                                        <CodeMirrorEditor key={selectedSummary.id} value={selectedSummary.summaryText}
                                                          onChange={() => {
                                                          }} readOnly={true}
                                                          className="!h-full !border-none !shadow-none !bg-transparent"
                                                          placeholder="Summary content..."/>
                                    </div>
                                    {/* Referenced Tasks Section */}
                                    <div
                                        className="flex-shrink-0 max-h-[30%] overflow-hidden flex flex-col border-t border-neutral-200/70 dark:border-neutral-700/50 pt-2">
                                        <h4 className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1 px-1 flex-shrink-0">Referenced
                                            Tasks ({selectedReferencedTasks.length})</h4>
                                        {selectedReferencedTasks.length > 0 ? (
                                            <ul className="space-y-0 flex-1 overflow-y-auto styled-scrollbar-thin pr-1">
                                                {selectedReferencedTasks.map(task => (
                                                    <ReferencedTaskItem key={task.id} task={task}/>))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 italic px-1 py-2">No
                                                tasks were referenced.</p>)}
                                    </div>
                                </div>
                            ) : (
                                // Empty State
                                <div
                                    className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-neutral-400 text-sm italic p-10 text-center">
                                    <Icon name="file-text" size={32} className="mb-3 opacity-30"/> Select a summary<br/>to
                                    view details.
                                </div>
                            )}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
SummaryHistoryModal.displayName = 'SummaryHistoryModal';
export default SummaryHistoryModal;