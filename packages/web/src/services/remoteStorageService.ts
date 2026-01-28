import { IStorageService } from '@tada/core/services/storageInterface';
import {
    AISettings,
    AppearanceSettings,
    List,
    PreferencesSettings,
    StoredSummary,
    Task,
    Subtask,
    ExportedData,
    ImportOptions,
    ImportResult,
    DataConflict,
    ConflictResolution,
    EchoReport,
    ProxySettings
} from '@tada/core/types';
import {
    defaultAISettingsForApi,
    defaultAppearanceSettingsForApi,
    defaultPreferencesSettingsForApi,
    defaultProxySettingsForApi,
    getTaskGroupCategory
} from '@tada/core/store/jotai';

interface RemoteSettings {
    appearance: AppearanceSettings;
    preferences: PreferencesSettings;
    ai: AISettings;
    proxy?: ProxySettings;
}

export class RemoteStorageService implements IStorageService {
    private readonly apiBaseUrl: string;
    private readonly token: string;

    private tasksCache: Task[] = [];
    private listsCache: List[] = [];
    private summariesCache: StoredSummary[] = [];
    private echoReportsCache: EchoReport[] = [];
    private settingsCache: RemoteSettings | null = null;

    private settingsPersistTimeout: number | null = null;

    constructor(apiBaseUrl: string, token: string) {
        this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
        this.token = token;
    }

