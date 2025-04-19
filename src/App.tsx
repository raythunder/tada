// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, useParams, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom, useSetAtom } from 'jotai'; // Already imported
import { currentFilterAtom, selectedTaskIdAtom, searchTermAtom } from './store/atoms'; // Already imported

// Route Change Handler: Updates global state based on URL changes
// Ensures filter state, selection, and search are synchronized with the route.
const RouteChangeHandler: React.FC = () => {
    const [currentFilterInternal, setCurrentFilter] = useAtom(currentFilterAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const setSearchTerm = useSetAtom(searchTermAtom);
    const location = useLocation(); // Current URL location
    const params = useParams(); // URL parameters (like listName, tagName)

    useEffect(() => {
        const { pathname } = location; // Get the current path
        // Decode list/tag names from URL parameters
        const listName = params.listName ? decodeURIComponent(params.listName) : '';
        const tagName = params.tagName ? decodeURIComponent(params.tagName) : '';

        // Determine the new filter based on the current path
        let newFilter: TaskFilter = 'all'; // Default filter

        if (pathname === '/today') newFilter = 'today';
        else if (pathname === '/next7days') newFilter = 'next7days';
        else if (pathname === '/completed') newFilter = 'completed';
        else if (pathname === '/trash') newFilter = 'trash';
        else if (pathname.startsWith('/list/') && listName) newFilter = `list-${listName}`;
        else if (pathname.startsWith('/tag/') && tagName) newFilter = `tag-${tagName}`;
            // For Calendar and Summary, the view is different, but we reset the underlying
        // TaskList filter context to 'all' if the user navigates away from them later.
        else if (pathname === '/summary') newFilter = 'all'; // Keep underlying filter logical
        else if (pathname === '/calendar') newFilter = 'all'; // Keep underlying filter logical
        else if (pathname === '/all' || pathname === '/') newFilter = 'all'; // Handle root and explicit /all
        // Note: No need for a default case setting to 'all', as it's the initial value.

        // Update the global filter atom *only if it has changed*
        if (currentFilterInternal !== newFilter) {
            // console.log(`Route Change: Filter changing from ${currentFilterInternal} to ${newFilter}`);
            setCurrentFilter(newFilter);
        }

        // --- Clear Selection and Search Based on Navigation Context ---
        // Define views that maintain selection/search continuity
        const coreTaskViews: TaskFilter[] = ['all', 'today', 'next7days']; // Add list/tag filters dynamically
        const isNavigatingWithinCoreLists =
            (newFilter.startsWith('list-') || coreTaskViews.includes(newFilter)) &&
            (currentFilterInternal.startsWith('list-') || coreTaskViews.includes(currentFilterInternal));
        const isNavigatingWithinCoreTags =
            newFilter.startsWith('tag-') && currentFilterInternal.startsWith('tag-');

        // Clear selection unless navigating between standard filters, lists, or tags
        const shouldClearSelection = !(isNavigatingWithinCoreLists || isNavigatingWithinCoreTags);
        // Generally clear search when clearing selection or moving to non-task views
        const shouldClearSearch = shouldClearSelection || ['/calendar', '/summary'].includes(pathname);

        if (shouldClearSelection) {
            setSelectedTaskId(null);
        }
        if (shouldClearSearch) {
            setSearchTerm('');
        }

        // Dependencies: React to changes in path, params, and the atoms it modifies to prevent loops
    }, [location.pathname, params.listName, params.tagName, setCurrentFilter, setSelectedTaskId, setSearchTerm, currentFilterInternal]);

    // This component renders the nested routes defined within its <Route> definition
    return <Outlet />;
};


// Wrapper Component for List-based Routes
// Decodes the list name from URL params and passes it to MainPage
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    const decodedListName = listName ? decodeURIComponent(listName) : 'Inbox'; // Default to Inbox if no name

    // Redirect if listName is invalid or missing? For now, defaults to Inbox.
    // if (!decodedListName) return <Navigate to="/all" replace />;

    const filter: TaskFilter = `list-${decodedListName}`;
    return <MainPage title={decodedListName} filter={filter} />;
};

// Wrapper Component for Tag-based Routes
// Decodes the tag name from URL params and passes it to MainPage
const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';

    // Redirect if tagName is missing
    if (!decodedTagName) return <Navigate to="/all" replace />;

    const filter: TaskFilter = `tag-${decodedTagName}`;
    // Display title with '#' prefix
    return <MainPage title={`#${decodedTagName}`} filter={filter} />;
};


// Main Application Component with Routing Setup
const App: React.FC = () => {
    return (
        <Routes>
            {/* Main Layout wraps all primary views */}
            <Route path="/" element={<MainLayout />}>
                {/* RouteChangeHandler manages state updates based on route */}
                <Route element={<RouteChangeHandler/>}>
                    {/* Index route redirects to '/all' */}
                    <Route index element={<Navigate to="/all" replace />} />
                    {/* Standard Filter Routes */}
                    <Route path="all" element={<MainPage title="All Tasks" filter="all" />} />
                    <Route path="today" element={<MainPage title="Today" filter="today" />} />
                    <Route path="next7days" element={<MainPage title="Next 7 Days" filter="next7days" />} />
                    <Route path="completed" element={<MainPage title="Completed" filter="completed" />} />
                    <Route path="trash" element={<MainPage title="Trash" filter="trash" />} />
                    {/* Special Views */}
                    <Route path="summary" element={<SummaryPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    {/* Dynamic List Route */}
                    <Route path="list/:listName" element={<ListPageWrapper />} />
                    {/* Dynamic Tag Route */}
                    <Route path="tag/:tagName" element={<TagPageWrapper />} />
                    {/* Catch-all route redirects to '/all' */}
                    <Route path="*" element={<Navigate to="/all" replace />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default App;