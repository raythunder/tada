import type { RequestHandler } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { getDb } from './db.js';
import { config } from './config.js';
import { nowMs, safeJsonParse, safeJsonStringify, toId } from './utils.js';

type SummaryRow = {
    id: string;
    user_id: string;
    created_at: number;
    updated_at: number;
    period_key: string;
    list_key: string;
    task_ids_json: string;
    summary_text: string;
};

type EchoReportRow = {
    id: string;
    user_id: string;
    created_at: number;
    content: string;
    job_types_json: string;
    style: string;
    user_input: string | null;
};

export const getBootstrapInfo: RequestHandler = (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(1) as count FROM users').get() as { count: number };
    res.json({ hasUsers: (row?.count ?? 0) > 0, allowRegistration: config.allowRegistration });
};

export const getSettings: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const row = db.prepare('SELECT appearance_json, preferences_json, ai_json, proxy_json FROM settings WHERE user_id = ?').get(userId) as {
        appearance_json: string;
        preferences_json: string;
        ai_json: string;
        proxy_json: string | null;
    } | undefined;

    if (!row) {
        res.status(404).json({ error: 'Settings not found' });
        return;
    }

    res.json({
        appearance: safeJsonParse(row.appearance_json, {}),
        preferences: safeJsonParse(row.preferences_json, {}),
        ai: safeJsonParse(row.ai_json, {}),
        proxy: safeJsonParse(row.proxy_json, {})
    });
};

export const updateSettings: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const { appearance, preferences, ai, proxy } = req.body as { appearance?: unknown; preferences?: unknown; ai?: unknown; proxy?: unknown | null };
    const existing = db.prepare('SELECT appearance_json, preferences_json, ai_json, proxy_json FROM settings WHERE user_id = ?').get(userId) as {
        appearance_json: string;
        preferences_json: string;
        ai_json: string;
        proxy_json: string | null;
    } | undefined;
    if (!existing) {
        res.status(404).json({ error: 'Settings not found' });
        return;
    }

    const nextAppearance = appearance ?? safeJsonParse(existing.appearance_json, {});
    const nextPreferences = preferences ?? safeJsonParse(existing.preferences_json, {});
    const nextAi = ai ?? safeJsonParse(existing.ai_json, {});
    const nextProxy = proxy === undefined ? safeJsonParse(existing.proxy_json, {}) : proxy;

    db.prepare(`
        UPDATE settings
        SET appearance_json = ?, preferences_json = ?, ai_json = ?, proxy_json = ?
        WHERE user_id = ?
    `).run(
        safeJsonStringify(nextAppearance),
        safeJsonStringify(nextPreferences),
        safeJsonStringify(nextAi),
        nextProxy === null ? null : safeJsonStringify(nextProxy),
        userId
    );

    res.json({ appearance: nextAppearance, preferences: nextPreferences, ai: nextAi, proxy: nextProxy });
};

export const getLists: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const rows = db.prepare('SELECT id, name, icon, color, order_index as orderIndex FROM lists WHERE user_id = ? ORDER BY order_index ASC').all(userId) as any[];
    res.json(rows.map(row => ({ id: row.id, name: row.name, icon: row.icon, color: row.color, order: row.orderIndex })));
};

export const createList: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const { id, name, icon, color, order } = req.body as { id?: string; name?: string; icon?: string | null; color?: string | null; order?: number | null };
    if (!name) {
        res.status(400).json({ error: 'List name required' });
        return;
    }
    const listId = id ?? toId('list');
    const orderIndex = order ?? nowMs();
    db.prepare('INSERT INTO lists (id, user_id, name, icon, color, order_index) VALUES (?, ?, ?, ?, ?, ?)')
        .run(listId, userId, name, icon ?? null, color ?? null, orderIndex);
    res.json({ id: listId, name, icon: icon ?? null, color: color ?? null, order: orderIndex });
};

