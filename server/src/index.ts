import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, '../data/tasks.json');

// 确保数据目录存在
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 任务数据接口
interface Task {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: number | null;
    content?: string;
    priority?: number | null;
    listName?: string;
}

interface SyncData {
    tasks: Task[];
    updatedAt: number;
}

// 读取存储的任务
function loadTasks(): SyncData | null {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
    return null;
}

// 保存任务
function saveTasks(data: SyncData): void {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 生成 ICS 日期格式 (YYYYMMDD)
function formatICSDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 转义 ICS 特殊字符
function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

// 生成 ICS 内容
function generateICS(tasks: Task[]): string {
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TADA//Task Manager//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:TADA Tasks',
    ];

    // 只包含未完成且有截止日期的任务
    const tasksWithDueDate = tasks.filter(t => !t.completed && t.dueDate);

    for (const task of tasksWithDueDate) {
        const uid = `task-${task.id}@tada`;
        const dtstart = formatICSDate(task.dueDate!);
        const summary = escapeICS(task.title);
        const description = task.content ? escapeICS(task.content) : '';
        const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${now}`);
        lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
        lines.push(`SUMMARY:${summary}`);
        if (description) {
            lines.push(`DESCRIPTION:${description}`);
        }
        if (task.priority) {
            // ICS PRIORITY: 1-4 高, 5 中, 6-9 低
            const icsPriority = task.priority === 1 ? 1 : task.priority === 2 ? 5 : 9;
            lines.push(`PRIORITY:${icsPriority}`);
        }
        if (task.listName) {
            lines.push(`CATEGORIES:${escapeICS(task.listName)}`);
        }
        lines.push('STATUS:CONFIRMED');
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

// API: 同步任务
app.post('/api/sync', (req, res) => {
    try {
        const { tasks } = req.body;

        if (!Array.isArray(tasks)) {
            return res.status(400).json({ error: 'Invalid tasks data' });
        }

        const data: SyncData = {
            tasks,
            updatedAt: Date.now(),
        };

        saveTasks(data);

        console.log(`Synced ${tasks.length} tasks at ${new Date().toISOString()}`);

        res.json({
            success: true,
            message: `Synced ${tasks.length} tasks`,
            tasksWithDueDate: tasks.filter(t => !t.completed && t.dueDate).length
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API: 获取 ICS 日历文件
app.get('/calendar.ics', (req, res) => {
    try {
        const data = loadTasks();

        if (!data) {
            // 返回空日历
            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="tada-calendar.ics"');
            return res.send(generateICS([]));
        }

        const icsContent = generateICS(data.tasks);

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="tada-calendar.ics"');
        res.send(icsContent);
    } catch (error) {
        console.error('ICS generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 启动服务
app.listen(PORT, () => {
    console.log(`🗓️  TADA ICS Server running on port ${PORT}`);
    console.log(`   - Sync endpoint: POST /api/sync`);
    console.log(`   - Calendar URL:  GET /calendar.ics`);
});
