import type { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { getDb, type Role, type UserRecord } from './db.js';
import { nowMs, toId } from './utils.js';

const selectUserByEmail = (email: string) => {
    const db = getDb();
    return db.prepare('SELECT id, email, password_hash as passwordHash, role, created_at as createdAt FROM users WHERE email = ?').get(email) as UserRecord | undefined;
};

const selectUserById = (id: string) => {
    const db = getDb();
    return db.prepare('SELECT id, email, password_hash as passwordHash, role, created_at as createdAt FROM users WHERE id = ?').get(id) as UserRecord | undefined;
};

const insertUser = (email: string, passwordHash: string, role: Role) => {
    const db = getDb();
    const id = toId('user');
    const createdAt = nowMs();
    db.prepare('INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)').run(id, email, passwordHash, role, createdAt);
    return { id, email, role, createdAt };
};

const countUsers = () => {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(1) as count FROM users').get() as { count: number };
    return row?.count ?? 0;
};

const insertDefaultSettings = (userId: string) => {
    const db = getDb();
    db.prepare(`
        INSERT INTO settings (user_id, appearance_json, preferences_json, ai_json, proxy_json)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        userId,
        JSON.stringify({ themeId: 'default-coral', darkMode: 'system', interfaceDensity: 'default', textSize: 'default', fontWeight: 'light' }),
        JSON.stringify({ language: 'zh-CN', defaultNewTaskDueDate: null, defaultNewTaskPriority: null, defaultNewTaskList: 'Inbox', confirmDeletions: true, zenModeShyNative: false, enableEcho: true, echoJobTypes: [], echoPastExamples: '', alwaysUseAITask: false, scheduleSettings: { enabled: false, time: '18:00', days: [1, 2, 3, 4, 5] } }),
        JSON.stringify({ provider: 'openai', apiKey: '', model: '', baseUrl: '', availableModels: [] }),
        JSON.stringify({ enabled: false, protocol: 'http', host: '127.0.0.1', port: 7890, auth: false, username: '', password: '' })
    );

    db.prepare(`
        INSERT INTO lists (id, user_id, name, icon, color, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        toId('list'),
        userId,
        'Inbox',
        'inbox',
        null,
        1
    );
};

const signToken = (user: { id: string; email: string; role: Role }) =>
    jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '7d' });

export const requireAuth: RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const payload = jwt.verify(token, config.jwtSecret) as { sub: string; email: string; role: Role };
        const user = selectUserById(payload.sub);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        res.locals.user = { id: user.id, email: user.email, role: user.role };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

export const registerHandler: RequestHandler = (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!config.allowRegistration) {
        res.status(403).json({ error: 'Registration disabled' });
        return;
    }
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    const existing = selectUserByEmail(email);
    if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
    }

    const isFirstUser = countUsers() === 0;
    const role: Role = isFirstUser ? 'admin' : 'user';
    const passwordHash = bcrypt.hashSync(password, 12);
    const user = insertUser(email, passwordHash, role);
    insertDefaultSettings(user.id);

    const token = signToken(user);
    res.json({ token, user });
};

export const loginHandler: RequestHandler = (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    const user = selectUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt } });
};

export const meHandler: RequestHandler = (req, res) => {
    const user = res.locals.user as { id: string; email: string; role: Role };
    res.json({ user });
};

export const updateAccountHandler: RequestHandler = (req, res) => {
    const { email, currentPassword, newPassword } = req.body as {
        email?: string;
        currentPassword?: string;
        newPassword?: string;
    };

    if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required' });
        return;
    }

    if (!email && !newPassword) {
        res.status(400).json({ error: 'No changes provided' });
        return;
    }

    const { id: userId } = res.locals.user as { id: string; email: string; role: Role };
    const existingUser = selectUserById(userId);
    if (!existingUser || !bcrypt.compareSync(currentPassword, existingUser.passwordHash)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const db = getDb();

    if (email && email !== existingUser.email) {
        const conflict = selectUserByEmail(email);
        if (conflict && conflict.id !== userId) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, userId);
    }

    if (newPassword) {
        const passwordHash = bcrypt.hashSync(newPassword, 12);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
    }

    const updatedUser = selectUserById(userId);
    if (!updatedUser) {
        res.status(500).json({ error: 'User not found after update' });
        return;
    }

    const token = signToken(updatedUser);
    res.json({ token, user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, createdAt: updatedUser.createdAt } });
};

export const bootstrapAdmin = () => {
    if (!config.defaultAdminEmail || !config.defaultAdminPassword) return;
    if (countUsers() > 0) return;

    const passwordHash = bcrypt.hashSync(config.defaultAdminPassword, 12);
    const user = insertUser(config.defaultAdminEmail, passwordHash, 'admin');
    insertDefaultSettings(user.id);
};