export const updateList: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const listId = req.params.listId;
    const updates = req.body as { name?: string; icon?: string | null; color?: string | null; order?: number | null };

    const existing = db.prepare('SELECT id, name, icon, color, order_index as orderIndex FROM lists WHERE id = ? AND user_id = ?').get(listId, userId) as any;
    if (!existing) {
        res.status(404).json({ error: 'List not found' });
        return;
    }

    const next = {
        name: Object.prototype.hasOwnProperty.call(updates, 'name') ? updates.name : existing.name,
        icon: Object.prototype.hasOwnProperty.call(updates, 'icon') ? updates.icon : existing.icon,
        color: Object.prototype.hasOwnProperty.call(updates, 'color') ? updates.color : existing.color,
        orderIndex: Object.prototype.hasOwnProperty.call(updates, 'order') ? updates.order : existing.orderIndex
    };

    db.prepare(`
        UPDATE lists SET
            name = ?,
            icon = ?,
            color = ?,
            order_index = ?
        WHERE id = ? AND user_id = ?
    `).run(next.name, next.icon ?? null, next.color ?? null, next.orderIndex ?? null, listId, userId);

    res.json({ id: listId, name: next.name, icon: next.icon ?? null, color: next.color ?? null, order: next.orderIndex ?? null });
};

export const deleteList: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const listId = req.params.listId;

    db.prepare('DELETE FROM lists WHERE id = ? AND user_id = ?').run(listId, userId);
    res.json({ message: 'List deleted successfully' });
};

export const replaceLists: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const lists = req.body as Array<{ id: string; name: string; icon?: string | null; color?: string | null; order?: number | null }>;

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM lists WHERE user_id = ?').run(userId);
        const stmt = db.prepare('INSERT INTO lists (id, user_id, name, icon, color, order_index) VALUES (?, ?, ?, ?, ?, ?)');
        for (const list of lists) {
            stmt.run(list.id, userId, list.name, list.icon ?? null, list.color ?? null, list.order ?? null);
        }
    });
    tx();
    res.json(lists);
};

export const getTasks: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;

    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY order_index ASC').all(userId) as any[];
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE user_id = ? ORDER BY order_index ASC').all(userId) as any[];

    const subtaskMap = new Map<string, any[]>();
    for (const subtask of subtasks) {
        const list = subtaskMap.get(subtask.parent_id) ?? [];
        list.push({
            id: subtask.id,
            parentId: subtask.parent_id,
            title: subtask.title,
            completed: !!subtask.completed,
            completedAt: subtask.completed_at,
            dueDate: subtask.due_date,
            order: subtask.order_index,
            createdAt: subtask.created_at,
            updatedAt: subtask.updated_at
        });
        subtaskMap.set(subtask.parent_id, list);
    }

    const result = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        completed: !!task.completed,
        completedAt: task.completed_at,
        completePercentage: task.complete_percentage,
        dueDate: task.due_date,
        listId: task.list_id,
        listName: task.list_name,
        content: task.content,
        order: task.order_index,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        tags: safeJsonParse(task.tags_json, []),
        priority: task.priority,
        subtasks: subtaskMap.get(task.id) ?? []
    }));

    res.json(result);
};

