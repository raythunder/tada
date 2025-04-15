// src/components/layout/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';
import { useAppContext } from '../../context/AppContext';

interface SidebarProps {
    className?: string;
}

interface SidebarItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
    count?: number;
    active?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, count, active }) => {
    return (
        <Link
            to={to}
            className={`flex items-center justify-between p-2 rounded-md mb-1 ${
                active ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
            <div className="flex items-center">
                <div className="mr-3">{icon}</div>
                <span>{label}</span>
            </div>
            {count !== undefined && <span className="text-gray-500 text-sm">{count}</span>}
        </Link>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
    const location = useLocation();
    const { tasks } = useAppContext();

    const getTodayTasksCount = () => {
        return tasks.filter(task =>
            task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString() &&
            !task.completed
        ).length;
    };

    const getNext7DaysTasksCount = () => {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        return tasks.filter(task =>
            task.dueDate &&
            new Date(task.dueDate) >= today &&
            new Date(task.dueDate) <= nextWeek &&
            !task.completed
        ).length;
    };

    const getInboxTasksCount = () => {
        return tasks.filter(task => task.list === 'Inbox' && !task.completed).length;
    };

    const getCompletedTasksCount = () => {
        return tasks.filter(task => task.completed).length;
    };

    return (
        <div className={`w-60 bg-white border-r border-gray-200 h-full ${className}`}>
            <div className="p-2">
                <SidebarItem
                    to="/"
                    icon={<Icon name="list" size={18} />}
                    label="All"
                    count={tasks.filter(t => !t.completed).length}
                    active={location.pathname === '/'}
                />
                <SidebarItem
                    to="/today"
                    icon={<Icon name="sun" size={18} />}
                    label="Today"
                    count={getTodayTasksCount()}
                    active={location.pathname === '/today'}
                />
                <SidebarItem
                    to="/next7days"
                    icon={<Icon name="calendar" size={18} />}
                    label="Next 7 Days"
                    count={getNext7DaysTasksCount()}
                    active={location.pathname === '/next7days'}
                />
                <SidebarItem
                    to="/inbox"
                    icon={<Icon name="inbox" size={18} />}
                    label="Inbox"
                    count={getInboxTasksCount()}
                    active={location.pathname === '/inbox'}
                />
                <SidebarItem
                    to="/summary"
                    icon={<Icon name="file-text" size={18} />}
                    label="Summary"
                    active={location.pathname === '/summary'}
                />
            </div>

            <div className="mt-4 border-t border-gray-200 pt-2 px-2">
                <SidebarItem
                    to="/completed"
                    icon={<Icon name="check" size={18} />}
                    label="Completed"
                    count={getCompletedTasksCount()}
                    active={location.pathname === '/completed'}
                />
                <SidebarItem
                    to="/trash"
                    icon={<Icon name="trash" size={18} />}
                    label="Trash"
                    active={location.pathname === '/trash'}
                />
            </div>

            <div className="mt-4 border-t border-gray-200 pt-2 px-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 pb-1">Lists</h3>
                {/* This would be populated with user lists */}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-2 px-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 pb-1">Tags</h3>
                {/* This would be populated with user tags */}
            </div>
        </div>
    );
};

export default Sidebar;