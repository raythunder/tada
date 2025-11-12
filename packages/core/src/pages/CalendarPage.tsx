import React from 'react';
import CalendarView from "@/components/features/calendar/CalendarView.tsx";

/**
 * A simple wrapper component that renders the `CalendarView`.
 * This acts as the route component for the `/calendar` path.
 */
const CalendarPage: React.FC = () => {
    return <CalendarView/>;
};

CalendarPage.displayName = 'CalendarPage';
export default CalendarPage;