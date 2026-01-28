import path from 'node:path';

const appEnv = process.env.NODE_ENV ?? 'development';

export const config = {
    env: appEnv,
    port: Number(process.env.TADA_SERVER_PORT ?? 8787),
    jwtSecret: process.env.TADA_JWT_SECRET ?? 'change-this-secret',
    dbPath: process.env.TADA_DB_PATH ?? path.resolve(process.cwd(), 'tada-server.db'),
    uploadDir: process.env.TADA_UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'),
    publicBaseUrl: process.env.TADA_PUBLIC_URL ?? '',
    allowRegistration: (process.env.TADA_ALLOW_REGISTRATION ?? 'true') === 'true',
    defaultAdminEmail: process.env.TADA_DEFAULT_ADMIN_EMAIL ?? '',
    defaultAdminPassword: process.env.TADA_DEFAULT_ADMIN_PASSWORD ?? ''
};
