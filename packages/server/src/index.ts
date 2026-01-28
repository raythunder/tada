import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { bootstrapAdmin, loginHandler, meHandler, registerHandler, requireAuth } from './auth.js';
import {
    createEchoReport,
    createList,
    createSummary,
    createSubtask,
    createTask,
    deleteEchoReport,
    deleteList,
    deleteSubtask,
    deleteSummary,
    deleteTask,
    getBootstrapInfo,
    getEchoReports,
    getLists,
    getSettings,
    getSummaries,
    getTasks,
    replaceEchoReports,
    replaceLists,
    replaceSummaries,
    replaceTasks,
    updateEchoReport,
    updateList,
    updateSettings,
    updateSubtask,
    updateSummary,
    updateTask
} from './routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

bootstrapAdmin();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/bootstrap', getBootstrapInfo);

app.post('/auth/register', registerHandler);
app.post('/auth/login', loginHandler);
app.get('/auth/me', requireAuth, meHandler);

app.get('/settings', requireAuth, getSettings);
app.put('/settings', requireAuth, updateSettings);

app.get('/lists', requireAuth, getLists);
app.post('/lists', requireAuth, createList);
app.put('/lists', requireAuth, replaceLists);
app.patch('/lists/:listId', requireAuth, updateList);
app.delete('/lists/:listId', requireAuth, deleteList);

app.get('/tasks', requireAuth, getTasks);
app.post('/tasks', requireAuth, createTask);
app.put('/tasks', requireAuth, replaceTasks);
app.patch('/tasks/:taskId', requireAuth, updateTask);
app.delete('/tasks/:taskId', requireAuth, deleteTask);

app.post('/tasks/:taskId/subtasks', requireAuth, createSubtask);
app.patch('/subtasks/:subtaskId', requireAuth, updateSubtask);
app.delete('/subtasks/:subtaskId', requireAuth, deleteSubtask);

app.get('/summaries', requireAuth, getSummaries);
app.post('/summaries', requireAuth, createSummary);
app.put('/summaries', requireAuth, replaceSummaries);
app.patch('/summaries/:summaryId', requireAuth, updateSummary);
app.delete('/summaries/:summaryId', requireAuth, deleteSummary);

app.get('/echo-reports', requireAuth, getEchoReports);
app.post('/echo-reports', requireAuth, createEchoReport);
app.put('/echo-reports', requireAuth, replaceEchoReports);
app.patch('/echo-reports/:reportId', requireAuth, updateEchoReport);
app.delete('/echo-reports/:reportId', requireAuth, deleteEchoReport);

app.listen(config.port, () => {
    console.log(`[tada-server] listening on :${config.port} (${config.env})`);
});
