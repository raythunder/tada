// src/components/summary/SummaryView.tsx
import React, {useCallback, useState, useMemo, useRef} from 'react';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, { CodeMirrorEditorRef } from '../common/CodeMirrorEditor';
import { useAtomValue } from 'jotai';
import { tasksAtom } from '@/store/atoms';
import {
    endOfMonth,
    endOfWeek,
    format,
    startOfMonth,
    startOfWeek,
    subMonths,
    isValid,
    safeParseDate,
    startOfDay,
    enUS,
    subWeeks, endOfDay
} from '@/utils/dateUtils';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from "tailwind-merge";


type SummaryPeriod = 'this-week' | 'last-week' | 'this-month' | 'last-month';

// --- Helper Functions (Memoized) ---
const useDateCalculations = (period: SummaryPeriod) => {
    const getDateRange = useCallback((): { start: Date, end: Date } => {
        const now = new Date(); const todayStart = startOfDay(now);
        switch (period) {
            case 'last-week': { const lw = subWeeks(todayStart, 1); return { start: startOfWeek(lw, { locale: enUS }), end: endOfWeek(lw, { locale: enUS }) }; }
            case 'this-month': return { start: startOfMonth(todayStart), end: endOfMonth(todayStart) };
            case 'last-month': { const lm = subMonths(todayStart, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
            case 'this-week': default: return { start: startOfWeek(todayStart, { locale: enUS }), end: endOfWeek(todayStart, { locale: enUS }) };
        }
    }, [period]);

    const formatDateRange = useCallback((startDt: Date, endDt: Date): string => {
        if (!isValid(startDt) || !isValid(endDt)) return "Invalid Date Range";
        const startFormat = 'MMM d'; const endFormat = 'MMM d, yyyy';
        if (startDt.getFullYear() !== endDt.getFullYear()) return `${format(startDt, 'MMM d, yyyy')} - ${format(endDt, endFormat)}`;
        if (startDt.getMonth() !== endDt.getMonth()) return `${format(startDt, startFormat)} - ${format(endDt, endFormat)}`;
        if (startDt.getDate() !== endDt.getDate()) return `${format(startDt, startFormat)} - ${format(endDt, endFormat)}`;
        return format(startDt, endFormat);
    }, []);

    const getPeriodLabel = useCallback((p: SummaryPeriod): string => {
        switch (p) {
            case 'this-week': return 'This Week'; case 'last-week': return 'Last Week';
            case 'this-month': return 'This Month'; case 'last-month': return 'Last Month'; default: return '';
        }
    }, []);

    const periodOptions = useMemo(() => {
        // const now = new Date();
        const d = (_p: SummaryPeriod) => getDateRange(); // Use useCallback result directly
        const thisWeek = d('this-week'); const lastWeek = d('last-week');
        const thisMonth = d('this-month'); const lastMonth = d('last-month');
        return [
            { value: 'this-week', label: 'This Week', rangeLabel: formatDateRange(thisWeek.start, thisWeek.end) },
            { value: 'last-week', label: 'Last Week', rangeLabel: formatDateRange(lastWeek.start, lastWeek.end) },
            { value: 'this-month', label: 'This Month', rangeLabel: formatDateRange(thisMonth.start, thisMonth.end) },
            { value: 'last-month', label: 'Last Month', rangeLabel: formatDateRange(lastMonth.start, lastMonth.end) },
        ] as const;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formatDateRange]); // Dependencies are correct

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
        await new Promise(resolve => setTimeout(resolve, 400)); // Even shorter delay

        const { start: rangeStart, end: rangeEnd } = getDateRange();
        const rangeEndInclusive = endOfDay(rangeEnd);

        const completedInRange = tasks.filter(t => t.completed && t.list !== 'Trash' && t.updatedAt >= rangeStart.getTime() && t.updatedAt <= rangeEndInclusive.getTime()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const addedInRange = tasks.filter(t => t.list !== 'Trash' && t.createdAt >= rangeStart.getTime() && t.createdAt <= rangeEndInclusive.getTime()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const periodTitle = getPeriodLabel(period);
        const dateRangeStr = formatDateRange(rangeStart, rangeEnd);
        let generatedText = `# Summary for ${periodTitle}\n*${dateRangeStr}*\n\n`;
        generatedText += `## ✅ Completed Tasks (${completedInRange.length})\n`;
        if (completedInRange.length > 0) completedInRange.forEach(task => { generatedText += `- ${task.title || 'Untitled Task'} *(Done: ${format(safeParseDate(task.updatedAt)!, 'MMM d')})*\n`; });
        else generatedText += `*No tasks completed during this period.*\n`;
        generatedText += "\n";
        generatedText += `## ➕ Added Tasks (${addedInRange.length})\n`;
        if (addedInRange.length > 0) addedInRange.forEach(task => { generatedText += `- ${task.title || 'Untitled Task'} *(Added: ${format(safeParseDate(task.createdAt)!, 'MMM d')})*\n`; });
        else generatedText += `*No new tasks added during this period.*\n`;

        setSummaryContent(generatedText);
        setIsLoading(false);
        editorRef.current?.focus();
    }, [tasks, period, getDateRange, formatDateRange, getPeriodLabel]);

    // --- Render ---
    return (
        <div className="h-full flex flex-col bg-canvas">
            {/* Header with Glass Effect */}
            <div className="px-4 py-2 border-b border-black/5 flex justify-between items-center flex-shrink-0 bg-glass-200 backdrop-blur-sm z-10 h-11">
                <h1 className="text-lg font-semibold text-gray-800">AI Summary</h1>
                <Button variant="primary" size="sm" icon="sparkles" onClick={generateSummary} loading={isLoading} disabled={isLoading} className="px-3">
                    {isLoading ? 'Generating...' : 'Generate'}
                </Button>
            </div>

            {/* Filters Bar - Subtle Background */}
            <div className="px-4 py-1.5 border-b border-border-color/60 flex justify-start items-center flex-shrink-0 bg-canvas-alt/80 space-x-1 h-9">
                <span className="text-xs text-muted-foreground mr-2 font-medium">Period:</span>
                {periodOptions.map(opt => (
                    <Button
                        key={opt.value}
                        onClick={() => setPeriod(opt.value)}
                        variant={period === opt.value ? 'secondary' : 'ghost'}
                        size="sm"
                        className={twMerge("text-xs h-6 px-2 font-medium", period === opt.value && "shadow-sm !bg-white border-border-color-medium")}
                        title={opt.rangeLabel}
                        aria-pressed={period === opt.value}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-3 overflow-hidden relative">
                <div className="h-full w-full relative rounded-md overflow-hidden border border-border-color/60 bg-canvas-inset shadow-inner">
                    {/* Subtle Loading Overlay */}
                    <AnimatePresence>
                        {isLoading && (
                            <motion.div
                                className="absolute inset-0 bg-canvas/70 backdrop-blur-xs flex items-center justify-center z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }} // Faster fade
                            >
                                <Icon name="loader" size={24} className="text-primary animate-spin" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CodeMirror Editor */}
                    <CodeMirrorEditor
                        ref={editorRef}
                        value={summaryContent}
                        onChange={setSummaryContent}
                        className="h-full w-full !border-0 !bg-transparent !shadow-none focus-within:!ring-0"
                        placeholder={isLoading ? "Generating summary..." : "Click 'Generate' to create a report...\nSupports **Markdown**."}
                        readOnly={isLoading}
                    />
                </div>
            </div>
        </div>
    );
};

export default SummaryView;