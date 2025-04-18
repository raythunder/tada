// src/components/summary/SummaryView.tsx
import React, {useCallback, useState, useMemo, useRef} from 'react';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, { CodeMirrorEditorRef } from '../common/CodeMirrorEditor'; // Ensure ref type is imported
import { useAtomValue } from 'jotai';
import { tasksAtom } from '@/store/atoms';
import {
    endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, isValid, safeParseDate, startOfDay, endOfDay, subWeeks, enUS
} from '@/utils/dateUtils';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from "tailwind-merge";

// Define summary periods
type SummaryPeriod = 'this-week' | 'last-week' | 'this-month' | 'last-month';

// --- Helper Functions (Memoized) ---
const useDateCalculations = (period: SummaryPeriod) => {
    const getDateRange = useCallback((): { start: Date, end: Date } => {
        const now = new Date();
        const todayStart = startOfDay(now);
        switch (period) {
            case 'last-week': {
                const lastWeekStart = startOfWeek(subWeeks(todayStart, 1), { locale: enUS });
                const lastWeekEnd = endOfWeek(subWeeks(todayStart, 1), { locale: enUS });
                return { start: lastWeekStart, end: lastWeekEnd };
            }
            case 'this-month':
                return { start: startOfMonth(todayStart), end: endOfMonth(todayStart) };
            case 'last-month': {
                const lastMonthStart = startOfMonth(subMonths(todayStart, 1));
                const lastMonthEnd = endOfMonth(subMonths(todayStart, 1));
                return { start: lastMonthStart, end: lastMonthEnd };
            }
            case 'this-week':
            default: {
                const currentWeekStart = startOfWeek(todayStart, { locale: enUS });
                const currentWeekEnd = endOfWeek(todayStart, { locale: enUS });
                return { start: currentWeekStart, end: currentWeekEnd };
            }
        }
    }, [period]);

    const formatDateRange = useCallback((startDt: Date, endDt: Date): string => {
        if (!isValid(startDt) || !isValid(endDt)) return "Invalid Date Range";
        const startFormat = 'MMM d';
        const endFormat = 'MMM d, yyyy';
        if (startDt.getFullYear() !== endDt.getFullYear()) {
            return `${format(startDt, 'MMM d, yyyy')} - ${format(endDt, endFormat)}`;
        }
        if (startDt.getMonth() !== endDt.getMonth()) {
            return `${format(startDt, startFormat)} - ${format(endDt, endFormat)}`;
        }
        return `${format(startDt, startFormat)} - ${format(endDt, endFormat)}`;
    }, []);

    const getPeriodLabel = useCallback((p: SummaryPeriod): string => {
        switch (p) {
            case 'this-week': return 'This Week';
            case 'last-week': return 'Last Week';
            case 'this-month': return 'This Month';
            case 'last-month': return 'Last Month';
            default: return '';
        }
    }, []);

    const periodOptions = useMemo(() => {
        const now = new Date();
        const thisWeekStart = startOfWeek(now, { locale: enUS });
        const thisWeekEnd = endOfWeek(now, { locale: enUS });
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { locale: enUS });
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { locale: enUS });
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        return [
            { value: 'this-week', label: 'This Week', rangeLabel: formatDateRange(thisWeekStart, thisWeekEnd) },
            { value: 'last-week', label: 'Last Week', rangeLabel: formatDateRange(lastWeekStart, lastWeekEnd) },
            { value: 'this-month', label: 'This Month', rangeLabel: formatDateRange(thisMonthStart, thisMonthEnd)},
            { value: 'last-month', label: 'Last Month', rangeLabel: formatDateRange(lastMonthStart, lastMonthEnd) },
        ] as const;
    }, [formatDateRange]);


    return { getDateRange, formatDateRange, getPeriodLabel, periodOptions };
};


