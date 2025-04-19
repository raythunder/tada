// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, useParams, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom, useSetAtom } from 'jotai';
import { currentFilterAtom, selectedTaskIdAtom, searchTermAtom } from './store/atoms';

// Route Change Handler
const RouteChangeHandler: React.FC = () => {
    const [currentFilterInternal, setCurrentFilter] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const setSearchTerm = useSetAtom(searchTermAtom);
    const location = useLocation();
    const params = useParams();

    useEffect(() => {
        const { pathname } = location;
        const listName = params.listName ? decodeURIComponent(params.listName) : '';
        const tagName = params.tagName ? decodeURIComponent(params.tagName) : '';

        let newFilter: TaskFilter = 'all'; // Default

        if (pathname === '/today') newFilter = 'today';
        else if (pathname === '/next7days') newFilter = 'next7days';
        else if (pathname === '/completed') newFilter = 'completed';
        else if (pathname === '/trash') newFilter = 'trash';
        else if (pathname.startsWith('/list/') && listName) newFilter = `list-${listName}`;
        else if (pathname.startsWith('/tag/') && tagName) newFilter = `tag-${tagName}`;
        else if (pathname === '/summary') newFilter = 'all'; // Use 'all' as base filter context
        else if (pathname === '/calendar') newFilter = 'all'; // Use 'all' as base filter context
        else if (pathname === '/all' || pathname === '/') newFilter = 'all';

        if (currentFilterInternal !== newFilter) {
            // console.log(`Route Change: Filter changing from ${currentFilterInternal} to ${newFilter}`);
            setCurrentFilter(newFilter);
            // Clear selection and search ONLY when the main filter context changes
            setSelectedTaskId(null);
            setSearchTerm('');
        }

    }, [location.pathname, params.listName, params.tagName, setCurrentFilter, setSelectedTaskId, setSearchTerm, currentFilterInternal]);

    return <Outlet />; // Renders the matched child route
};


// List Page Wrapper
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    const decodedListName = listName ? decodeURIComponent(listName) : 'Inbox';
    if (!decodedListName) return <Navigate to="/list/Inbox" replace />; // Should technically not happen with path="list/:listName"
    const filter: TaskFilter = `list-${decodedListName}`;
    return <MainPage title={decodedListName} filter={filter} />;
};

// Tag Page Wrapper
const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';
    if (!decodedTagName) return <Navigate to="/all" replace />; // Redirect if tag name is missing
    const filter: TaskFilter = `tag-${decodedTagName}`;
    return <MainPage title={`#${decodedTagName}`} filter={filter} />;
};


// Main Application Component
const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                <Route element={<RouteChangeHandler/>}>
                    <Route index element={<Navigate to="/all" replace />} />
                    <Route path="all" element={<MainPage title="All Tasks" filter="all" />} />
                    <Route path="today" element={<MainPage title="Today" filter="today" />} />
                    <Route path="next7days" element={<MainPage title="Next 7 Days" filter="next7days" />} />
                    <Route path="completed" element={<MainPage title="Completed" filter="completed" />} />
                    <Route path="trash" element={<MainPage title="Trash" filter="trash" />} />
                    <Route path="summary" element={<SummaryPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="list/:listName" element={<ListPageWrapper />} />
                    <Route path="list/" element={<Navigate to="/list/Inbox" replace />} /> {/* Handle trailing slash */}
                    <Route path="tag/:tagName" element={<TagPageWrapper />} />
                    <Route path="tag/" element={<Navigate to="/all" replace />} /> {/* Handle trailing slash */}
                    <Route path="*" element={<Navigate to="/all" replace />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default App;