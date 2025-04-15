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
    dueDate?: number | null; // Store as timestamp for easier sorting/filtering
    list: string; // Could be an ID later if lists become complex entities
    content?: string; // Markdown content
    order: number; // For manual sorting
    createdAt: number; // Timestamp
    updatedAt: number; // Timestamp
    tags?: string[]; // Optional tags
    priority?: number; // Optional priority (e.g., 1-4)
}

export type ListDisplayMode = 'expanded' | 'compact';

// Define filter types for sidebar/routes
export type TaskFilter = 'all' | 'today' | 'next7days' | 'inbox' | 'completed' | 'trash' | `list-${string}` | `tag-${string}`;

export type SettingsTab =
    | 'account' | 'premium' | 'features' | 'smart-list' | 'notifications'
    | 'date-time' | 'appearance' | 'more' | 'integrations' | 'collaborate'
    | 'shortcuts' | 'about';