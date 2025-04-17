// src/components/layout/IconBar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';
import { useAtom } from 'jotai';
import { currentUserAtom, isSettingsOpenAtom } from '@/store/atoms';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import Button from "@/components/common/Button";
import { IconName } from "@/components/common/IconMap";

const IconBar: React.FC = () => {
    const [currentUser] = useAtom(currentUserAtom);
    const [, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);

    const navigationItems: { path: string; icon: IconName, label: string }[] = [
        { path: '/all', icon: 'archive', label: 'All Tasks' },
        { path: '/calendar', icon: 'calendar-days', label: 'Calendar' },
        { path: '/summary', icon: 'sparkles', label: 'AI Summary' },
    ];

    const handleAvatarClick = () => {
        setIsSettingsOpen(true);
    };

    const getNavLinkClass = ({ isActive }: { isActive: boolean }): string =>
        twMerge(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-150 ease-apple group relative',
            isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-black/5 hover:text-gray-700'
        );

    // Subtle stagger animation for icons
    const iconVariants = {
        hidden: { opacity: 0, x: -5 }, // Less dramatic slide
        visible: (i: number) => ({
            opacity: 1,
            x: 0,
            transition: { delay: 0.1 + i * 0.05, duration: 0.15, ease: 'easeOut' }, // Faster duration
        }),
    };

    return (
        // Apply glass effect to IconBar background
        <div className="w-16 bg-glass-alt-100 backdrop-blur-md border-r border-black/5 flex flex-col items-center py-4 flex-shrink-0 z-20 shadow-subtle">
            {/* App Logo Placeholder - Subtle animation */}
            <motion.div
                className="mb-6 mt-1 flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary/90 to-blue-500/80 rounded-lg text-white font-bold text-xl shadow-inner"
                initial={{ opacity: 0, scale: 0.8 }} // Start slightly smaller
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05, duration: 0.2, ease: 'easeOut' }} // Faster duration
                aria-label="Tada App Logo"
            >
                <span className="-mt-0.5">T</span>
            </motion.div>

            {/* Navigation Links */}
            <nav className="flex flex-col items-center space-y-2 flex-1">
                {navigationItems.map((item, index) => (
                    <motion.div
                        key={item.path}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        variants={iconVariants}
                    >
                        <NavLink to={item.path} className={getNavLinkClass} title={item.label} aria-label={item.label} end={item.path === '/all'}>
                            {/* No inner scale animation for simplicity */}
                            <Icon name={item.icon} size={20} strokeWidth={1.75} />
                        </NavLink>
                    </motion.div>
                ))}
            </nav>

            {/* Avatar / Settings Trigger - Subtle animation */}
            <motion.div
                className="mt-auto mb-1"
                initial={{ opacity: 0, scale: 0.7 }} // Start smaller
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + navigationItems.length * 0.05, duration: 0.2, ease: 'easeOut' }} // Faster duration
            >
                <Button
                    onClick={handleAvatarClick}
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full overflow-hidden p-0 border border-black/5 shadow-inner"
                    aria-label="Account Settings"
                >
                    {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name || 'User Avatar'} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-medium text-sm">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <Icon name="user" size={16} />}
                        </div>
                    )}
                </Button>
            </motion.div>
        </div>
    );
};

export default IconBar;