export const createTask: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const task = req.body as any;
    const now = nowMs();
    const id = task.id ?? toId('task');
    const createdAt = task.createdAt ?? now;
    const updatedAt = task.updatedAt ?? now;

    db.prepare(`
        INSERT INTO tasks (
            id, user_id, title, completed, completed_at, complete_percentage, due_date, list_id, list_name,
            content, order_index, created_at, updated_at, tags_json, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        userId,
        task.title,
        task.completed ? 1 : 0,
        task.completedAt ?? null,
        task.completePercentage ?? null,
        task.dueDate ?? null,
        task.listId ?? null,
        task.listName,
        task.content ?? null,
        task.order ?? now,
        createdAt,
        updatedAt,
        safeJsonStringify(task.tags ?? []),
        task.priority ?? null
    );

    res.json({
        ...task,
        id,
        createdAt,
        updatedAt,
        tags: task.tags ?? []
    });
};

export const updateTask: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const taskId = req.params.taskId;
    const updates = req.body as any;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as any;
    if (!existing) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }

    const now = nowMs();
    const next = {
        title: Object.prototype.hasOwnProperty.call(updates, 'title') ? updates.title : existing.title,
        completed: Object.prototype.hasOwnProperty.call(updates, 'completed') ? (updates.completed ? 1 : 0) : existing.completed,
        completedAt: Object.prototype.hasOwnProperty.call(updates, 'completedAt') ? updates.completedAt : existing.completed_at,
        completePercentage: Object.prototype.hasOwnProperty.call(updates, 'completePercentage') ? updates.completePercentage : existing.complete_percentage,
        dueDate: Object.prototype.hasOwnProperty.call(updates, 'dueDate') ? updates.dueDate : existing.due_date,
        listId: Object.prototype.hasOwnProperty.call(updates, 'listId') ? updates.listId : existing.list_id,
        listName: Object.prototype.hasOwnProperty.call(updates, 'listName') ? updates.listName : existing.list_name,
        content: Object.prototype.hasOwnProperty.call(updates, 'content') ? updates.content : existing.content,
        order: Object.prototype.hasOwnProperty.call(updates, 'order') ? updates.order : existing.order_index,
        tagsJson: Object.prototype.hasOwnProperty.call(updates, 'tags') ? safeJsonStringify(updates.tags) : existing.tags_json,
        priority: Object.prototype.hasOwnProperty.call(updates, 'priority') ? updates.priority : existing.priority
    };

    db.prepare(`
        UPDATE tasks SET
            title = ?,
            completed = ?,
            completed_at = ?,
            complete_percentage = ?,
            due_date = ?,
            list_id = ?,
            list_name = ?,
            content = ?,
            order_index = ?,
            updated_at = ?,
            tags_json = ?,
            priority = ?
        WHERE id = ? AND user_id = ?
    `).run(
        next.title,
        next.completed,
        next.completedAt,
        next.completePercentage,
        next.dueDate,
        next.listId,
        next.listName,
        next.content,
        next.order,
        now,
        next.tagsJson,
        next.priority,
        taskId,
        userId
    );

    res.json({
        id: taskId,
        title: next.title,
        completed: !!next.completed,
        completedAt: next.completedAt,
        completePercentage: next.completePercentage,
        dueDate: next.dueDate,
        listId: next.listId,
        listName: next.listName,
        content: next.content,
        order: next.order,
        createdAt: existing.created_at,
        updatedAt: now,
        tags: safeJsonParse(next.tagsJson, []),
        priority: next.priority
    });
};

export const deleteTask: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const taskId = req.params.taskId;

    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, userId);
    res.json({ message: 'Task deleted' });
};

export const replaceTasks: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const tasks = req.body as any[];

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM subtasks WHERE user_id = ?').run(userId);

        const taskStmt = db.prepare(`
            INSERT INTO tasks (
                id, user_id, title, completed, completed_at, complete_percentage, due_date, list_id, list_name,
                content, order_index, created_at, updated_at, tags_json, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const subtaskStmt = db.prepare(`
            INSERT INTO subtasks (
                id, user_id, parent_id, title, completed, completed_at, due_date, order_index, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const task of tasks) {
            taskStmt.run(
                task.id,
                userId,
                task.title,
                task.completed ? 1 : 0,
                task.completedAt ?? null,
                task.completePercentage ?? null,
                task.dueDate ?? null,
                task.listId ?? null,
                task.listName,
                task.content ?? null,
                task.order ?? nowMs(),
                task.createdAt ?? nowMs(),
                task.updatedAt ?? nowMs(),
                safeJsonStringify(task.tags ?? []),
                task.priority ?? null
            );
            for (const subtask of task.subtasks ?? []) {
                subtaskStmt.run(
                    subtask.id,
                    userId,
                    task.id,
                    subtask.title,
                    subtask.completed ? 1 : 0,
                    subtask.completedAt ?? null,
                    subtask.dueDate ?? null,
                    subtask.order,
                    subtask.createdAt ?? nowMs(),
                    subtask.updatedAt ?? nowMs()
                );
            }
        }
    });

    tx();
    res.json(tasks);
};

export const getSummaries: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const rows = db.prepare('SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    res.json(rows.map(row => ({
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        periodKey: row.period_key,
        listKey: row.list_key,
        taskIds: safeJsonParse(row.task_ids_json, []),
        summaryText: row.summary_text
    })));
};

export const createSummary: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const summary = req.body as any;
    const now = nowMs();
    const id = summary.id ?? toId('summary');
    const createdAt = summary.createdAt ?? now;
    const updatedAt = summary.updatedAt ?? now;

    db.prepare(`
        INSERT INTO summaries (id, user_id, created_at, updated_at, period_key, list_key, task_ids_json, summary_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, createdAt, updatedAt, summary.periodKey, summary.listKey, safeJsonStringify(summary.taskIds ?? []), summary.summaryText);

    res.json({
        id,
        createdAt,
        updatedAt,
        periodKey: summary.periodKey,
        listKey: summary.listKey,
        taskIds: summary.taskIds ?? [],
        summaryText: summary.summaryText
    });
};

export const updateSummary: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const summaryId = req.params.summaryId;
    const updates = req.body as any;

    const existing = db.prepare('SELECT * FROM summaries WHERE id = ? AND user_id = ?').get(summaryId, userId) as SummaryRow | undefined;
    if (!existing) {
        res.status(404).json({ error: 'Summary not found' });
        return;
    }

    const now = nowMs();
    const nextTaskIdsJson = Object.prototype.hasOwnProperty.call(updates, 'taskIds')
        ? safeJsonStringify(updates.taskIds)
        : existing.task_ids_json;

    db.prepare(`
        UPDATE summaries SET
            updated_at = ?,
            period_key = COALESCE(?, period_key),
            list_key = COALESCE(?, list_key),
            task_ids_json = ?,
            summary_text = COALESCE(?, summary_text)
        WHERE id = ? AND user_id = ?
    `).run(
        now,
        updates.periodKey ?? null,
        updates.listKey ?? null,
        nextTaskIdsJson,
        updates.summaryText ?? null,
        summaryId,
        userId
    );

    res.json({
        id: summaryId,
        createdAt: existing.created_at,
        updatedAt: now,
        periodKey: updates.periodKey ?? existing.period_key,
        listKey: updates.listKey ?? existing.list_key,
        taskIds: safeJsonParse(nextTaskIdsJson, []),
        summaryText: updates.summaryText ?? existing.summary_text
    });
};

export const deleteSummary: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const summaryId = req.params.summaryId;
    db.prepare('DELETE FROM summaries WHERE id = ? AND user_id = ?').run(summaryId, userId);
    res.json({ message: 'Summary deleted' });
};

