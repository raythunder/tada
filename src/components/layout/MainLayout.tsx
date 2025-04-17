// src/components/layout/MainLayout.tsx
import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal';
import { useAtomValue } from 'jotai';
import { isSettingsOpenAtom } from '@/store/atoms';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from "@/components/common/Icon";
import { twMerge } from 'tailwind-merge';

// Simple Loading Spinner Component
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full bg-canvas">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-primary"
        >
            <Icon name="loader" size={28} />
        </motion.div>
    </div>
);

// Main Layout Component
const MainLayout: React.FC = () => {
    const isSettingsOpen = useAtomValue(isSettingsOpenAtom);
    const location = useLocation();
    const hideSidebar = ['/calendar', '/summary'].some(path => location.pathname.startsWith(path));

    return (
        <div className="flex h-screen bg-canvas overflow-hidden">
            <IconBar />

            {/* Conditionally rendered Sidebar with subtle animation */}
            <AnimatePresence initial={false}>
                {!hideSidebar && (
                    <motion.div
                        key="sidebar"
                        // Simpler, faster slide animation
                        initial={{ width: 0, opacity: 0, marginRight: '-1px' }}
                        animate={{ width: 224, opacity: 1, marginRight: '0px' }}
                        exit={{ width: 0, opacity: 0, marginRight: '-1px', transition: { duration: 0.15, ease: 'easeIn' } }}
                        transition={{ duration: 0.2, ease: 'easeOut' }} // Use standard ease-out
                        className="flex-shrink-0 h-full"
                        style={{ overflow: 'hidden' }}
                    >
                        <Sidebar />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main content area */}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col",
            )}>
                <Suspense fallback={<LoadingSpinner />}>
                    <Outlet />
                </Suspense>
            </main>

            {/* Animated Modals (Settings, Add List is handled in Sidebar) */}
            <AnimatePresence>
                {isSettingsOpen && <SettingsModal key="settings-modal" />}
            </AnimatePresence>
        </div>
    );
};

export default MainLayout;