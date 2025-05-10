// src/components/layout/MainLayout.tsx
import React, {Suspense, useMemo} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal';
import Icon from "@/components/common/Icon";
import {twMerge} from 'tailwind-merge';

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
        <Icon name="loader" size={24} className="text-primary animate-spin" strokeWidth={1.5}/>
    </div>
);
LoadingSpinner.displayName = 'LoadingSpinner';

const MainLayout: React.FC = () => {
    const location = useLocation();

    // Sidebar is visible for all task-related views, hidden for /calendar and /summary
    const hideSidebar = useMemo(() => {
        return ['/calendar', '/summary'].some(path => location.pathname.startsWith(path));
    }, [location.pathname]);

    return (
        <div className="flex h-screen bg-white overflow-hidden font-primary">
            <IconBar/>
            {!hideSidebar && (
                // Sidebar width fixed at 240px per responsive spec
                <div className="w-[240px] flex-shrink-0 h-full relative">
                    <Sidebar/>
                </div>
            )}
            {/* Main Content Area taking remaining space, with defined padding */}
            <main className={twMerge(
                "flex-1 overflow-hidden relative flex flex-col min-w-0",
                "bg-white" // Main content area background is white
                // Padding for main content区: 左右内边距16px，上下内边距10px will be applied by child pages or tasklist/taskdetail wrappers
            )}>
                <Suspense fallback={<LoadingSpinner/>}>
                    <Outlet/>
                </Suspense>
            </main>
            <SettingsModal/>
        </div>
    );
};
MainLayout.displayName = 'MainLayout';
export default MainLayout;