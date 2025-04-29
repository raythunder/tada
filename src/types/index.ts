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
    completedAt: number | null;
    completionPercentage: number | null;
    dueDate?: number | null;
    list: string;
    content?: string;
    order: number;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    priority?: number | null;
    groupCategory: TaskGroupCategory;
}

export type TaskFilter =
    | 'all'
    | 'today'
    | 'next7days'
    | 'completed'
    | 'trash'
    | `list-${string}`
    | `tag-${string}`;

export type SettingsTab =
    | 'account'
    | 'appearance'
    | 'premium'
    | 'notifications'
    | 'integrations'
    | 'about';

export type TaskGroupCategory =
    | 'overdue'
    | 'today'
    | 'next7days'
    | 'later'
    | 'nodate';