// src/components/layout/MainLayout.tsx
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal'; // Dynamic import if it gets large
import { useAtom } from 'jotai';
import { isSettingsOpenAtom } from '@/store/atoms';
import { AnimatePresence } from 'framer-motion';
import Icon from "@/components/common/Icon.tsx";


const MainLayout: React.FC = () => {
    const [isSettingsOpen] = useAtom(isSettingsOpenAtom);

    return (
        <div className="flex h-screen bg-canvas overflow-hidden">
            <IconBar />
            <Sidebar />
            <main className="flex-1 overflow-hidden relative flex flex-col">
                {/* Outlet renders the current page */}
                <Suspense fallback={<LoadingSpinner />}>
                    <Outlet />
                </Suspense>
            </main>

            {/* Animated Settings Modal */}
            <AnimatePresence>
                {isSettingsOpen && <SettingsModal />}
            </AnimatePresence>
        </div>
    );
};

// Simple loading spinner component
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <Icon name="loader" size={32} className="text-primary animate-spin" />
    </div>
);


export default MainLayout;