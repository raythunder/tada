import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App } from '@tada/core';
import storageManager from '@tada/core/services/storageManager';
import { RemoteStorageService } from '../services/remoteStorageService';
import {
    clearToken,
    fetchBootstrap,
    getApiBaseUrl,
    getToken,
    login,
    me,
    register,
    setToken
} from './authClient';

const AuthGate: React.FC = () => {
    const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
    const [isReady, setIsReady] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allowRegistration, setAllowRegistration] = useState(false);
    const [hasUsers, setHasUsers] = useState(false);
    const [mode, setMode] = useState<'login' | 'register'>('login');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initializeStorage = useCallback(async (token: string) => {
        const service = new RemoteStorageService(apiBaseUrl, token);
        await service.preloadData();
        storageManager.register(service);
        setIsReady(true);
    }, [apiBaseUrl]);

    useEffect(() => {
        if (!apiBaseUrl) {
            setError('Missing VITE_TADA_API_URL. Please configure your API server URL.');
            setIsChecking(false);
            return;
        }

        const init = async () => {
            try {
                const bootstrap = await fetchBootstrap();
                setAllowRegistration(bootstrap.allowRegistration);
                setHasUsers(bootstrap.hasUsers);
                if (!bootstrap.hasUsers && bootstrap.allowRegistration) {
                    setMode('register');
                }

                const token = getToken();
                if (token) {
                    await me(token);
                    await initializeStorage(token);
                    setIsChecking(false);
                    return;
                }
            } catch (err: any) {
                console.error('Auth bootstrap failed:', err);
                clearToken();
                setError(err.message || 'Failed to connect to the API server.');
            }

            setIsChecking(false);
        };

        init();
    }, [apiBaseUrl, initializeStorage]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!apiBaseUrl) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const action = mode === 'login' ? login : register;
            const response = await action(email, password);
            setToken(response.token);
            await initializeStorage(response.token);
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isChecking) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-[#1D2530]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mb-4"></div>
                    <span className="text-gray-500">Connecting to Tada Server...</span>
                </div>
            </div>
        );
    }

    if (!isReady) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-[#1D2530]">
                <div className="w-full max-w-md bg-white/90 dark:bg-[#0f141a] shadow-xl rounded-2xl p-8 border border-gray-100 dark:border-[#1f2a37]">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Tada Server Login</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Connect to your self-hosted database.</p>

                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full rounded-lg border border-gray-200 dark:border-[#233040] bg-white dark:bg-[#0b0f14] px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1" htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full rounded-lg border border-gray-200 dark:border-[#233040] bg-white dark:bg-[#0b0f14] px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
                        >
                            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        {mode === 'register' && !hasUsers && (
                            <div>First registered user will be administrator.</div>
                        )}
                        {allowRegistration && (
                            <button
                                type="button"
                                className="mt-3 text-gray-700 dark:text-gray-300 underline"
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            >
                                {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return <App />;
};

export default AuthGate;
