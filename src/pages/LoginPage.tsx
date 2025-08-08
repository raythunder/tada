// src/pages/LoginPage.tsx
import React, {useCallback, useState} from 'react';
import {Link as RouterLink, useNavigate} from 'react-router-dom';
import {useSetAtom} from 'jotai';
import {currentUserAtom} from '@/store/atoms';
import * as apiService from '@/services/apiService';
import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import {twMerge} from 'tailwind-merge';
import {useTranslation} from "react-i18next";

type LoginMethod = 'password' | 'code';

const LoginPage: React.FC = () => {
    const {t} = useTranslation();
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');

    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const setCurrentUser = useSetAtom(currentUserAtom);
    const navigate = useNavigate();

    const handleSendCode = useCallback(async () => {
        if (!identifier.trim()) {
            setError("Please enter your email or phone number.");
            return;
        }
        setIsSendingCode(true);
        setError(null);
        setMessage(null);
        const response = await apiService.apiSendCode(identifier, 'login');
        setIsSendingCode(false);
        if (response.success) {
            setIsCodeSent(true);
            setMessage(response.message || "Verification code sent.");
        } else {
            setError(response.error || "Failed to send verification code.");
        }
    }, [identifier]);

    const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        let response: apiService.AuthResponse;

        if (loginMethod === 'password') {
            response = await apiService.apiLogin(identifier, password);
        } else {
            response = await apiService.apiLoginWithCode(identifier, verificationCode);
        }

        setIsLoading(false);
        if (response.success && response.user) {
            setCurrentUser(response.user);
            navigate('/all', {replace: true});
        } else {
            setError(response.error || 'Login failed. Please check your credentials.');
        }
    }, [identifier, password, verificationCode, loginMethod, setCurrentUser, navigate]);

    const inputBaseClasses = "w-full h-10 px-3 text-sm font-light rounded-base focus:outline-none bg-grey-ultra-light dark:bg-neutral-700 placeholder:text-grey-medium dark:placeholder:text-neutral-400 text-grey-dark dark:text-neutral-100 transition-colors duration-200 ease-in-out border border-grey-light dark:border-neutral-600 focus:border-primary dark:focus:border-primary-light focus:ring-1 focus:ring-primary dark:focus:ring-primary-light";
    const tabButtonClasses = (isActive: boolean) => twMerge(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-1",
        isActive ? "bg-primary/10 text-primary dark:bg-primary-dark/20 dark:text-primary-light" : "text-grey-medium hover:bg-grey-light/50 dark:text-neutral-400 dark:hover:bg-neutral-700"
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-grey-ultra-light dark:bg-grey-deep p-4">
            <div className="w-full max-w-sm p-6 sm:p-8 space-y-6 bg-white dark:bg-neutral-800 rounded-lg shadow-modal">
                <div className="text-center">
                    <Icon name="check-square" size={48} className="mx-auto text-primary dark:text-primary-light mb-3"/>
                    <h1 className="text-xl sm:text-2xl font-medium text-grey-dark dark:text-neutral-100">
                        {t('login.title')}
                    </h1>
                </div>

                <div className="flex justify-center space-x-1 border border-grey-light dark:border-neutral-700 rounded-lg p-1 bg-grey-ultra-light/50 dark:bg-neutral-750">
                    <button onClick={() => setLoginMethod('password')}
                            className={tabButtonClasses(loginMethod === 'password')}>{t('login.passwordLogin')}</button>
                    <button onClick={() => setLoginMethod('code')}
                            className={tabButtonClasses(loginMethod === 'code')}>{t('login.codeLogin')}</button>
                </div>

                {message && !error && (
                    <p className="text-xs text-success dark:text-green-400 text-center bg-success/10 p-2 rounded-base">{message}</p>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {loginMethod === 'password' && (
                        <>
                            <div>
                                <label htmlFor="identifier-pass" className="sr-only">Email, Phone, or Username</label>
                                <input id="identifier-pass" name="identifier" type="text" autoComplete="username" required
                                       value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                                       className={inputBaseClasses} placeholder={t('login.identifierPlaceholder')} disabled={isLoading}/>
                            </div>
                            <div>
                                <label htmlFor="password-email" className="sr-only">Password</label>
                                <input id="password-email" name="password" type="password" autoComplete="current-password"
                                       required value={password} onChange={(e) => setPassword(e.target.value)}
                                       className={inputBaseClasses} placeholder={t('login.passwordPlaceholder')} disabled={isLoading}/>
                            </div>
                        </>
                    )}

                    {loginMethod === 'code' && (
                        <>
                            <div>
                                <label htmlFor="identifier-code" className="sr-only">Email or Phone number</label>
                                <input id="identifier-code" name="identifier" type="text" required
                                       value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                                       className={inputBaseClasses} placeholder={t('register.identifierPlaceholder')}
                                       disabled={isLoading || isSendingCode || isCodeSent}/>
                            </div>
                            <div>
                                <label htmlFor="verificationCode" className="sr-only">Verification Code</label>
                                <div className="flex space-x-2">
                                    <input id="verificationCode" name="verificationCode" type="text" inputMode="numeric"
                                           autoComplete="one-time-code" required value={verificationCode}
                                           onChange={(e) => setVerificationCode(e.target.value)}
                                           className={twMerge(inputBaseClasses, "flex-grow")} placeholder={t('login.codePlaceholder')}
                                           disabled={isLoading || !isCodeSent}/>
                                    <Button type="button" variant="secondary" onClick={handleSendCode} loading={isSendingCode}
                                            disabled={isLoading || isSendingCode || !identifier.trim() || isCodeSent}
                                            className="!h-10 flex-shrink-0 !px-3 text-xs">
                                        {isCodeSent ? t('login.resendCode') : t('login.sendCode')}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (<p className="text-xs text-error dark:text-red-400 text-center bg-error/10 p-2 rounded-base">{error}</p>)}

                    <div className="flex items-center justify-end text-xs">
                        <RouterLink to="/forgot-password" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors">
                            {t('login.forgotPassword')}
                        </RouterLink>
                    </div>

                    <Button type="submit" variant="primary" fullWidth size="lg" loading={isLoading} disabled={isLoading} className="!h-10">
                        {t('login.signIn')}
                    </Button>
                </form>

                <p className="mt-8 text-center text-xs text-grey-medium dark:text-neutral-400">
                    {t('login.noAccount')}{' '}
                    <RouterLink to="/register" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors">
                        {t('login.signUp')}
                    </RouterLink>
                </p>
            </div>
        </div>
    );
};
LoginPage.displayName = 'LoginPage';
export default LoginPage;