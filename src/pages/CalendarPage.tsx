// src/pages/CalendarPage.tsx
import React from 'react';
import CalendarView from '../components/calendar/CalendarView';

// Simple wrapper component for the Calendar View
const CalendarPage: React.FC = () => {
    // CalendarView internally handles its state and logic
    return <CalendarView/>;
};
CalendarPage.displayName = 'CalendarPage';
export default CalendarPage;