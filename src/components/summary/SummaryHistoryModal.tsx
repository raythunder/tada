// src/components/summary/SummaryHistoryModal.tsx
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import ReactDOM from 'react-dom';
import {AnimatePresence, motion} from 'framer-motion';
import {twMerge} from 'tailwind-merge';
import {StoredSummary} from '@/store/atoms';
import Button from '../common/Button';
import Icon from '../common/Icon';
import useClickAway from '@/hooks/useClickAway';
import {format, formatDistanceToNow, isSameDay, isValid, parseISO, startOfDay, subDays} from 'date-fns';
import CodeMirrorEditor from '../common/CodeMirrorEditor';
import {Task} from '@/types';

// --- Helper Hook: useClickAwayMultiple ---
// const useClickAwayMultiple = (
//     refs: (React.RefObject<HTMLElement | null> | HTMLElement | null)[],
//     handler: (event: MouseEvent | TouchEvent) => void
// ) => {
//     useEffect(() => {
//         const listener = (event: MouseEvent | TouchEvent) => {
//             const target = event.target as Node;
//             const isInside = refs.some(refOrEl => {
//                 const el = refOrEl instanceof HTMLElement ? refOrEl : refOrEl?.current;
//                 return el && (el.contains(target) || (target instanceof Element && !!target.closest('.ignore-click-away')));
//             });
//             if (!isInside) {
//                 handler(event);
//             }
//         };
//         const timerId = setTimeout(() => {
//             document.addEventListener('mousedown', listener);
//             document.addEventListener('touchstart', listener);
//         }, 0);
//         return () => {
//             clearTimeout(timerId);
//             document.removeEventListener('mousedown', listener);
//             document.removeEventListener('touchstart', listener);
//         };
//     }, [refs, handler]);
// };


interface SummaryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summaries: StoredSummary[];
    allTasks: Task[];
}

