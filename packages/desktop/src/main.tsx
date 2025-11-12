import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Provider as JotaiProvider } from 'jotai';
import { App } from '@tada/core';
import * as Tooltip from '@radix-ui/react-tooltip';
import storageManager from '@tada/core/services/storageManager';
import { SqliteStorageService } from './services/sqliteStorageService';

// Import and initialize i18n configuration from the core package.
import '@tada/core/locales';

// Import base styles from the core package.
import '@tada/core/styles/index.css';

/**
 * Initializes and renders the React application for the desktop environment.
 * It sets up the SQLite storage service before mounting the root App component.
 */
const initializeApp = async () => {
    const storageService = new SqliteStorageService();
    await storageService.initialize();
    storageManager.register(storageService);

    // Preload all data from the database into memory caches for faster initial render.
    await storageService.preloadData();

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
                        <App />
                    </HashRouter>
                </Tooltip.Provider>
            </JotaiProvider>
        </React.StrictMode>
    );
};

// Execute the app initialization and catch any critical errors.
initializeApp().catch(error => {
    console.error('Failed to initialize app:', error);
    const errorMessage = String(error);
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error, null, 2);

    // Display a detailed error message in the UI if initialization fails.
    document.body.innerHTML = `
        <div style="padding: 20px; color: #d9534f; background: #f2dede; border: 1px solid #ebccd1; white-space: pre-wrap; font-family: monospace;">
            <h1>Application Failed to Start</h1>
            <p>${errorMessage}</p>
            <hr />
            <h2>Error Details:</h2>
            <pre>${errorDetails}</pre>
        </div>
    `;
});