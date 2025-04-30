// src/pages/SummaryPage.tsx
import React from 'react';
import SummaryView from '../components/summary/SummaryView';

// Simple wrapper component for the Summary View
const SummaryPage: React.FC = () => {
    // SummaryView handles its own state and logic
    return <SummaryView/>;
};
SummaryPage.displayName = 'SummaryPage';
export default SummaryPage;