export const replaceSummaries: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const summaries = req.body as any[];

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM summaries WHERE user_id = ?').run(userId);
        const stmt = db.prepare(`
            INSERT INTO summaries (id, user_id, created_at, updated_at, period_key, list_key, task_ids_json, summary_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const summary of summaries) {
            stmt.run(
                summary.id,
                userId,
                summary.createdAt ?? nowMs(),
                summary.updatedAt ?? nowMs(),
                summary.periodKey,
                summary.listKey,
                safeJsonStringify(summary.taskIds ?? []),
                summary.summaryText
            );
        }
    });

    tx();
    res.json(summaries);
};

export const getEchoReports: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const rows = db.prepare('SELECT * FROM echo_reports WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    res.json(rows.map(row => ({
        id: row.id,
        createdAt: row.created_at,
        content: row.content,
        jobTypes: safeJsonParse(row.job_types_json, []),
        style: row.style,
        userInput: row.user_input
    })));
};

export const createEchoReport: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const report = req.body as any;
    const now = nowMs();
    const id = report.id ?? toId('echo');
    const createdAt = report.createdAt ?? now;

    db.prepare(`
        INSERT INTO echo_reports (id, user_id, created_at, content, job_types_json, style, user_input)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, createdAt, report.content, safeJsonStringify(report.jobTypes ?? []), report.style, report.userInput ?? null);

    res.json({
        id,
        createdAt,
        content: report.content,
        jobTypes: report.jobTypes ?? [],
        style: report.style,
        userInput: report.userInput ?? null
    });
};

export const updateEchoReport: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const reportId = req.params.reportId;
    const updates = req.body as any;

    const existing = db.prepare('SELECT * FROM echo_reports WHERE id = ? AND user_id = ?').get(reportId, userId) as EchoReportRow | undefined;
    if (!existing) {
        res.status(404).json({ error: 'Echo report not found' });
        return;
    }

    const nextJobTypesJson = Object.prototype.hasOwnProperty.call(updates, 'jobTypes')
        ? safeJsonStringify(updates.jobTypes)
        : existing.job_types_json;

    db.prepare(`
        UPDATE echo_reports SET
            content = COALESCE(?, content),
            job_types_json = ?,
            style = COALESCE(?, style),
            user_input = COALESCE(?, user_input)
        WHERE id = ? AND user_id = ?
    `).run(
        updates.content ?? null,
        nextJobTypesJson,
        updates.style ?? null,
        updates.userInput ?? null,
        reportId,
        userId
    );

    res.json({
        id: reportId,
        createdAt: existing.created_at,
        content: updates.content ?? existing.content,
        jobTypes: safeJsonParse(nextJobTypesJson, []),
        style: updates.style ?? existing.style,
        userInput: updates.userInput ?? existing.user_input
    });
};

