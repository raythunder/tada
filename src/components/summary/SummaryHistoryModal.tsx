// src/components/summary/SummaryHistoryModal.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StoredSummary} from '@/store/atoms'; // Assuming StoredSummary is exported from atoms
import {Task} from '@/types';
import {cn} from '@/lib/utils';
import {
    format,
    formatDistanceToNowStrict,
    isSameDay,
    isValid,
    parseISO,
    startOfDay,
    subDays
} from '@/lib/utils/dateUtils';
import useDebounce from '@/hooks/useDebounce';
import Highlighter from 'react-highlight-words';
import Icon from '../common/Icon';
import {IconName} from "@/components/common/IconMap";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"; // Use Dialog
import CodeMirrorEditor from '../common/CodeMirrorEditor';

// --- Helper: Get Filter Labels (Unchanged) ---
const getFilterLabels = (periodKey: string, listKey: string): { periodLabel: string, listLabel: string } => {
    // ... (keep existing logic) ...
    let periodLabel = 'Date Range';
    let listLabel = 'All Lists';
    if (periodKey === 'today') periodLabel = 'Today'; else if (periodKey === 'yesterday') periodLabel = 'Yesterday'; else if (periodKey === 'thisWeek') periodLabel = 'This Week'; else if (periodKey === 'lastWeek') periodLabel = 'Last Week'; else if (periodKey === 'thisMonth') periodLabel = 'This Month'; else if (periodKey === 'lastMonth') periodLabel = 'Last Month'; else if (periodKey.startsWith('custom_')) {
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

// --- Helper: Referenced Task Item (Refined Styling) ---
interface ReferencedTaskItemProps {
    task: Task;
}

const ReferencedTaskItem: React.FC<ReferencedTaskItemProps> = React.memo(({task}) => {
    const iconName: IconName = task.completed ? "check-square" : "square";
    const iconColor = task.completed ? "text-green-600 dark:text-green-500" : "text-muted-foreground/70";
    const textColor = task.completed ? "text-muted-foreground" : "text-foreground";
    const showPercentage = !task.completed && task.completionPercentage && task.completionPercentage > 0;

    return (
        <li className="flex items-center py-1 px-1.5 rounded-md transition-colors duration-150 ease-out group hover:bg-accent/50"
            title={task.title}>
            <Icon name={iconName} size={13} className={cn("mr-2 flex-shrink-0 transition-colors", iconColor)}
                  strokeWidth={task.completed ? 2.5 : 1.75}/>
            <div className="flex items-baseline flex-1 overflow-hidden">
                <span className={cn("text-xs truncate", textColor, task.completed && "line-through")}>
                    {task.title || <span className="italic">Untitled Task</span>}
                </span>
                {showPercentage && (<Badge variant="outline"
                                           className="ml-1.5 text-[9px] px-1 py-0 border-primary/50 text-primary/90 bg-primary/10 h-[14px]"> {task.completionPercentage}% </Badge>)}
            </div>
        </li>
    );
});
ReferencedTaskItem.displayName = 'ReferencedTaskItem';

// --- Main Modal Component (Refactored with Dialog) ---
interface SummaryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summaries: StoredSummary[];
    allTasks: Task[]; // Keep passing all tasks for detail lookup
}

const SummaryHistoryModal: React.FC<SummaryHistoryModalProps> = ({isOpen, onClose, summaries, allTasks}) => {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    // Handle Dialog open/close state
    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose(); // Call the parent onClose when Dialog closes
        }
        // Opening is controlled by the parent's isOpen prop
    }, [onClose]);

    // Effect for default selection and reset
    useEffect(() => {
        if (isOpen) {
            const validSelectionExists = summaries.some(s => s.id === selectedSummaryId);
            if (summaries.length > 0 && !validSelectionExists) {
                setSelectedSummaryId(summaries[0].id);
            } else if (summaries.length === 0) {
                setSelectedSummaryId(null);
            }
            // Optionally focus search input on open
            const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        } else {
            // Reset state on close
            setSelectedSummaryId(null);
            setSearchTerm('');
        }
    }, [isOpen, summaries, selectedSummaryId]);

    // Memoized data processing (logic unchanged)
    const selectedSummary = useMemo(() => summaries.find(s => s.id === selectedSummaryId) ?? null, [selectedSummaryId, summaries]);
    const selectedReferencedTasks = useMemo(() => {
        if (!selectedSummary) return [];
        const referencedIds = new Set(selectedSummary.taskIds);
        return allTasks.filter(task => referencedIds.has(task.id))
            .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1) || a.title.localeCompare(b.title));
    }, [selectedSummary, allTasks]);

    const groupedSummaries = useMemo(() => { /* ... (same grouping logic) ... */
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

    const filteredGroupedSummaries = useMemo(() => { /* ... (same filtering logic) ... */
        if (!debouncedSearchTerm) return groupedSummaries;
        const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
        const filtered: { dateKey: string; items: StoredSummary[] }[] = [];
        groupedSummaries.forEach(group => {
            const matchingItems = group.items.filter(summary => {
                const {periodLabel, listLabel} = getFilterLabels(summary.periodKey, summary.listKey);
                return (summary.summaryText.toLowerCase().includes(lowerSearchTerm) || periodLabel.toLowerCase().includes(lowerSearchTerm) || listLabel.toLowerCase().includes(lowerSearchTerm));
            });
            if (matchingItems.length > 0) filtered.push({dateKey: group.dateKey, items: matchingItems});
        });
        return filtered;
    }, [groupedSummaries, debouncedSearchTerm]);

    // Callbacks and Handlers (logic unchanged)
    const formatDateGroupKey = (dateKey: string): string => { /* ... */
        const date = parseISO(dateKey);
        if (!isValid(date)) return "Invalid Date";
        const now = new Date();
        if (isSameDay(date, now)) return 'Today';
        if (isSameDay(date, startOfDay(subDays(now, 1)))) return 'Yesterday';
        return format(date, date.getFullYear() === now.getFullYear() ? 'MMMM d' : 'MMMM d, yyyy');
    };
    const handleSelectSummary = useCallback((summaryId: string) => setSelectedSummaryId(summaryId), []);
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */
        setSearchTerm(e.target.value);
        if (e.target.value === '' && !summaries.find(s => s.id === selectedSummaryId)) setSelectedSummaryId(summaries[0]?.id ?? null);
    };
    const handleClearSearch = useCallback(() => { /* ... */
        setSearchTerm('');
        searchInputRef.current?.focus();
        if (!summaries.find(s => s.id === selectedSummaryId)) setSelectedSummaryId(summaries[0]?.id ?? null);
    }, [summaries, selectedSummaryId]);
    const highlighterProps = useMemo(() => ({ /* ... */
        highlightClassName: "bg-primary/20 text-inherit font-semibold rounded-[1px] px-0",
        searchWords: debouncedSearchTerm.split(' ').filter(Boolean),
        autoEscape: true,
        textToHighlight: '',
    }), [debouncedSearchTerm]);

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className={cn(
                "max-w-5xl h-[80vh] max-h-[700px] p-0 gap-0 flex overflow-hidden", // Size and layout
                "bg-background/80 dark:bg-card/60 backdrop-blur-xl", // Appearance
                "border-border/50 !rounded-xl" // Shadcn overrides
            )}>
                {/* Header */}
                <DialogHeader
                    className="px-5 py-3 border-b border-border/50 flex-row justify-between items-center flex-shrink-0 h-[55px]">
                    <DialogTitle className="text-base font-semibold text-foreground flex items-center">
                        <Icon name="history" size={16} className="mr-2 text-muted-foreground"/>
                        Summary History
                    </DialogTitle>
                    {/* DialogClose is implicitly added by shadcn Dialog */}
                </DialogHeader>

                {/* Main Content: Two Panes */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* --- Left Pane: Search + History List --- */}
                    <div
                        className="w-[340px] border-r border-border/50 flex flex-col overflow-hidden flex-shrink-0 bg-secondary/20 dark:bg-black/10">
                        {/* Search Area */}
                        <div className="p-3 border-b border-border/50 flex-shrink-0">
                            <div className="relative">
                                <Icon name="search" size={15}
                                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10"/>
                                <Input
                                    ref={searchInputRef} type="search" placeholder="Search history..."
                                    value={searchTerm} onChange={handleSearchChange}
                                    className={cn("h-8 pl-8 pr-7 text-sm rounded-md", "bg-background/50 dark:bg-black/30", "border-border/60 focus:border-primary/50", "placeholder:text-muted-foreground")}
                                    aria-label="Search summaries"
                                />
                                {searchTerm && (<button onClick={handleClearSearch}
                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground z-10"
                                                        aria-label="Clear search"><Icon name="x-circle" size={14}/>
                                </button>)}
                            </div>
                        </div>
                        {/* List Area */}
                        <ScrollArea className="flex-1 styled-scrollbar-thin">
                            <div className="pb-2"> {/* Padding at bottom */}
                                {summaries.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-10 px-4 italic">No
                                        summaries generated yet.</p>
                                ) : filteredGroupedSummaries.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-10 px-4 italic">No
                                        summaries match "{debouncedSearchTerm}".</p>
                                ) : (
                                    filteredGroupedSummaries.map(({dateKey, items}) => (
                                        <div key={dateKey} className="pt-1">
                                            <h3 className="px-3.5 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide sticky top-0 bg-secondary/50 dark:bg-black/30 backdrop-blur-sm z-10 border-b border-border/30">
                                                {formatDateGroupKey(dateKey)}
                                            </h3>
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
                                                                className={cn("w-full text-left p-2 hover:bg-accent dark:hover:bg-accent/60 transition-colors duration-100 ease-out rounded-lg mb-0.5", isSelected && "bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25")}
                                                                onClick={() => handleSelectSummary(summary.id)}
                                                                aria-current={isSelected ? 'page' : undefined}
                                                            >
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span
                                                                        className="text-[11px] font-medium text-muted-foreground"> {format(summary.createdAt, 'p')} </span>
                                                                    <div
                                                                        className="flex items-center space-x-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                                                        <Badge variant="outline"
                                                                               className="px-1.5 py-0 text-[9px] font-medium border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300"
                                                                               title={periodLabel}> <Icon
                                                                            name="calendar-days" size={9}
                                                                            className="mr-1 opacity-70"/> <span
                                                                            className="truncate">{periodLabel}</span>
                                                                        </Badge>
                                                                        <Badge variant="secondary"
                                                                               className="px-1.5 py-0 text-[9px] font-medium"
                                                                               title={listLabel}> <Icon name="list"
                                                                                                        size={9}
                                                                                                        className="mr-1 opacity-70"/>
                                                                            <span
                                                                                className="truncate">{listLabel}</span>
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <p className={cn("text-xs text-muted-foreground leading-snug", isSelected && "text-foreground dark:text-foreground/90")}>
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
                        </ScrollArea>
                    </div>

                    {/* --- Right Pane: Summary Detail --- */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-background/80">
                        {selectedSummary ? (
                            <div className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden">
                                {/* Detail Header */}
                                <div className="flex justify-between items-center mb-3 flex-shrink-0 gap-2">
                                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                        <Badge variant="outline"
                                               className="border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-300 text-[11px] font-medium">
                                            <Icon name="calendar-days" size={11}
                                                  className="mr-1 opacity-70"/> {getFilterLabels(selectedSummary.periodKey, selectedSummary.listKey).periodLabel}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[11px] font-medium"> <Icon
                                            name="list" size={11}
                                            className="mr-1 opacity-70"/> {getFilterLabels(selectedSummary.periodKey, selectedSummary.listKey).listLabel}
                                        </Badge>
                                    </div>
                                    <span
                                        className="text-[11px] text-muted-foreground whitespace-nowrap pl-2 flex-shrink-0">
                                         {formatDistanceToNowStrict(selectedSummary.createdAt, {addSuffix: true})}
                                        {selectedSummary.updatedAt && selectedSummary.updatedAt > selectedSummary.createdAt + 10000 &&
                                            <span className="italic ml-1">(edited)</span>}
                                    </span>
                                </div>
                                {/* Summary Content Editor */}
                                <div
                                    className={cn("flex-1 min-h-0 mb-3 rounded-lg overflow-hidden relative", "bg-secondary/20 dark:bg-black/15", "border border-border/50")}>
                                    <CodeMirrorEditor key={selectedSummary.id} value={selectedSummary.summaryText}
                                                      onChange={() => {
                                                      }} readOnly={true}
                                                      className="!h-full !border-none !shadow-none !bg-transparent"
                                                      placeholder="Summary content..."/>
                                </div>
                                {/* Referenced Tasks Section */}
                                <div
                                    className="flex-shrink-0 max-h-[30%] overflow-hidden flex flex-col border-t border-border/50 pt-2">
                                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 px-1 flex-shrink-0">
                                        Referenced Tasks ({selectedReferencedTasks.length})
                                    </h4>
                                    {selectedReferencedTasks.length > 0 ? (
                                        <ScrollArea className="flex-1 styled-scrollbar-thin pr-1">
                                            <ul className="space-y-0">
                                                {selectedReferencedTasks.map(task => (
                                                    <ReferencedTaskItem key={task.id} task={task}/>))}
                                            </ul>
                                        </ScrollArea>
                                    ) : (<p className="text-xs text-muted-foreground italic px-1 py-2">No tasks were
                                        referenced.</p>)}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm italic p-10 text-center">
                                <Icon name="file-text" size={32} className="mb-3 opacity-30"/>
                                Select a summary<br/>to view details.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
SummaryHistoryModal.displayName = 'SummaryHistoryModal';
export default SummaryHistoryModal;