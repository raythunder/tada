// src/App.tsx
import React from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import MainPage from './pages/MainPage';
import SummaryPage from './pages/SummaryPage';
import CalendarPage from './pages/CalendarPage';
import { TaskFilter } from './types';
import { useAtom } from 'jotai';
import { currentFilterAtom } from './store/atoms';

// Helper component to set the global filter state based on the current route
// This ensures the correct data is loaded/filtered by atoms even if the component re-renders
const RouteFilterUpdater: React.FC<{ filter: TaskFilter }> = ({ filter }) => {
    const [, setCurrentFilter] = useAtom(currentFilterAtom);
    // Update the filter whenever the component renders with a new filter prop
    React.useEffect(() => {
        setCurrentFilter(filter);
    }, [filter, setCurrentFilter]);
    return null; // This component doesn't render anything itself
};

// Wrapper for list pages to extract name and set filter
const ListPageWrapper: React.FC = () => {
    const { listName } = useParams<{ listName: string }>();
    const decodedListName = listName ? decodeURIComponent(listName) : '';

    if (!decodedListName) {
        // Redirect to a default page if listName is missing
        return <Navigate to="/all" replace />;
    }
    const filter: TaskFilter = `list-${decodedListName}`;
    return (
        <>
            <RouteFilterUpdater filter={filter} />
            <MainPage title={decodedListName} filter={filter} />
        </>
    );
};

// Wrapper for tag pages
const TagPageWrapper: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const decodedTagName = tagName ? decodeURIComponent(tagName) : '';

    if (!decodedTagName) {
        return <Navigate to="/all" replace />;
    }
    const filter: TaskFilter = `tag-${decodedTagName}`;
    return (
        <>
            <RouteFilterUpdater filter={filter} />
            <MainPage title={`#${decodedTagName}`} filter={filter} />
        </>
    );
};

// Default Page Wrapper (for index route, defaulting to 'All Tasks')
const DefaultPageWrapper: React.FC = () => {
    const filter: TaskFilter = 'all'; // Default filter is now 'all'
    return (
        <>
            <RouteFilterUpdater filter={filter} />
            <MainPage title="All Tasks" filter={filter} />
        </>
    );
};


const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />}>
                {/* Index route defaults to 'All Tasks' view */}
                <Route index element={<DefaultPageWrapper />} />

                {/* Static Filter Routes */}
                <Route path="all" element={<DefaultPageWrapper />} /> {/* Explicit '/all' route */}
                <Route path="today" element={<><RouteFilterUpdater filter="today" /><MainPage title="Today" filter="today" /></>} />
                <Route path="next7days" element={<><RouteFilterUpdater filter="next7days" /><MainPage title="Next 7 Days" filter="next7days" /></>} />
                <Route path="completed" element={<><RouteFilterUpdater filter="completed" /><MainPage title="Completed" filter="completed" /></>} />
                <Route path="trash" element={<><RouteFilterUpdater filter="trash" /><MainPage title="Trash" filter="trash" /></>} />

                {/* Views without Sidebar */}
                <Route path="summary" element={<><RouteFilterUpdater filter="all" /><SummaryPage /></>} /> {/* Summary might use 'all' internally or its own logic */}
                <Route path="calendar" element={<><RouteFilterUpdater filter="all" /><CalendarPage /></>} /> {/* Calendar likely shows all relevant tasks */}

                {/* Dynamic routes for lists and tags */}
                <Route path="list/:listName" element={<ListPageWrapper />} />
                <Route path="tag/:tagName" element={<TagPageWrapper />} />

                {/* Fallback route - redirect to default */}
                <Route path="*" element={<Navigate to="/all" replace />} />
            </Route>
        </Routes>
    );
};

export default App;