    async preloadData(): Promise<void> {
        const [settings, lists, tasks, summaries, echoReports] = await Promise.all([
            this.request<RemoteSettings>('/settings'),
            this.request<List[]>('/lists'),
            this.request<Task[]>('/tasks'),
            this.request<StoredSummary[]>('/summaries'),
            this.request<EchoReport[]>('/echo-reports')
        ]);

        this.settingsCache = settings;
        this.listsCache = lists;
        this.tasksCache = tasks.map(t => ({ ...t, groupCategory: getTaskGroupCategory(t) }));
        this.summariesCache = summaries;
        this.echoReportsCache = echoReports;
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.apiBaseUrl}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.token}`,
                ...(options.headers ?? {})
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Request failed with status ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    private scheduleSettingsPersist(): void {
        if (!this.settingsCache) return;
        if (this.settingsPersistTimeout) {
            window.clearTimeout(this.settingsPersistTimeout);
        }
        this.settingsPersistTimeout = window.setTimeout(() => {
            const payload = this.settingsCache;
            this.request('/settings', {
                method: 'PUT',
                body: JSON.stringify(payload)
            }).catch((error) => {
                console.error('Failed to persist settings:', error);
            });
        }, 150);
    }

    fetchSettings() {
        if (!this.settingsCache) {
            this.settingsCache = {
                appearance: defaultAppearanceSettingsForApi(),
                preferences: defaultPreferencesSettingsForApi(),
                ai: defaultAISettingsForApi(),
                proxy: defaultProxySettingsForApi()
            };
        }
        return this.settingsCache;
    }

    updateAppearanceSettings(settings: AppearanceSettings) {
        const current = this.fetchSettings();
        this.settingsCache = { ...current, appearance: settings };
        this.scheduleSettingsPersist();
        return settings;
    }

    updatePreferencesSettings(settings: PreferencesSettings) {
        const current = this.fetchSettings();
        this.settingsCache = { ...current, preferences: settings };
        this.scheduleSettingsPersist();
        return settings;
    }

    updateAISettings(settings: AISettings) {
        const current = this.fetchSettings();
        this.settingsCache = { ...current, ai: settings };
        this.scheduleSettingsPersist();
        return settings;
    }

    updateProxySettings(settings: ProxySettings) {
        const current = this.fetchSettings();
        this.settingsCache = { ...current, proxy: settings };
        this.scheduleSettingsPersist();
        return settings;
    }

    fetchLists() {
        return [...this.listsCache];
    }

    createList(listData: { name: string; icon?: string }) {
        const lists = this.fetchLists();
        const newList: List = {
            id: `list-${Date.now()}-${Math.random()}`,
            name: listData.name,
            icon: listData.icon ?? 'list',
            order: (lists.length + 1) * 1000
        };
        this.listsCache = [...lists, newList];
        this.request('/lists', {
            method: 'POST',
            body: JSON.stringify(newList)
        }).catch((error) => {
            console.error('Failed to create list:', error);
        });
        return newList;
    }

    updateList(listId: string, updates: Partial<List>) {
        const lists = this.fetchLists();
        let originalName: string | undefined;
        let updatedList: List | undefined;

        const updatedLists = lists.map(list => {
            if (list.id === listId) {
                originalName = list.name;
                updatedList = { ...list, ...updates };
                return updatedList;
            }
            return list;
        });

        if (!updatedList) throw new Error('List not found');
        this.listsCache = updatedLists;

        if (updates.name && originalName && updates.name !== originalName) {
            const tasks = this.fetchTasks();
            const updatedTasks = tasks.map(task =>
                task.listId === listId ? { ...task, listName: updates.name! } : task
            );
            this.tasksCache = updatedTasks;
            this.request('/tasks', {
                method: 'PUT',
                body: JSON.stringify(updatedTasks)
            }).catch((error) => {
                console.error('Failed to update tasks for list rename:', error);
            });
        }

        this.request(`/lists/${listId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        }).catch((error) => {
            console.error('Failed to update list:', error);
        });

        return updatedList;
    }

    deleteList(listId: string) {
        const lists = this.fetchLists();
        const listToDelete = lists.find(l => l.id === listId);
        if (!listToDelete) throw new Error('List not found');
        if (listToDelete.name === 'Inbox') throw new Error('Cannot delete Inbox');

        const inbox = lists.find(l => l.name === 'Inbox');
        if (!inbox) throw new Error('Inbox not found, cannot delete list.');

        const tasks = this.fetchTasks();
        const updatedTasks = tasks.map(task => {
            if (task.listId === listId) {
                return task.listName === 'Trash'
                    ? { ...task, listId: null }
                    : { ...task, listId: inbox.id, listName: inbox.name };
            }
            return task;
        });
        this.tasksCache = updatedTasks;

        this.listsCache = lists.filter(l => l.id !== listId);

        this.request('/tasks', {
            method: 'PUT',
            body: JSON.stringify(updatedTasks)
        }).catch((error) => {
            console.error('Failed to reassign tasks after list delete:', error);
        });

        this.request(`/lists/${listId}`, { method: 'DELETE' }).catch((error) => {
            console.error('Failed to delete list:', error);
        });

        return { message: 'List deleted successfully' };
    }

    updateLists(lists: List[]) {
        this.listsCache = lists;
        this.request('/lists', {
            method: 'PUT',
            body: JSON.stringify(lists)
        }).catch((error) => {
            console.error('Failed to replace lists:', error);
        });
        return lists;
    }

    fetchTasks() {
        return [...this.tasksCache];
    }

    createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'groupCategory'>) {
        const now = Date.now();
        const newTask: Task = {
            ...taskData,
            id: `task-${now}-${Math.random()}`,
            createdAt: now,
            updatedAt: now,
            groupCategory: 'nodate'
        };
        this.tasksCache = [...this.tasksCache, newTask];
        this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(newTask)
        }).catch((error) => {
            console.error('Failed to create task:', error);
        });
        return newTask;
    }

    updateTask(taskId: string, updates: Partial<Task>) {
        const tasks = this.fetchTasks();
        let updatedTask: Task | undefined;
        const newTasks = tasks.map(task => {
            if (task.id === taskId) {
                updatedTask = { ...task, ...updates, updatedAt: Date.now() };
                return updatedTask;
            }
            return task;
        });
        if (!updatedTask) throw new Error('Task not found');
        this.tasksCache = newTasks;
        this.request(`/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        }).catch((error) => {
            console.error('Failed to update task:', error);
        });
        return updatedTask;
    }

    deleteTask(taskId: string) {
        this.tasksCache = this.tasksCache.filter(t => t.id !== taskId);
        this.request(`/tasks/${taskId}`, { method: 'DELETE' }).catch((error) => {
            console.error('Failed to delete task:', error);
        });
    }

    updateTasks(tasks: Task[]) {
        this.tasksCache = tasks;
        this.request('/tasks', {
            method: 'PUT',
            body: JSON.stringify(tasks)
        }).catch((error) => {
            console.error('Failed to replace tasks:', error);
        });
        return tasks;
    }

    async batchUpdateTasks(tasks: Task[]) {
        this.updateTasks(tasks);
    }

    async batchUpdateLists(lists: List[]) {
        this.updateLists(lists);
    }

    // Subtasks
    createSubtask(taskId: string, subtaskData: { title: string; order: number; dueDate: number | null }) {
        const now = Date.now();
        const newSubtask: Subtask = {
            id: `subtask-${now}-${Math.random()}`,
            parentId: taskId,
            title: subtaskData.title,
            completed: false,
            completedAt: null,
            dueDate: subtaskData.dueDate ?? null,
            order: subtaskData.order,
            createdAt: now,
            updatedAt: now
        };

        this.tasksCache = this.tasksCache.map(task => {
            if (task.id === taskId) {
                const subtasks = task.subtasks ? [...task.subtasks, newSubtask] : [newSubtask];
                return { ...task, subtasks };
            }
            return task;
        });

        this.request(`/tasks/${taskId}/subtasks`, {
            method: 'POST',
            body: JSON.stringify(newSubtask)
        }).catch((error) => {
            console.error('Failed to create subtask:', error);
        });

        return newSubtask;
    }

    updateSubtask(subtaskId: string, updates: Partial<Subtask>) {
        let updatedSubtask: Subtask | undefined;
        this.tasksCache = this.tasksCache.map(task => {
            if (!task.subtasks) return task;
            const subtasks = task.subtasks.map(subtask => {
                if (subtask.id === subtaskId) {
                    updatedSubtask = { ...subtask, ...updates, updatedAt: Date.now() };
                    return updatedSubtask;
                }
                return subtask;
            });
            return { ...task, subtasks };
        });

        if (!updatedSubtask) throw new Error('Subtask not found');

        this.request(`/subtasks/${subtaskId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        }).catch((error) => {
            console.error('Failed to update subtask:', error);
        });

        return updatedSubtask;
    }

    deleteSubtask(subtaskId: string) {
        this.tasksCache = this.tasksCache.map(task => {
            if (!task.subtasks) return task;
            return { ...task, subtasks: task.subtasks.filter(s => s.id !== subtaskId) };
        });

        this.request(`/subtasks/${subtaskId}`, { method: 'DELETE' }).catch((error) => {
            console.error('Failed to delete subtask:', error);
        });
    }

    // Summaries
    fetchSummaries() {
        return [...this.summariesCache];
    }

    createSummary(summaryData: Omit<StoredSummary, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = Date.now();
        const newSummary: StoredSummary = {
            ...summaryData,
            id: `summary-${now}-${Math.random()}`,
            createdAt: now,
            updatedAt: now
        };
        this.summariesCache = [newSummary, ...this.summariesCache];
        this.request('/summaries', {
            method: 'POST',
            body: JSON.stringify(newSummary)
        }).catch((error) => {
            console.error('Failed to create summary:', error);
        });
        return newSummary;
    }

    updateSummary(summaryId: string, updates: Partial<StoredSummary>) {
        let updatedSummary: StoredSummary | undefined;
        this.summariesCache = this.summariesCache.map(summary => {
            if (summary.id === summaryId) {
                updatedSummary = { ...summary, ...updates, updatedAt: Date.now() };
                return updatedSummary;
            }
            return summary;
        });
        if (!updatedSummary) throw new Error('Summary not found');

        this.request(`/summaries/${summaryId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        }).catch((error) => {
            console.error('Failed to update summary:', error);
        });

        return updatedSummary;
    }

    deleteSummary(summaryId: string) {
        this.summariesCache = this.summariesCache.filter(s => s.id !== summaryId);
        this.request(`/summaries/${summaryId}`, { method: 'DELETE' }).catch((error) => {
            console.error('Failed to delete summary:', error);
        });
    }

    updateSummaries(summaries: StoredSummary[]) {
        this.summariesCache = summaries;
        this.request('/summaries', {
            method: 'PUT',
            body: JSON.stringify(summaries)
        }).catch((error) => {
            console.error('Failed to replace summaries:', error);
        });
        return summaries;
    }

    // Echo reports
    fetchEchoReports() {
        return [...this.echoReportsCache];
    }

    createEchoReport(reportData: Omit<EchoReport, 'id' | 'createdAt'>) {
        const now = Date.now();
        const newReport: EchoReport = {
            ...reportData,
            id: `echo-${now}-${Math.random()}`,
            createdAt: now
        };
        this.echoReportsCache = [newReport, ...this.echoReportsCache];
        this.request('/echo-reports', {
            method: 'POST',
            body: JSON.stringify(newReport)
        }).catch((error) => {
            console.error('Failed to create echo report:', error);
        });
        return newReport;
    }

    updateEchoReport(reportId: string, updates: Partial<EchoReport>) {
        let updatedReport: EchoReport | undefined;
        this.echoReportsCache = this.echoReportsCache.map(report => {
            if (report.id === reportId) {
                updatedReport = { ...report, ...updates };
                return updatedReport;
            }
            return report;
        });
        if (!updatedReport) throw new Error('Echo report not found');

        this.request(`/echo-reports/${reportId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        }).catch((error) => {
            console.error('Failed to update echo report:', error);
        });

        return updatedReport;
    }

    deleteEchoReport(reportId: string) {
        this.echoReportsCache = this.echoReportsCache.filter(r => r.id !== reportId);
        this.request(`/echo-reports/${reportId}`, { method: 'DELETE' }).catch((error) => {
            console.error('Failed to delete echo report:', error);
        });
    }

    exportData(): ExportedData {
        const settings = this.fetchSettings();
        return {
            version: '1.0.0',
            exportedAt: Date.now(),
            platform: 'web',
            data: {
                settings,
                lists: this.fetchLists(),
                tasks: this.fetchTasks(),
                summaries: this.fetchSummaries(),
                echoReports: this.fetchEchoReports()
            }
        };
    }

    analyzeImport(data: ExportedData, options: ImportOptions): DataConflict[] {
        const conflicts: DataConflict[] = [];
        if (!data || !data.data) return conflicts;

        if (options.includeLists && data.data.lists) {
            const localListsMap = new Map(this.fetchLists().map(list => [list.id, list]));
            data.data.lists.forEach(importedList => {
                const localList = localListsMap.get(importedList.id);
                if (localList) {
                    conflicts.push({ id: importedList.id, type: 'list', local: localList, imported: importedList });
                }
            });
        }

        if (options.includeTasks && data.data.tasks) {
            const localTasksMap = new Map(this.fetchTasks().map(task => [task.id, task]));
            data.data.tasks.forEach(importedTask => {
                const localTask = localTasksMap.get(importedTask.id);
                if (localTask) {
                    conflicts.push({ id: importedTask.id, type: 'task', local: localTask, imported: importedTask });
                }
            });
        }

        if (options.includeSummaries && data.data.summaries) {
            const localSummariesMap = new Map(this.fetchSummaries().map(summary => [summary.id, summary]));
            data.data.summaries.forEach(importedSummary => {
                const localSummary = localSummariesMap.get(importedSummary.id);
                if (localSummary) {
                    conflicts.push({ id: importedSummary.id, type: 'summary', local: localSummary, imported: importedSummary });
                }
            });
        }

        if (options.includeEcho && data.data.echoReports) {
            const localReportsMap = new Map(this.fetchEchoReports().map(report => [report.id, report]));
            data.data.echoReports.forEach(importedReport => {
                const localReport = localReportsMap.get(importedReport.id);
                if (localReport) {
                    conflicts.push({ id: importedReport.id, type: 'echo', local: localReport, imported: importedReport });
                }
            });
        }

        return conflicts;
    }

    importData(data: ExportedData, options: ImportOptions, conflictResolutions?: Map<string, ConflictResolution>): ImportResult {
        const result: ImportResult = {
            success: false,
            message: '',
            imported: { settings: 0, lists: 0, tasks: 0, summaries: 0, echo: 0 },
            conflicts: [],
            errors: []
        };

        try {
            if (!data || !data.data) {
                throw new Error('Invalid import data format');
            }

            if (options.includeSettings && data.data.settings) {
                this.updateAppearanceSettings(data.data.settings.appearance);
                this.updatePreferencesSettings(data.data.settings.preferences);
                this.updateAISettings(data.data.settings.ai);
                if (data.data.settings.proxy) {
                    this.updateProxySettings(data.data.settings.proxy);
                }
                result.imported.settings++;
            }

            if (options.includeLists && data.data.lists) {
                let lists = options.replaceAllData ? [] : this.fetchLists();
                const localListsMap = new Map(lists.map(list => [list.id, list]));

                data.data.lists.forEach(importedList => {
                    const existingList = localListsMap.get(importedList.id);
                    let shouldImport = true;
                    let listToImport = importedList;

                    if (existingList) {
                        const resolution = conflictResolutions?.get(importedList.id) || options.conflictResolution;
                        switch (resolution) {
                            case 'keep-local': shouldImport = false; break;
                            case 'keep-imported': listToImport = importedList; break;
                            case 'keep-newer': shouldImport = existingList.name !== importedList.name; break;
                            case 'skip': shouldImport = false; break;
                        }
                    }

                    if (shouldImport) {
                        if (existingList) {
                            const index = lists.findIndex(l => l.id === importedList.id);
                            lists[index] = listToImport;
                        } else {
                            lists.push(listToImport);
                        }
                        result.imported.lists++;
                    }
                });
                this.updateLists(lists);
            }

            if (options.includeTasks && data.data.tasks) {
                let tasks = options.replaceAllData ? [] : this.fetchTasks();
                const localTasksMap = new Map(tasks.map(task => [task.id, task]));

                data.data.tasks.forEach(importedTask => {
                    const existingTask = localTasksMap.get(importedTask.id);
                    let shouldImport = true;
                    let taskToImport = { ...importedTask, groupCategory: getTaskGroupCategory(importedTask) };

                    if (existingTask) {
                        const resolution = conflictResolutions?.get(importedTask.id) || options.conflictResolution;
                        switch (resolution) {
                            case 'keep-local': shouldImport = false; break;
                            case 'keep-imported': taskToImport = { ...importedTask, groupCategory: getTaskGroupCategory(importedTask) }; break;
                            case 'keep-newer': shouldImport = importedTask.updatedAt > existingTask.updatedAt; break;
                            case 'skip': shouldImport = false; break;
                        }
                    }

                    if (shouldImport) {
                        if (existingTask) {
                            const index = tasks.findIndex(t => t.id === importedTask.id);
                            tasks[index] = taskToImport;
                        } else {
                            tasks.push(taskToImport);
                        }
                        result.imported.tasks++;
                    }
                });
                this.updateTasks(tasks);
            }

            if (options.includeSummaries && data.data.summaries) {
                let summaries = options.replaceAllData ? [] : this.fetchSummaries();
                const localSummariesMap = new Map(summaries.map(summary => [summary.id, summary]));

                data.data.summaries.forEach(importedSummary => {
                    const existingSummary = localSummariesMap.get(importedSummary.id);
                    let shouldImport = true;
                    let summaryToImport = importedSummary;

                    if (existingSummary) {
                        const resolution = conflictResolutions?.get(importedSummary.id) || options.conflictResolution;
                        switch (resolution) {
                            case 'keep-local': shouldImport = false; break;
                            case 'keep-imported': summaryToImport = importedSummary; break;
                            case 'keep-newer': shouldImport = importedSummary.updatedAt > existingSummary.updatedAt; break;
                            case 'skip': shouldImport = false; break;
                        }
                    }

                    if (shouldImport) {
                        if (existingSummary) {
                            const index = summaries.findIndex(s => s.id === importedSummary.id);
                            summaries[index] = summaryToImport;
                        } else {
                            summaries.push(summaryToImport);
                        }
                        result.imported.summaries++;
                    }
                });
                this.updateSummaries(summaries);
            }

            if (options.includeEcho && data.data.echoReports) {
                let reports = options.replaceAllData ? [] : this.fetchEchoReports();
                const localReportsMap = new Map(reports.map(report => [report.id, report]));

                data.data.echoReports.forEach(importedReport => {
                    const existingReport = localReportsMap.get(importedReport.id);
                    let shouldImport = true;
                    let reportToImport = importedReport;

                    if (existingReport) {
                        const resolution = conflictResolutions?.get(importedReport.id) || options.conflictResolution;
                        if (resolution === 'keep-local' || resolution === 'skip') shouldImport = false;
                    }

                    if (shouldImport) {
                        if (existingReport) {
                            const index = reports.findIndex(r => r.id === importedReport.id);
                            reports[index] = reportToImport;
                        } else {
                            reports.push(reportToImport);
                        }
                        result.imported.echo++;
                    }
                });
                this.request('/echo-reports', {
                    method: 'PUT',
                    body: JSON.stringify(reports)
                }).catch((error) => {
                    console.error('Failed to replace echo reports:', error);
                });
                this.echoReportsCache = reports;
            }

            result.success = true;
            result.message = 'Data imported successfully';
        } catch (error) {
            result.success = false;
            result.message = error instanceof Error ? error.message : 'Import failed';
            result.errors.push(result.message);
        }

        return result;
    }
}
