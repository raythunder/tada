import React from 'react';
import Icon from '@/components/ui/Icon';

/**
 * A full-screen loading spinner component, typically used as a fallback
 * for React.Suspense or during initial application load.
 */
const LoadingSpinner: React.FC = () => (
    <div
        className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-grey-deep/80 z-[20000] backdrop-blur-sm">
        <Icon name="loader" size={32} className="text-primary dark:text-primary-light animate-spin" strokeWidth={1.5}/>
    </div>
);

export default LoadingSpinner;