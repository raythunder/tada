import {DarkModeOption, DefaultNewTaskDueDate} from "@/store/jotai.ts";
import {AIProvider, AIModel} from "@/config/aiProviders.ts";

/**
 * Represents a user-created list for organizing tasks.
 */
export interface List {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    order?: number | null;
}

/**
 * Represents a subtask associated with a parent task.
 */
export interface Subtask {
    id: string;
    parentId: string;
    title: string;
    completed: boolean;
    completedAt: number | null;
    dueDate?: number | null;
    order: number;
    createdAt: number;
    updatedAt: number;
}

/**
 * Represents a single task item.
 */
export interface Task {
    id:string;
    title: string;
    completed: boolean;
    completedAt: number | null;
    completePercentage: number | null;
    dueDate?: number | null;
    listId: string | null;
    listName: string;
    content?: string;
    order: number;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    priority?: number | null;
    groupCategory: TaskGroupCategory;
    subtasks?: Subtask[];
}

/**
 * Defines the possible filter types for the task list.
 */
export type TaskFilter =
    | 'all'
    | 'today'
    | 'next7days'
    | 'completed'
    | 'trash'
    | `list-${string}`
    | `tag-${string}`;

/**
 * Defines the available tabs in the settings modal.
 */
export type SettingsTab =
    | 'appearance'
    | 'preferences'
    | 'ai'
    | 'about';

/**
 * Defines the categories for grouping tasks in the "All Tasks" view.
 */
export type TaskGroupCategory =
    | 'overdue'
    | 'today'
    | 'next7days'
    | 'later'
    | 'nodate';

/**
 * Represents a stored AI-generated summary.
 */
export interface StoredSummary {
    id: string;
    createdAt: number;
    updatedAt: number;
    periodKey: string;
    listKey: string;
    taskIds: string[];
    summaryText: string;
}

/**
 * Defines the structure for appearance-related settings.
 */
export interface AppearanceSettings {
    themeId: string;
    darkMode: DarkModeOption;
    interfaceDensity: 'compact' | 'default' | 'comfortable';
}

/**
 * Defines the structure for user preference settings.
 */
export interface PreferencesSettings {
    language: 'en' | 'zh-CN';
    defaultNewTaskDueDate: DefaultNewTaskDueDate;
    defaultNewTaskPriority: number | null;
    defaultNewTaskList: string;
    confirmDeletions: boolean;
}

/**
 * Defines the structure for AI-related settings.
 */
export interface AISettings {
    provider: AIProvider['id'];
    apiKey: string;
    model: string;
    baseUrl?: string; // for custom/ollama providers
    availableModels?: AIModel[]; // cached available models
}