// src/components/layout/MainLayout.tsx
import React, {Suspense, useMemo} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
// Keep SettingsModal import, it uses Radix Dialog internally now
import SettingsModal from '../settings/SettingsModal';
import {useAtomValue} from 'jotai';
import {searchTermAtom} from '@/store/atoms';
import Icon from "@/components/common/Icon";
import {twMerge} from 'tailwind-merge';

// Simple loading spinner component (No changes)
const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-glass/70 backdrop-blur-md z-50">
        <Icon name="loader" size={32} className="text-primary animate-spin"/>
    </div>
);
LoadingSpinner.displayName = 'LoadingSpinner';

const MainLayout: React.FC = () => {
    const searchTerm = useAtomValue(searchTermAtom);
    const location = useLocation();

    // Sidebar visibility logic (No changes)
    const hideSidebar = useMemo(() => {
        const isSearching = searchTerm.trim().length > 0;
        return !isSearching && ['/calendar', '/summary'].some(path => location.pathname.startsWith(path));
    }, [searchTerm, location.pathname]);

    return (
        // Overall layout structure remains the same
        <div className="flex h-screen bg-canvas-alt overflow-hidden font-sans">
            <IconBar/>

            {/* Conditional Sidebar rendering */}
            {!hideSidebar && (
                <div className="w-56 flex-shrink-0 h-full relative"> {/* Fixed width */}
                    <Sidebar/>
                </div>
            )}

            {/* Main Content Area */}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col min-w-0",
                "bg-glass/30 backdrop-blur-lg" // Background styling
            )}>
                {/* Suspense for lazy-loaded route components */}
                <Suspense fallback={<LoadingSpinner/>}>
                    <Outlet/> {/* Renders the matched child route */}
                </Suspense>
            </main>

            {/* Settings Modal (Radix Dialog) - renders conditionally */}
            {/* No need for explicit key if Radix handles state reset well */}
            <SettingsModal/>

            {/* AddListModal is rendered within Sidebar using Radix Dialog */}
        </div>
    );
};
MainLayout.displayName = 'MainLayout';
export default MainLayout;