import crypto from 'node:crypto';

export const nowMs = () => Date.now();

export const toId = (prefix: string) => {
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}-${Date.now()}-${random}`;
};

export const safeJsonStringify = (value: unknown) => JSON.stringify(value ?? null);

export const safeJsonParse = <T>(value: string | null, fallback: T): T => {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
};
