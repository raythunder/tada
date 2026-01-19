/**
 * ICS Calendar Service
 *
 * Provides functionality to sync tasks to a server and generate ICS calendar files.
 */

import { Task } from '@/types';
import { format } from 'date-fns';

export interface SyncResult {
    success: boolean;
    message: string;
    tasksWithDueDate?: number;
    error?: string;
}

/**
 * Sync tasks to the ICS server
 */
export async function syncTasksToServer(
    tasks: Task[],
    serverUrl: string
): Promise<SyncResult> {
    try {
        // Only sync necessary fields
        const syncTasks = tasks.map(t => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            dueDate: t.dueDate,
            content: t.content,
            priority: t.priority,
            listName: t.listName,
        }));

        const response = await fetch(`${serverUrl}/api/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tasks: syncTasks }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                message: 'Sync failed',
                error: errorData.error || `HTTP ${response.status}`,
            };
        }

        const result = await response.json();
        return {
            success: true,
            message: result.message,
            tasksWithDueDate: result.tasksWithDueDate,
        };
    } catch (error) {
        return {
            success: false,
            message: 'Network error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get the calendar subscription URL
 */
export function getCalendarUrl(serverUrl: string): string {
    // Remove trailing slash
    const baseUrl = serverUrl.replace(/\/+$/, '');
    return `${baseUrl}/calendar.ics`;
}

/**
 * Test server connection
 */
export async function testServerConnection(serverUrl: string): Promise<boolean> {
    try {
        const response = await fetch(`${serverUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Helper to escape text for ICS format
 */
function escapeICS(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Generates ICS file content from tasks
 */
export function generateIcsContent(tasks: Task[]): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Tada//Task Manager//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    const now = new Date();
    const dtStamp = format(now, "yyyyMMdd'T'HHmmss'Z'");

    tasks.forEach(task => {
        // Skip trash or tasks without due date
        if (task.listName === 'Trash' || !task.dueDate) return;

        const dateObj = new Date(task.dueDate);
        if (isNaN(dateObj.getTime())) return;

        // Use All-Day event format (YYYYMMDD)
        const dtStart = format(dateObj, 'yyyyMMdd');
        // For all-day events, DTEND is exclusive, so add 1 day
        const dtEndObj = new Date(dateObj);
        dtEndObj.setDate(dtEndObj.getDate() + 1);
        const dtEnd = format(dtEndObj, 'yyyyMMdd');

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${task.id}`);
        lines.push(`DTSTAMP:${dtStamp}`);
        lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
        lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
        lines.push(`SUMMARY:${escapeICS(task.title)}`);

        let description = task.content ? escapeICS(task.content) : '';
        if (task.listName) {
            description = `[${escapeICS(task.listName)}] ${description}`;
        }
        if (description) {
            lines.push(`DESCRIPTION:${description}`);
        }

        // Status
        if (task.completed) {
            lines.push('STATUS:CONFIRMED'); // Or COMPLETED if converting to VTODO
        } else {
            lines.push('STATUS:CONFIRMED');
        }

        lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

/**
 * Triggers a download of the ICS file in the browser
 */
export function downloadIcsFile(content: string, filename: string = 'tada_calendar.ics') {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}