// src/components/calendar/CalendarView.tsx
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Icon from '../common/Icon';
import { Task } from '@/types';

const CalendarView: React.FC = () => {
    const { tasks } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfMonth = getFirstDayOfMonth(year, month);

        const monthDays = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            monthDays.push(<div key={`empty-${i}`} className="h-24 border border-gray-200 bg-gray-50"></div>);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayTasks = tasks.filter(task =>
                task.dueDate &&
                new Date(task.dueDate).setHours(0, 0, 0, 0) === date.setHours(0, 0, 0, 0)
            );

            const isToday = new Date().setHours(0, 0, 0, 0) === date.setHours(0, 0, 0, 0);

            monthDays.push(
                <div
                    key={`day-${day}`}
                    className={`h-24 border border-gray-200 p-1 ${isToday ? 'bg-blue-50' : ''}`}
                >
                    <div className="flex justify-between items-center mb-1">
            <span className={`text-sm ${isToday ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
              {day}
            </span>
                        {dayTasks.length > 0 && (
                            <span className="text-xs text-gray-500">{dayTasks.length} tasks</span>
                        )}
                    </div>
                    <div className="overflow-y-auto max-h-16">
                        {dayTasks.slice(0, 3).map((task: Task) => (
                            <div
                                key={task.id}
                                className="text-xs p-1 mb-1 rounded bg-blue-100 text-blue-800 truncate"
                            >
                                {task.title}
                            </div>
                        ))}
                        {dayTasks.length > 3 && (
                            <div className="text-xs text-gray-500">+{dayTasks.length - 3} more</div>
                        )}
                    </div>
                </div>
            );
        }

        return monthDays;
    };

    const previousMonth = () => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            newMonth.setMonth(prev.getMonth() - 1);
            return newMonth;
        });
    };

    const nextMonth = () => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            newMonth.setMonth(prev.getMonth() + 1);
            return newMonth;
        });
    };

    const today = () => {
        setCurrentMonth(new Date());
    };

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h1 className="text-xl font-medium text-gray-800">Calendar</h1>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={today}
                        className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                        Today
                    </button>
                    <div className="flex items-center">
                        <button
                            onClick={previousMonth}
                            className="p-1 rounded hover:bg-gray-100"
                        >
                            <Icon name="arrow-left" size={16} />
                        </button>
                        <span className="mx-2 text-sm font-medium">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
                        <button
                            onClick={nextMonth}
                            className="p-1 rounded hover:bg-gray-100"
                        >
                            <Icon name="arrow-right" size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-7 gap-0">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center py-2 text-sm font-medium text-gray-600">
                            {day}
                        </div>
                    ))}
                    {renderCalendarDays()}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;