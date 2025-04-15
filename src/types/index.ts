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
    dueDate?: Date | null;
    list: string;
    content?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type ViewMode = 'list' | 'detail';
export type ListDisplayMode = 'expanded' | 'compact';