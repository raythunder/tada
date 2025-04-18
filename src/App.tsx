// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, useParams, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom, useSetAtom } from 'jotai';
import { currentFilterAtom, selectedTaskIdAtom, searchTermAtom } from './store/atoms'; // Added searchTermAtom

// Helper Component to Update Filter State and Clear Selection/Search on Route Change
const RouteChangeHandler: React.FC = () => {
    const [currentFilterInternal, setCurrentFilter] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const setSearchTerm = useSetAtom(searchTermAtom); // Setter for search term
    const location = useLocation();
    const params = useParams();

    useEffect(() => {
        let newFilter: TaskFilter = 'all'; // Default filter
        let shouldClearSelection = true; // Default to clearing selection
        let shouldClearSearch = true; // Default to clearing search

        const pathname = location.pathname;
        const listName = params.listName ? decodeURIComponent(params.listName) : '';
        const tagName = params.tagName ? decodeURIComponent(params.tagName) : '';

        // Determine filter based on route
        if (pathname === '/today') newFilter = 'today';
        else if (pathname === '/next7days') newFilter = 'next7days';
        else if (pathname === '/completed') newFilter = 'completed';
        else if (pathname === '/trash') newFilter = 'trash';
        else if (pathname === '/all') newFilter = 'all';
        else if (pathname.startsWith('/list/') && listName) newFilter = `list-${listName}`;
        else if (pathname.startsWith('/tag/') && tagName) newFilter = `tag-${tagName}`;
        else if (pathname === '/summary' || pathname === '/calendar') newFilter = currentFilterInternal; // Keep filter for sidebar consistency
        else if (pathname === '/') newFilter = 'all'; // Index maps to 'all'
        else newFilter = 'all'; // Fallback

        // Determine if selection/search should be cleared
        // Keep selection/search when navigating between list/tag/standard views
        const isListOrTagView = newFilter.startsWith('list-') || newFilter.startsWith('tag-');
        const isStandardView = ['all', 'today', 'next7days'].includes(newFilter);

        if (isListOrTagView || isStandardView) {
            shouldClearSelection = false; // Don't clear selection within these views
            shouldClearSearch = false; // Don't clear search term when navigating lists/tags/standard filters
        }
        // Always clear selection for special views (completed, trash, calendar, summary)
        if (['completed', 'trash', '/calendar', '/summary'].some(val => newFilter.includes(val) || pathname.startsWith(val))) {
            shouldClearSelection = true;
            // Also clear search when going to non-list views? Yes, usually.
            shouldClearSearch = true;
        }


        // Update filter atom only if it changed
        if (currentFilterInternal !== newFilter) {
            setCurrentFilter(newFilter);
            // Clear selection only when filter type changes significantly or for special views
            if (shouldClearSelection) {
                setSelectedTaskId(null);
            }
        }

        // Clear search term if needed
        if (shouldClearSearch) {
            setSearchTerm('');
        }

    }, [location.pathname, params, currentFilterInternal, setCurrentFilter, setSelectedTaskId, setSearchTerm]); // Added setSearchTerm

    return <Outlet />; // Render nested routes
};


// Wrapper for List Pages
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    const decodedListName = listName ? decodeURIComponent(listName) : 'Inbox';
    if (!decodedListName) return <Navigate to="/all" replace />;
    const filter: TaskFilter = `list-${decodedListName}`;
    return <MainPage title={decodedListName} filter={filter} />;
};

// Wrapper for Tag Pages
const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';
    if (!decodedTagName) return <Navigate to="/all" replace />;
    const filter: TaskFilter = `tag-${decodedTagName}`;
    return <MainPage title={`#${decodedTagName}`} filter={filter} />;
};


// Main Application Component with Routing Setup
const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                {/* RouteChangeHandler manages filter/selection based on route */}
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
                    <Route path="tag/:tagName" element={<TagPageWrapper />} />
                    <Route path="*" element={<Navigate to="/all" replace />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default App;