// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, useParams, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom } from 'jotai';
import { currentFilterAtom, selectedTaskIdAtom } from './store/atoms';

// Handler to sync URL/filter and clear selection on nav
const RouteChangeHandler: React.FC = () => {
    const [, setCurrentFilter] = useAtom(currentFilterAtom);
    const [, setSelectedTaskId] = useAtom(selectedTaskIdAtom);
    const location = useLocation();
    const params = useParams();

    useEffect(() => {
        let newFilter: TaskFilter = 'all';
        const pathname = location.pathname;

        if (pathname === '/today') newFilter = 'today';
        else if (pathname === '/next7days') newFilter = 'next7days';
        else if (pathname === '/completed') newFilter = 'completed';
        else if (pathname === '/trash') newFilter = 'trash';
        else if (pathname === '/all') newFilter = 'all';
        else if (pathname.startsWith('/list/')) {
            const listName = params.listName ? decodeURIComponent(params.listName) : '';
            if (listName) newFilter = `list-${listName}`;
        } else if (pathname.startsWith('/tag/')) {
            const tagName = params.tagName ? decodeURIComponent(params.tagName) : '';
            if (tagName) newFilter = `tag-${tagName}`;
        } else if (pathname === '/summary' || pathname === '/calendar') {
            newFilter = 'all'; // Keep sidebar consistent
        } else if (pathname === '/') {
            newFilter = 'all';
        }

        setCurrentFilter(current => current !== newFilter ? newFilter : current);

        // Always deselect task when the main route/filter changes
        setSelectedTaskId(null);

    }, [location.pathname, params, setCurrentFilter, setSelectedTaskId]);

    return <Outlet />; // Render nested routes
};

// Wrappers for List/Tag pages
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    const decodedListName = listName ? decodeURIComponent(listName) : '';
    if (!decodedListName) return <Navigate to="/all" replace />;
    const filter: TaskFilter = `list-${decodedListName}`;
    return <MainPage title={decodedListName} filter={filter} />;
};

const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';
    if (!decodedTagName) return <Navigate to="/all" replace />;
    const filter: TaskFilter = `tag-${decodedTagName}`;
    return <MainPage title={`#${decodedTagName}`} filter={filter} />;
};

// Main Application Component with Routing
const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                <Route element={<RouteChangeHandler/>}>
                    <Route index element={<MainPage title="All Tasks" filter="all" />} />
                    <Route path="all" element={<MainPage title="All Tasks" filter="all" />} />
                    <Route path="today" element={<MainPage title="Today" filter="today" />} />
                    <Route path="next7days" element={<MainPage title="Next 7 Days" filter="next7days" />} />
                    <Route path="completed" element={<MainPage title="Completed" filter="completed" />} />
                    <Route path="trash" element={<MainPage title="Trash" filter="trash" />} />
                    <Route path="summary" element={<SummaryPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="list/:listName" element={<ListPageWrapper />} />
                    <Route path="tag/:tagName" element={<TagPageWrapper />} />
                    <Route path="*" element={<Navigate to="/all" replace />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default App;