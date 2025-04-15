// src/components/summary/SummaryView.tsx
import React, { useState } from 'react';
import Icon from '../common/Icon';
import Button from '../common/Button';
import CodeMirrorEditor from '../common/CodeMirrorEditor'; // Import the editor
import { useAtom } from 'jotai';
import { tasksAtom } from '@/store/atoms'; // Use tasks for potential generation
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';

const SummaryView: React.FC = () => {
    const [tasks] = useAtom(tasksAtom);
    const [summaryContent, setSummaryContent] = useState<string>(''); // State for the editor
    const [isLoading, setIsLoading] = useState<boolean>(false); // State for loading indicator

    const currentDate = new Date();
    const startOfCurrentWeek = startOfWeek(currentDate, { locale: enUS });
    const endOfCurrentWeek = endOfWeek(currentDate, { locale: enUS });

    const formatDateRange = (start: Date, end: Date) => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString(enUS.code, options)} - ${end.toLocaleDateString(enUS.code, options)}`;
    };

    // Placeholder function for generating AI summary
    const generateSummary = () => {
        setIsLoading(true);
        // Simulate API call or complex logic
        setTimeout(() => {
            // Example: Generate summary based on completed tasks this week
            const completedThisWeek = tasks.filter(task =>
                task.completed &&
                task.updatedAt >= startOfCurrentWeek.getTime() &&
                task.updatedAt <= endOfCurrentWeek.getTime()
            );

            let generatedText = `## Weekly Summary (${formatDateRange(startOfCurrentWeek, endOfCurrentWeek)})\n\n`;
            if (completedThisWeek.length > 0) {
                generatedText += `**Completed Tasks:**\n`;
                completedThisWeek.forEach(task => {
                    generatedText += `- ${task.title} (Completed: ${format(new Date(task.updatedAt), 'MMM d')})\n`;
                });
            } else {
                generatedText += "No tasks completed this week.\n";
            }

            // Add more sections (e.g., upcoming tasks, overdue tasks)
            generatedText += "\n**Notes:**\n- Start planning for next week's goals.\n";

            setSummaryContent(generatedText);
            setIsLoading(false);
        }, 1500); // Simulate 1.5 seconds delay
    };

    return (
        <div className="h-full flex flex-col bg-canvas">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-200/80 flex justify-between items-center flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-800">AI Summary</h1>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="primary"
                        size="sm"
                        icon="terminal" // Or 'sparkles' icon if available
                        onClick={generateSummary}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Generating...' : 'Generate Summary'}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Summary options">
                        <Icon name="more-horizontal" size={18} />
                    </Button>
                </div>
            </div>

            {/* Filters (Placeholder) */}
            <div className="px-4 py-2 border-b border-gray-200/60 flex justify-between items-center flex-shrink-0 bg-canvas-alt">
                <div className="text-sm text-muted-foreground">
                    Summary for: <span className="font-medium text-gray-700">This Week ({formatDateRange(startOfCurrentWeek, endOfCurrentWeek)})</span>
                </div>
                <div className="flex space-x-1">
                    <Button variant="outline" size="sm" className="text-xs">All Lists</Button>
                    <Button variant="outline" size="sm" className="text-xs">Completed Status</Button>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">Date Range</Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-4 overflow-hidden">
                {/* Use CodeMirrorEditor */}
                <CodeMirrorEditor
                    value={summaryContent}
                    onChange={setSummaryContent} // Allow manual edits
                    className="h-full border rounded-lg shadow-inner bg-white"
                    placeholder={isLoading ? "Generating summary..." : "Click 'Generate Summary' or start typing your own notes here...\n\nSupports **Markdown** formatting."}
                    readOnly={isLoading} // Make read-only while loading
                />
            </div>
        </div>
    );
};

export default SummaryView;