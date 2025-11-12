import React from 'react';
import SummaryView from "@/components/features/summary/SummaryView.tsx";

/**
 * A simple wrapper component that renders the `SummaryView`.
 * This acts as the route component for the `/summary` path.
 */
const SummaryPage: React.FC = () => {
    return <SummaryView/>;
};

SummaryPage.displayName = 'SummaryPage';
export default SummaryPage;