// --- Summary View Component ---
const SummaryView: React.FC = () => {
    const tasks = useAtomValue(tasksAtom);
    const [summaryContent, setSummaryContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [period, setPeriod] = useState<SummaryPeriod>('this-week');
    const editorRef = useRef<CodeMirrorEditorRef>(null);

    const { getDateRange, formatDateRange, getPeriodLabel, periodOptions } = useDateCalculations(period);

    const generateSummary = useCallback(async () => {
        setIsLoading(true);
        setSummaryContent('');

        await new Promise(resolve => setTimeout(resolve, 400)); // Slightly faster delay

        const { start: rangeStart, end: rangeEnd } = getDateRange();
        const rangeEndInclusive = endOfDay(rangeEnd);

        const completedInRange = tasks.filter(task =>
            task.completed &&
            task.list !== 'Trash' &&
            task.updatedAt >= rangeStart.getTime() &&
            task.updatedAt <= rangeEndInclusive.getTime()
        ).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        const addedInRange = tasks.filter(task =>
            task.list !== 'Trash' &&
            task.createdAt >= rangeStart.getTime() &&
            task.createdAt <= rangeEndInclusive.getTime()
        ).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const periodTitle = getPeriodLabel(period);
        const dateRangeStr = formatDateRange(rangeStart, rangeEnd);

        let generatedText = `# Summary for ${periodTitle}\n`;
        generatedText += `*${dateRangeStr}*\n\n`;

        generatedText += `## ✅ Completed Tasks (${completedInRange.length})\n`;
        if (completedInRange.length > 0) {
            completedInRange.forEach(task => {
                const completedDate = safeParseDate(task.updatedAt);
                const dateStr = completedDate && isValid(completedDate) ? format(completedDate, 'MMM d') : 'Unknown Date';
                generatedText += `- ${task.title || 'Untitled Task'} *(Done: ${dateStr})*\n`;
            });
        } else {
            generatedText += `*No tasks completed during this period.*\n`;
        }
        generatedText += "\n";

        generatedText += `## ➕ Added Tasks (${addedInRange.length})\n`;
        if (addedInRange.length > 0) {
            addedInRange.forEach(task => {
                const createdDate = safeParseDate(task.createdAt);
                const dateStr = createdDate && isValid(createdDate) ? format(createdDate, 'MMM d') : 'Unknown Date';
                generatedText += `- ${task.title || 'Untitled Task'} *(Added: ${dateStr})*\n`;
            });
        } else {
            generatedText += `*No new tasks added during this period.*\n`;
        }

        setSummaryContent(generatedText);
        setIsLoading(false);
        editorRef.current?.focus();

    }, [tasks, period, getDateRange, formatDateRange, getPeriodLabel]); // Dependencies

    return (
        // Apply STRONG glass effect to main container
        <div className="h-full flex flex-col bg-glass backdrop-blur-xl">
            {/* Header with Strong Glass Effect */}
            <div className="px-4 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 bg-glass-100 backdrop-blur-lg z-10 h-11"> {/* Stronger glass */}
                <h1 className="text-lg font-semibold text-gray-800">AI Summary</h1>
                <Button
                    variant="primary"
                    size="sm"
                    icon="sparkles"
                    onClick={generateSummary}
                    loading={isLoading}
                    disabled={isLoading}
                    className="!h-[30px] px-3"
                >
                    {isLoading ? 'Generating...' : 'Generate'}
                </Button>
            </div>

            {/* Filters Bar - Glass Background */}
            <div className="px-4 py-1.5 border-b border-black/10 flex justify-start items-center flex-shrink-0 bg-glass-alt-200 backdrop-blur-lg space-x-1 h-9 z-[5]"> {/* Glass filter bar */}
                <span className="text-xs text-muted-foreground mr-2 font-medium">Period:</span>
                {periodOptions.map(opt => (
                    <Button
                        key={opt.value}
                        onClick={() => setPeriod(opt.value)}
                        variant={period === opt.value ? 'primary' : 'glass'} // Use glass/primary
                        size="sm"
                        className={twMerge(
                            "text-xs !h-6 px-2 font-medium",
                            period === opt.value && "!text-primary-foreground",
                            period !== opt.value && "!text-gray-600 hover:!bg-glass-100" // Adjust inactive glass hover
                        )}
                        title={opt.rangeLabel}
                        aria-pressed={period === opt.value}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-3 overflow-hidden relative">
                {/* Container now provides the glass effect FOR the editor via className */}
                <div className="h-full w-full relative rounded-md overflow-hidden border border-black/10 shadow-inner"> {/* Subtle border, inner shadow */}
                    <AnimatePresence>
                        {isLoading && (
                            <motion.div
                                className="absolute inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-md" // Match rounding, add blur
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Icon name="loader" size={24} className="text-primary animate-spin" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CodeMirror Editor - Now uses glass effect from its container */}
                    <CodeMirrorEditor
                        ref={editorRef}
                        value={summaryContent}
                        onChange={setSummaryContent}
                        // No internal border/shadow needed, let container handle glass
                        className="h-full w-full !border-0 !shadow-none focus-within:!ring-0 !bg-transparent rounded-md" // Make editor transparent
                        placeholder={
                            isLoading
                                ? "Generating summary..."
                                : "Click 'Generate' to create a report for the selected period,\nor start typing your own notes...\n\nSupports **Markdown** formatting."
                        }
                        readOnly={isLoading}
                        // useGlassEffect is now implicitly handled by the container + theme
                    />
                </div>
            </div>
        </div>
    );
};

export default SummaryView;