// src/components/layout/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import IconBar from './IconBar';
import Sidebar from './Sidebar';
import SettingsModal from '../settings/SettingsModal';
import { useAppContext } from '../../context/AppContext';

const MainLayout: React.FC = () => {
    const { isSettingsOpen } = useAppContext();

    return (
        <div className="flex h-screen bg-white">
            <IconBar />
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
            {isSettingsOpen && <SettingsModal />}
        </div>
    );
};

export default MainLayout;