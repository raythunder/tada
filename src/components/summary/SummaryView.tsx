// src/components/summary/SummaryView.tsx
import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor, { CodeMirrorEditorRef } from '../common/CodeMirrorEditor';
import { useAtomValue } from 'jotai';
import { tasksAtom } from '@/store/atoms';
import { Task } from '@/types'; // Import Task type
import {
    endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, isValid, safeParseDate, startOfDay, endOfDay, subWeeks, enUS
} from '@/utils/dateUtils';
import { twMerge } from "tailwind-merge";

type SummaryPeriod = 'this-week' | 'last-week' | 'this-month' | 'last-month';

// --- Custom Hook for Date Calculations (Memoized internally) ---
const useDateCalculations = () => {
    // Performance: useCallback for functions
    const getDateRange = useCallback((period: SummaryPeriod): { start: Date, end: Date } => {
        const now = new Date();
        const todayStart = startOfDay(now);
        let startDt: Date, endDt: Date;

        switch (period) {
            case 'last-week':
                startDt = startOfWeek(subWeeks(todayStart, 1), { locale: enUS });
                endDt = endOfWeek(subWeeks(todayStart, 1), { locale: enUS });
                break;
            case 'this-month':
                startDt = startOfMonth(todayStart);
                endDt = endOfMonth(todayStart);
                break;
            case 'last-month':
                startDt = startOfMonth(subMonths(todayStart, 1));
                endDt = endOfMonth(subMonths(todayStart, 1));
                break;
            case 'this-week':
            default:
                startDt = startOfWeek(todayStart, { locale: enUS });
                endDt = endOfWeek(todayStart, { locale: enUS });
                break;
        }
        // Ensure end date captures the whole day for filtering
        return { start: startOfDay(startDt), end: endOfDay(endDt) };
    }, []);

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
        return `${format(startDt, startFormat)} - ${format(endDt, 'd, yyyy')}`;
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

    // Performance: Memoize period options array creation
    const periodOptions = useMemo(() => {
        const createOption = (value: SummaryPeriod) => {
            const { start, end } = getDateRange(value);
            return { value, label: getPeriodLabel(value), rangeLabel: formatDateRange(start, end) };
        };
        return [
            createOption('this-week'),
            createOption('last-week'),
            createOption('this-month'),
            createOption('last-month'),
        ] as const; // Use const assertion for stricter typing
    }, [getDateRange, getPeriodLabel, formatDateRange]);

    return { getDateRange, formatDateRange, getPeriodLabel, periodOptions };
};