export const deleteEchoReport: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const reportId = req.params.reportId;
    db.prepare('DELETE FROM echo_reports WHERE id = ? AND user_id = ?').run(reportId, userId);
    res.json({ message: 'Echo report deleted' });
};

export const replaceEchoReports: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const reports = req.body as any[];

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM echo_reports WHERE user_id = ?').run(userId);
        const stmt = db.prepare(`
            INSERT INTO echo_reports (id, user_id, created_at, content, job_types_json, style, user_input)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const report of reports) {
            stmt.run(
                report.id,
                userId,
                report.createdAt ?? nowMs(),
                report.content,
                safeJsonStringify(report.jobTypes ?? []),
                report.style,
                report.userInput ?? null
            );
        }
    });

    tx();
    res.json(reports);
};

export const createSubtask: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const taskId = req.params.taskId;
    const subtask = req.body as any;
    const now = nowMs();
    const id = subtask.id ?? toId('subtask');
    const createdAt = subtask.createdAt ?? now;
    const updatedAt = subtask.updatedAt ?? now;

    db.prepare(`
        INSERT INTO subtasks (id, user_id, parent_id, title, completed, completed_at, due_date, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        userId,
        taskId,
        subtask.title,
        subtask.completed ? 1 : 0,
        subtask.completedAt ?? null,
        subtask.dueDate ?? null,
        subtask.order ?? now,
        createdAt,
        updatedAt
    );

    res.json({
        id,
        parentId: taskId,
        title: subtask.title,
        completed: !!subtask.completed,
        completedAt: subtask.completedAt ?? null,
        dueDate: subtask.dueDate ?? null,
        order: subtask.order ?? now,
        createdAt,
        updatedAt
    });
};

const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, config.uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        cb(null, `${crypto.randomUUID()}${ext}`);
    }
});

const uploadMiddleware = multer({
    storage: uploadStorage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image uploads are allowed'));
        }
    }
});

export const uploadImage = uploadMiddleware.single('file');

export const uploadImageHandler: RequestHandler = (req, res) => {
    const file = req.file;
    if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const relativeUrl = `/uploads/${file.filename}`;
    const baseUrl = config.publicBaseUrl || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}${relativeUrl}`;

    res.json({ url, filename: file.filename });
};

export const updateSubtask: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const subtaskId = req.params.subtaskId;
    const updates = req.body as any;

    const existing = db.prepare('SELECT * FROM subtasks WHERE id = ? AND user_id = ?').get(subtaskId, userId) as any;
    if (!existing) {
        res.status(404).json({ error: 'Subtask not found' });
        return;
    }

    const now = nowMs();
    const next = {
        title: Object.prototype.hasOwnProperty.call(updates, 'title') ? updates.title : existing.title,
        completed: Object.prototype.hasOwnProperty.call(updates, 'completed') ? (updates.completed ? 1 : 0) : existing.completed,
        completedAt: Object.prototype.hasOwnProperty.call(updates, 'completedAt') ? updates.completedAt : existing.completed_at,
        dueDate: Object.prototype.hasOwnProperty.call(updates, 'dueDate') ? updates.dueDate : existing.due_date,
        order: Object.prototype.hasOwnProperty.call(updates, 'order') ? updates.order : existing.order_index
    };

    db.prepare(`
        UPDATE subtasks SET
            title = ?,
            completed = ?,
            completed_at = ?,
            due_date = ?,
            order_index = ?,
            updated_at = ?
        WHERE id = ? AND user_id = ?
    `).run(
        next.title,
        next.completed,
        next.completedAt,
        next.dueDate,
        next.order,
        now,
        subtaskId,
        userId
    );

    res.json({
        id: subtaskId,
        parentId: existing.parent_id,
        title: next.title,
        completed: !!next.completed,
        completedAt: next.completedAt,
        dueDate: next.dueDate,
        order: next.order,
        createdAt: existing.created_at,
        updatedAt: now
    });
};

export const deleteSubtask: RequestHandler = (req, res) => {
    const db = getDb();
    const userId = res.locals.user.id as string;
    const subtaskId = req.params.subtaskId;
    db.prepare('DELETE FROM subtasks WHERE id = ? AND user_id = ?').run(subtaskId, userId);
    res.json({ message: 'Subtask deleted' });
};
