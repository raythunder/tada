// src/context/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Task, ViewMode, ListDisplayMode } from '@/types';

interface AppContextType {
    currentUser: User | null;
    tasks: Task[];
    selectedTask: Task | null;
    viewMode: ViewMode;
    listDisplayMode: ListDisplayMode;
    setCurrentUser: (user: User | null) => void;
    setTasks: (tasks: Task[]) => void;
    setSelectedTask: (task: Task | null) => void;
    setViewMode: (mode: ViewMode) => void;
    setListDisplayMode: (mode: ListDisplayMode) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
}

const initialContext: AppContextType = {
    currentUser: null,
    tasks: [],
    selectedTask: null,
    viewMode: 'list',
    listDisplayMode: 'expanded',
    setCurrentUser: () => {},
    setTasks: () => {},
    setSelectedTask: () => {},
    setViewMode: () => {},
    setListDisplayMode: () => {},
    isSettingsOpen: false,
    setIsSettingsOpen: () => {},
};

const AppContext = createContext<AppContextType>(initialContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>({
        id: '1',
        name: 'Liu Yunpeng',
        email: 'yp.leao@gmail.com',
        avatar: '/vite.svg',
        isPremium: true,
    });
    const [tasks, setTasks] = useState<Task[]>([
        {
            id: '1',
            title: '施工组织设计评审表',
            completed: false,
            dueDate: new Date(),
            list: 'Inbox',
            content: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '2',
            title: '开发框架讲解',
            completed: false,
            dueDate: new Date(),
            list: 'Inbox',
            content: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '3',
            title: 'RESTful讲解',
            completed: false,
            dueDate: new Date(),
            list: 'Inbox',
            content: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '4',
            title: '欢迎加入Tada',
            completed: false,
            dueDate: null,
            list: 'Inbox',
            content: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '5',
            title: '我能用Tada做什么?',
            completed: false,
            dueDate: null,
            list: 'Inbox',
            content: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '6',
            title: '研究一下patch',
            completed: false,
            dueDate: new Date(2018, 8, 13),
            list: 'Inbox',
            content: '',
            createdAt: new Date(2018, 8, 13),
            updatedAt: new Date(2018, 8, 13),
        },
        {
            id: '7',
            title: 'Swagger2讲解',
            completed: false,
            dueDate: new Date(2018, 8, 14),
            list: 'Inbox',
            content: '',
            createdAt: new Date(2018, 8, 14),
            updatedAt: new Date(2018, 8, 14),
        },
    ]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [listDisplayMode, setListDisplayMode] = useState<ListDisplayMode>('expanded');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <AppContext.Provider
            value={{
                currentUser,
                tasks,
                selectedTask,
                viewMode,
                listDisplayMode,
                setCurrentUser,
                setTasks,
                setSelectedTask,
                setViewMode,
                setListDisplayMode,
                isSettingsOpen,
                setIsSettingsOpen,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};