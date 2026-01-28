const TOKEN_KEY = 'tada-auth-token';

export const getApiBaseUrl = (): string => {
    const raw = import.meta.env.VITE_TADA_API_URL ?? '';
    return raw.replace(/\/+$/, '');
};

export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};

const request = async <T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> => {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {})
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export const fetchBootstrap = () => {
    return request<{ hasUsers: boolean; allowRegistration: boolean }>('/bootstrap');
};

export const login = (email: string, password: string) => {
    return request<{ token: string; user: { id: string; email: string; role: string; createdAt?: number } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
};

export const register = (email: string, password: string) => {
    return request<{ token: string; user: { id: string; email: string; role: string; createdAt?: number } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
};

export const me = (token: string) => {
    return request<{ user: { id: string; email: string; role: string } }>('/auth/me', {
        method: 'GET'
    }, token);
};
