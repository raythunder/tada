import Database from 'better-sqlite3';
import { config } from './config.js';

export type Role = 'admin' | 'user';

export interface UserRecord {
    id: string;
    email: string;
    passwordHash: string;
    role: Role;
    createdAt: number;
}

export interface SettingsRecord {
    userId: string;
    appearanceJson: string;
    preferencesJson: string;
    aiJson: string;
    proxyJson: string | null;
}

export interface TaskRecord {
    id: string;
    userId: string;
    title: string;
    completed: number;
    completedAt: number | null;
    completePercentage: number | null;
    dueDate: number | null;
    listId: string | null;
    listName: string;
    content: string | null;
    orderIndex: number;
    createdAt: number;
    updatedAt: number;
    tagsJson: string | null;
    priority: number | null;
}

export interface SubtaskRecord {
    id: string;
    userId: string;
    parentId: string;
    title: string;
    completed: number;
    completedAt: number | null;
    dueDate: number | null;
    orderIndex: number;
    createdAt: number;
    updatedAt: number;
}

export interface ListRecord {
    id: string;
    userId: string;
    name: string;
    icon: string | null;
    color: string | null;
    orderIndex: number | null;
}

export interface SummaryRecord {
    id: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    periodKey: string;
    listKey: string;
    taskIdsJson: string;
    summaryText: string;
}

export interface EchoReportRecord {
    id: string;
    userId: string;
    createdAt: number;
    content: string;
    jobTypesJson: string;
    style: 'balanced' | 'exploration' | 'reflection';
    userInput: string | null;
}

let dbInstance: Database.Database | null = null;

export const getDb = (): Database.Database => {
    if (!dbInstance) {
        dbInstance = new Database(config.dbPath);
        dbInstance.pragma('foreign_keys = ON');
        initSchema(dbInstance);
    }
    return dbInstance;
};

const initSchema = (db: Database.Database) => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            user_id TEXT PRIMARY KEY,
            appearance_json TEXT NOT NULL,
            preferences_json TEXT NOT NULL,
            ai_json TEXT NOT NULL,
            proxy_json TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS lists (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT,
            color TEXT,
            order_index INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL,
            completed_at INTEGER,
            complete_percentage INTEGER,
            due_date INTEGER,
            list_id TEXT,
            list_name TEXT NOT NULL,
            content TEXT,
            order_index INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            tags_json TEXT,
            priority INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);

        CREATE TABLE IF NOT EXISTS subtasks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            parent_id TEXT NOT NULL,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL,
            completed_at INTEGER,
            due_date INTEGER,
            order_index INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(parent_id) REFERENCES tasks(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_subtasks_user_id ON subtasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_subtasks_parent_id ON subtasks(parent_id);

        CREATE TABLE IF NOT EXISTS summaries (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            period_key TEXT NOT NULL,
            list_key TEXT NOT NULL,
            task_ids_json TEXT NOT NULL,
            summary_text TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);

        CREATE TABLE IF NOT EXISTS echo_reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            content TEXT NOT NULL,
            job_types_json TEXT NOT NULL,
            style TEXT NOT NULL,
            user_input TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_echo_reports_user_id ON echo_reports(user_id);
    `);
};
