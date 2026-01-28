import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button.tsx';
import { isTauri } from '@/utils/networkUtils';
import { useTranslation } from 'react-i18next';

const TOKEN_KEY = 'tada-auth-token';

const getApiBaseUrl = (): string => {
    const raw = (import.meta as any).env?.VITE_TADA_API_URL ?? '';
    return raw.replace(/\/+$/, '');
};

const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
};

const AccountSettings: React.FC = memo(() => {
    const { t } = useTranslation();
    const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
    const [token, setToken] = useState<string | null>(() => getStoredToken());
    const [user, setUser] = useState<{ id: string; email: string; role: string; createdAt?: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const request = useCallback(async <T,>(path: string, options: RequestInit = {}, authToken?: string | null): Promise<T> => {
        const response = await fetch(`${apiBaseUrl}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                ...(options.headers ?? {})
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Request failed with status ${response.status}`);
        }

        return response.json() as Promise<T>;
    }, [apiBaseUrl]);

    useEffect(() => {
        if (!apiBaseUrl || !token) {
            setIsLoading(false);
            return;
        }

        const loadUser = async () => {
            try {
                const response = await request<{ user: { id: string; email: string; role: string; createdAt?: number } }>('/auth/me', { method: 'GET' }, token);
                setUser(response.user);
                setEmail(response.user.email);
            } catch (err: any) {
                setError(err.message || t('settings.account.error'));
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, [apiBaseUrl, token, request, t]);

    const handleLogout = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
        }
        setToken(null);
        setUser(null);
        window.location.reload();
    }, []);

    const handleSave = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token) {
            setError(t('settings.account.missingAuth'));
            return;
        }
        if (!currentPassword) {
            setError(t('settings.account.currentPasswordRequired'));
            return;
        }
        if (newPassword && newPassword !== confirmPassword) {
            setError(t('settings.account.passwordMismatch'));
            return;
        }

        const emailChanged = !!email && email !== (user?.email ?? '');
        if (!emailChanged && !newPassword) {
            setError(t('settings.account.noChanges'));
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const payload: { email?: string; currentPassword: string; newPassword?: string } = {
                currentPassword
            };
            if (emailChanged) payload.email = email;
            if (newPassword) payload.newPassword = newPassword;

            const response = await request<{ token: string; user: { id: string; email: string; role: string; createdAt?: number } }>('/auth/account', {
                method: 'PUT',
                body: JSON.stringify(payload)
            }, token);

            if (typeof window !== 'undefined') {
                localStorage.setItem(TOKEN_KEY, response.token);
            }
            setToken(response.token);
            setUser(response.user);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess(t('settings.account.updated'));
        } catch (err: any) {
            setError(err.message || t('settings.account.error'));
        } finally {
            setIsSaving(false);
        }
    }, [token, currentPassword, newPassword, confirmPassword, email, user?.email, request, t]);

    if (isTauri()) {
        return (
            <div className="p-4 rounded-base bg-grey-ultra-light/80 dark:bg-neutral-700/40 border border-grey-light/60 dark:border-neutral-600/60 text-[13px] text-grey-dark dark:text-neutral-200">
                <div className="font-medium mb-1">{t('settings.account.unavailable.title')}</div>
                <div className="text-[12px] text-grey-medium dark:text-neutral-400">{t('settings.account.unavailable.description')}</div>
            </div>
        );
    }

    if (!apiBaseUrl) {
        return <div className="p-4 text-center text-grey-medium">{t('settings.account.missingApi')}</div>;
    }

    if (isLoading) {
        return <div className="p-4 text-center text-grey-medium">{t('settings.account.loading')}</div>;
    }

    if (!token) {
        return (
            <div className="p-4 rounded-base bg-grey-ultra-light/80 dark:bg-neutral-700/40 border border-grey-light/60 dark:border-neutral-600/60 text-[13px] text-grey-dark dark:text-neutral-200">
                {t('settings.account.missingAuth')}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-base bg-grey-ultra-light/80 dark:bg-neutral-700/40 border border-grey-light/60 dark:border-neutral-600/60 px-4 py-3">
                <div className="text-[12px] text-grey-medium dark:text-neutral-400">{t('settings.account.signedInAs')}</div>
                <div className="text-[14px] text-grey-dark dark:text-neutral-100 font-medium">{user?.email ?? '-'}</div>
                <div className="text-[12px] text-grey-medium dark:text-neutral-400 mt-2">{t('settings.account.role')}</div>
                <div className="text-[12px] text-grey-dark dark:text-neutral-100">{user?.role ?? '-'}</div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                {error && (
                    <div className="rounded-base bg-red-50 text-red-700 px-4 py-3 text-xs border border-red-100">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="rounded-base bg-emerald-50 text-emerald-700 px-4 py-3 text-xs border border-emerald-100">
                        {success}
                    </div>
                )}

                <div>
                    <label className="block text-[12px] text-grey-medium dark:text-neutral-300 mb-1" htmlFor="account-email">{t('settings.account.email')}</label>
                    <input
                        id="account-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-base border border-grey-light dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-[13px] text-grey-dark dark:text-neutral-100"
                    />
                </div>

                <div>
                    <label className="block text-[12px] text-grey-medium dark:text-neutral-300 mb-1" htmlFor="account-current-password">{t('settings.account.currentPassword')}</label>
                    <input
                        id="account-current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-base border border-grey-light dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-[13px] text-grey-dark dark:text-neutral-100"
                        required
                    />
                </div>

                <div>
                    <label className="block text-[12px] text-grey-medium dark:text-neutral-300 mb-1" htmlFor="account-new-password">{t('settings.account.newPassword')}</label>
                    <input
                        id="account-new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-base border border-grey-light dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-[13px] text-grey-dark dark:text-neutral-100"
                    />
                </div>

                <div>
                    <label className="block text-[12px] text-grey-medium dark:text-neutral-300 mb-1" htmlFor="account-confirm-password">{t('settings.account.confirmPassword')}</label>
                    <input
                        id="account-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-base border border-grey-light dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-[13px] text-grey-dark dark:text-neutral-100"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleLogout}>
                        {t('settings.account.signOut')}
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? t('settings.account.saving') : t('settings.account.save')}
                    </Button>
                </div>
            </form>
        </div>
    );
});

AccountSettings.displayName = 'AccountSettings';
export default AccountSettings;
