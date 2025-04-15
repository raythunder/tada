// src/components/layout/IconBar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon, { IconName } from '../common/Icon';
import { useAppContext } from '../../context/AppContext';

const IconBar: React.FC = () => {
    const { currentUser, setIsSettingsOpen } = useAppContext();
    const location = useLocation();

    const navigationItems: { path: string; icon: IconName }[] = [
        { path: '/', icon: 'check-square' },
        { path: '/calendar', icon: 'calendar' },
    ];

    const handleAvatarClick = () => {
        setIsSettingsOpen(true);
    };

    return (
        <div className="w-12 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-2">
            <div className="mb-6 mt-2">
                {currentUser?.avatar ? (
                    <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full cursor-pointer"
                        onClick={handleAvatarClick}
                    />
                ) : (
                    <div
                        className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white cursor-pointer"
                        onClick={handleAvatarClick}
                    >
                        {currentUser?.name.charAt(0) || 'U'}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center space-y-6 flex-1">
                {navigationItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`p-2 rounded-md transition-colors ${
                            location.pathname === item.path ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <Icon name={item.icon} size={20} />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default IconBar;