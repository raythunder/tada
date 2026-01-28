import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Provider as JotaiProvider } from 'jotai';
import * as Tooltip from '@radix-ui/react-tooltip';
import AuthGate from './auth/AuthGate';

import '@tada/core/locales';
import '@tada/core/styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element. Ensure your HTML has an element with id='root'.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <JotaiProvider>
            <Tooltip.Provider delayDuration={200}>
                <HashRouter>
                    <AuthGate />
                </HashRouter>
            </Tooltip.Provider>
        </JotaiProvider>
    </React.StrictMode>
);