const SummaryHistoryModal: React.FC<SummaryHistoryModalProps> = ({
                                                                     isOpen,
                                                                     onClose,
                                                                     summaries,
                                                                     allTasks,
                                                                 }) => {
    const modalRef = React.useRef<HTMLDivElement>(null);
    useClickAway(modalRef, onClose); // Use single ref version for modal itself
    const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

    const selectedSummary = useMemo(() => {
        if (!selectedSummaryId) return null;
        return summaries.find(s => s.id === selectedSummaryId) ?? null;
    }, [selectedSummaryId, summaries]);

    const selectedReferencedTasks = useMemo(() => {
        if (!selectedSummary) return [];
        // const referencedIds = new Set(selectedSummary.taskIds);
        return selectedSummary.taskIds
            .map(id => allTasks.find(task => task.id === id))
            .filter((task): task is Task => !!task);
    }, [selectedSummary, allTasks]);

    const groupedSummaries = useMemo(() => {
        const groups: Record<string, StoredSummary[]> = {};
        const sortedSummaries = [...summaries].sort((a, b) => b.createdAt - a.createdAt);
        sortedSummaries.forEach(summary => {
            const date = new Date(summary.createdAt);
            const dateKey = format(date, 'yyyy-MM-dd');
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(summary);
        });
        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return sortedKeys.map(key => [key, groups[key]] as [string, StoredSummary[]]);
    }, [summaries]);

    const formatDateGroupKey = (dateKey: string): string => {
        const date = parseISO(dateKey); // Use parseISO for reliability
        if (!isValid(date)) return "Invalid Date";
        const now = new Date();
        if (isSameDay(date, now)) return 'Today';
        if (isSameDay(date, startOfDay(subDays(now, 1)))) return 'Yesterday';
        return format(date, 'MMMM d, yyyy');
    };

    const getFilterLabels = (periodKey: string, listKey: string): { periodLabel: string, listLabel: string } => {
        let periodLabel = periodKey;
        let listLabel = listKey;
        if (periodKey === 'today') periodLabel = 'Today'; else if (periodKey === 'yesterday') periodLabel = 'Yesterday'; else if (periodKey === 'thisWeek') periodLabel = 'This Week'; else if (periodKey === 'lastWeek') periodLabel = 'Last Week'; else if (periodKey === 'thisMonth') periodLabel = 'This Month'; else if (periodKey === 'lastMonth') periodLabel = 'Last Month'; else if (periodKey.startsWith('custom_')) {
            try {
                const [, startTs, endTs] = periodKey.split('_');
                const startDate = new Date(Number(startTs));
                const endDate = new Date(Number(endTs));
                if (isSameDay(startDate, endDate)) {
                    periodLabel = format(startDate, 'MMM d, yyyy');
                } else {
                    periodLabel = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
                }
            } catch (e) {
                periodLabel = 'Custom Range';
            }
        }
        if (listKey === 'all') listLabel = 'All Lists'; else if (listKey.startsWith('list-')) listLabel = listKey.substring(5);
        return {periodLabel, listLabel};
    };

    const handleSelectSummary = useCallback((summaryId: string) => {
        setSelectedSummaryId(summaryId);
    }, []);

    // Select the first summary if none is selected and the list is not empty
    useEffect(() => {
        if (!selectedSummaryId && summaries.length > 0) {
            setSelectedSummaryId(summaries[0].id);
        } else if (selectedSummaryId && !summaries.find(s => s.id === selectedSummaryId)) {
            // If the selected summary is no longer in the list (e.g., deleted), reset
            setSelectedSummaryId(summaries[0]?.id ?? null);
        }
    }, [summaries, selectedSummaryId]);


    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                            transition={{duration: 0.2}} onClick={onClose} aria-modal="true" role="dialog"
                            aria-labelledby="historyModalTitle">
                    <motion.div ref={modalRef}
                                className="bg-glass-100 backdrop-blur-xl w-full max-w-4xl rounded-xl shadow-strong overflow-hidden border border-black/10 flex flex-col max-h-[85vh] h-[85vh]"
                                initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}}
                                exit={{opacity: 0, scale: 0.95}} transition={{duration: 0.2, ease: 'easeOut'}}
                                onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div
                            className="px-4 py-3 border-b border-black/10 flex justify-between items-center flex-shrink-0 bg-glass-alt-100 backdrop-blur-lg">
                            <h2 id="historyModalTitle"
                                className="text-base font-semibold text-gray-800 flex items-center"><Icon name="history"
                                                                                                          size={16}
                                                                                                          className="mr-2 opacity-70"/> Summary
                                History ({summaries.length}) </h2> <Button variant="ghost" size="icon" icon="x"
                                                                           onClick={onClose}
                                                                           className="text-muted-foreground hover:bg-black/15 w-7 h-7 -mr-1"
                                                                           aria-label="Close history"/></div>
                        {/* Main Content: Two Panes */}
                        <div className="flex flex-1 overflow-hidden min-h-0">
                            {/* Left Pane: History List */}
                            <div
                                className="w-[300px] border-r border-black/10 flex flex-col overflow-hidden flex-shrink-0">
                                <div className="flex-1 overflow-y-auto styled-scrollbar"> {summaries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-10 px-4">No summaries
                                        generated yet.</p>) : (groupedSummaries.map(([dateKey, dateSummaries]) => (
                                    <div key={dateKey} className="mb-1 last:mb-0">
                                        <div
                                            className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-glass-alt-100/80 backdrop-blur-sm z-10 border-b border-t border-black/5"> {formatDateGroupKey(dateKey)} </div>
                                        <ul className="px-1.5 py-1"> {dateSummaries.map((summary) => {
                                            const {
                                                periodLabel,
                                                listLabel
                                            } = getFilterLabels(summary.periodKey, summary.listKey);
                                            const isSelected = selectedSummaryId === summary.id;
                                            return (<li key={summary.id}>
                                                <button
                                                    className={twMerge("w-full text-left p-2 hover:bg-black/10 transition-colors duration-100 ease-apple rounded mb-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50", isSelected && "bg-primary/15 hover:bg-primary/20")}
                                                    onClick={() => handleSelectSummary(summary.id)}
                                                    aria-current={isSelected ? 'page' : undefined}>
                                                    <div className="flex justify-between items-center mb-1"><span
                                                        className="text-[10px] text-muted-foreground"> {format(summary.createdAt, 'h:mm a')} </span>
                                                        <span
                                                            className="text-[10px] font-medium text-gray-600 truncate ml-2"> {periodLabel} &middot; {listLabel} </span>
                                                    </div>
                                                    <p className={twMerge("text-xs text-gray-700 line-clamp-2 leading-snug", isSelected && "text-primary-dark")}> {summary.summaryText} </p>
                                                </button>
                                            </li>);
                                        })} </ul>
                                    </div>)))} </div>
                            </div>
                            {/* Right Pane: Summary Detail */}
                            <div className="flex-1 flex flex-col overflow-hidden p-3">
                                {selectedSummary ? (
                                    <>
                                        <div className="flex justify-between items-center mb-2 flex-shrink-0 h-6">
                                            <div
                                                className="text-xs font-medium text-gray-700 flex items-center flex-wrap gap-x-1.5">
                                                <span
                                                    className="inline-flex items-center bg-blue-100/70 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-semibold"> <Icon
                                                    name="calendar-days" size={11}
                                                    className="mr-1 opacity-70"/>{getFilterLabels(selectedSummary.periodKey, selectedSummary.listKey).periodLabel}</span>
                                                <span
                                                    className="inline-flex items-center bg-gray-100/70 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-semibold"> <Icon
                                                    name="list" size={11}
                                                    className="mr-1 opacity-70"/>{getFilterLabels(selectedSummary.periodKey, selectedSummary.listKey).listLabel}</span>
                                                <span
                                                    className="text-muted-foreground text-[10px]">({selectedSummary.taskIds.length} tasks)</span>
                                            </div>
                                            <span
                                                className="text-[10px] text-muted-foreground"> Generated: {format(selectedSummary.createdAt, 'MMM d, yyyy h:mm a')} {selectedSummary.updatedAt && selectedSummary.updatedAt > selectedSummary.createdAt + 60000 && (
                                                <span
                                                    className="italic ml-1">(edited {formatDistanceToNow(selectedSummary.updatedAt, {addSuffix: true})})</span>)} </span>
                                        </div>
                                        <div
                                            className="flex-1 min-h-0 border border-black/10 rounded-md overflow-hidden bg-glass-inset-50 shadow-inner relative">
                                            <CodeMirrorEditor key={selectedSummary.id}
                                                              value={selectedSummary.summaryText} onChange={() => {
                                            }} readOnly={true} className="!h-full" placeholder="Loading summary..."/>
                                        </div>
                                        <div
                                            className="flex-shrink-0 mt-2 border-t border-black/10 pt-1.5 max-h-[30%] /* Adjusted max-h */ overflow-y-auto styled-scrollbar-thin">
                                            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 px-1 sticky top-0 bg-glass-100/80 backdrop-blur-sm">Referenced
                                                Tasks</h4>
                                            <ul className="space-y-0.5 px-1"> {selectedReferencedTasks.map(task => (
                                                <li key={task.id}
                                                    className="text-[11px] leading-tight flex items-center py-0.5"
                                                    title={task.title}><Icon
                                                    name={task.completed ? "check-square" : "square"} size={12}
                                                    className={twMerge("mr-1.5 flex-shrink-0", task.completed ? "text-primary opacity-80" : "text-muted-foreground opacity-50")}/>
                                                    <span
                                                        className={twMerge(task.completed && "line-through text-muted-foreground")}>{task.title || "Untitled"}</span>
                                                </li>))} </ul>
                                        </div>
                                    </>
                                ) : (<div
                                    className="flex items-center justify-center h-full text-muted-foreground text-sm italic"> Select
                                    a summary from the list to view details. </div>)}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
SummaryHistoryModal.displayName = 'SummaryHistoryModal';

export default SummaryHistoryModal;