// --- Summary View Component ---
const SummaryView: React.FC = () => {
    const tasks = useAtomValue(tasksAtom);
    const [summaryContent, setSummaryContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [period, setPeriod] = useState<SummaryPeriod>('this-week'); // Default period
    const editorRef = useRef<CodeMirrorEditorRef>(null);

    // Use the custom hook for date logic
    const { getDateRange, formatDateRange, getPeriodLabel, periodOptions } = useDateCalculations();

    // Performance: Memoize generateSummary callback
    const generateSummary = useCallback(async () => {
        setIsLoading(true);
        setSummaryContent(''); // Clear previous summary immediately

        // Simulate AI generation delay - Keep this for UX feedback
        await new Promise(resolve => setTimeout(resolve, 450));

        const { start: rangeStart, end: rangeEnd } = getDateRange(period);

        // --- Performance: Filter and sort tasks efficiently ---
        let completedInRange: Task[] = [];
        let addedInRange: Task[] = [];

        tasks.forEach(task => {
            if (task.list !== 'Trash') {
                // Completed check
                if (task.completed && task.updatedAt >= rangeStart.getTime() && task.updatedAt <= rangeEnd.getTime()) {
                    completedInRange.push(task);
                }
                // Added check
                if (task.createdAt >= rangeStart.getTime() && task.createdAt <= rangeEnd.getTime()) {
                    addedInRange.push(task);
                }
            }
        });

        // Sort results after filtering
        completedInRange.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)); // Most recently completed first
        addedInRange.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); // Most recently added first
        // --- End Performance Optimization ---

        // Format the summary text
        const periodTitle = getPeriodLabel(period);
        const dateRangeStr = formatDateRange(rangeStart, rangeEnd);

        let generatedText = `# Summary for ${periodTitle}\n`;
        generatedText += `*${dateRangeStr}*\n\n`;

        // Completed Tasks Section
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

        // Added Tasks Section
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

        // Focus the editor after content update using requestAnimationFrame
        requestAnimationFrame(() => {
            editorRef.current?.focus();
        });

    }, [tasks, period, getDateRange, formatDateRange, getPeriodLabel]); // Dependencies

    // Optional: Generate summary automatically when period changes or component mounts
    useEffect(() => {
        generateSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]); // Run only when period changes

    // Performance: Memoize editor placeholder calculation
    const editorPlaceholder = useMemo(() => {
        if (isLoading) return "Generating summary...";
        return "Click 'Generate' to create a report for the selected period,\nor start typing your own notes...\n\nSupports **Markdown** formatting.";
    }, [isLoading]);

    return (
        <div className="h-full flex flex-col bg-glass backdrop-blur-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 border-b border-black/10 flex justify-between items-center flex-shrink-0 bg-glass-100 backdrop-blur-xl z-10 h-11">
                <h1 className="text-lg font-semibold text-gray-800">AI Summary</h1>
                <Button
                    variant="primary"
                    size="sm"
                    icon="sparkles"
                    onClick={generateSummary} // Use memoized callback
                    loading={isLoading}
                    disabled={isLoading}
                    className="!h-[30px] px-3" // Custom button styling
                >
                    {isLoading ? 'Generating...' : 'Generate'}
                </Button>
            </div>

            {/* Period Selection Bar */}
            <div className="px-4 py-1.5 border-b border-black/10 flex justify-start items-center flex-shrink-0 bg-glass-alt-100 backdrop-blur-lg space-x-1 h-9 z-[5]">
                <span className="text-xs text-muted-foreground mr-2 font-medium">Period:</span>
                {periodOptions.map(opt => (
                    <Button
                        key={opt.value}
                        onClick={() => setPeriod(opt.value)}
                        variant={period === opt.value ? 'primary' : 'glass'} // Highlight active period
                        size="sm"
                        className={twMerge(
                            "text-xs !h-6 px-2 font-medium backdrop-blur-md", // Common styles
                            period === opt.value && "!text-primary-foreground", // Active text color
                            period !== opt.value && "!text-gray-600 hover:!bg-glass-alt-100 active:!bg-glass-alt-200" // Inactive styles
                        )}
                        title={opt.rangeLabel} // Show date range on hover
                        aria-pressed={period === opt.value} // Accessibility
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>

            {/* Content Area with CodeMirror Editor */}
            <div className="flex-1 p-3 overflow-hidden relative">
                <div className="h-full w-full relative rounded-md overflow-hidden border border-black/10 shadow-inner bg-glass-inset backdrop-blur-lg">
                    {/* Loading Indicator Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-glass/50 backdrop-blur-md flex items-center justify-center z-10 rounded-md pointer-events-none">
                            <Icon name="loader" size={24} className="text-primary animate-spin" />
                        </div>
                    )}

                    {/* Performance: CodeMirrorEditor is memoized */}
                    <CodeMirrorEditor
                        ref={editorRef}
                        value={summaryContent}
                        onChange={setSummaryContent} // Allow user edits
                        className="h-full w-full !border-0 !shadow-none focus-within:!ring-0 !bg-transparent rounded-md" // Custom styling
                        placeholder={editorPlaceholder} // Use memoized placeholder
                        readOnly={isLoading} // Prevent editing while loading
                    />
                </div>
            </div>
        </div>
    );
};

export default SummaryView;