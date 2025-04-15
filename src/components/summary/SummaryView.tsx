// src/components/summary/SummaryView.tsx
import React from 'react';
import Icon from '../common/Icon';

const SummaryView: React.FC = () => {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formatDateRange = (start: Date, end: Date) => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h1 className="text-xl font-medium text-gray-800">Summary</h1>
                <div className="flex items-center space-x-2">
                    <button className="p-1 rounded-md hover:bg-gray-100">
                        <Icon name="more-horizontal" size={18} />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        This Week ({formatDateRange(startOfWeek, endOfWeek)})
                    </div>
                    <div className="flex space-x-2">
                        <button className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
                            All Lists
                        </button>
                        <button className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
                            All Status
                        </button>
                        <button className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
                            More
                        </button>
                    </div>
                </div>

                <div className="border border-gray-200 rounded-md mb-4">
                    <div className="flex items-center border-b border-gray-200 p-1 bg-gray-50">
                        <button className="p-1 rounded hover:bg-gray-200 mr-1">
                            <Icon name="edit" size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-200 mr-1">
                            <Icon name="list" size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-200 mr-1">
                            <Icon name="check" size={16} />
                        </button>
                    </div>
                    <div className="p-3">
                        <h2 className="font-medium text-gray-800 mb-3">Apr 13 - Apr 19</h2>
                        <h3 className="font-medium text-gray-700 mb-2">Completed</h3>
                        <ul className="list-disc pl-5 text-sm text-gray-600">
                            <li>[Apr 14] Swagger2讲解</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryView;