// src/types/index.ts
export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isPremium: boolean;
}

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: number | null; // Store as timestamp (milliseconds since epoch)
    list: string;
    content?: string; // Markdown content
    order: number; // For manual sorting within filters/lists
    createdAt: number; // Timestamp
    updatedAt: number; // Timestamp
    tags?: string[];
    priority?: number; // e.g., 1 (High) - 4 (Low)
}

export type ListDisplayMode = 'expanded' | 'compact';

export type TaskFilter = 'all' | 'today' | 'next7days' | 'completed' | 'trash' | `list-${string}` | `tag-${string}`;

export type SettingsTab =
    | 'account' | 'premium' | 'features' | 'smart-list' | 'notifications'
    | 'date-time' | 'appearance' | 'more' | 'integrations' | 'collaborate'
    | 'shortcuts' | 'about';

// Grouping category for 'all' tasks view
export type TaskGroupCategory = 'overdue' | 'today' | 'next7days' | 'later' | 'nodate';