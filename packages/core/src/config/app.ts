export interface ThemeColors {
    primary: string; // HSL string e.g., "3 76% 58%"
    light: string;   // HSL string e.g., "5 100% 89%"
    dark: string;    // HSL string e.g., "3 67% 47%"
}

export interface AppTheme {
    id: string;
    nameKey: string; // i18n key for the theme's display name
    colors: ThemeColors;
}

/**
 * Defines the available themes for the application.
 * Each theme provides HSL color values that are applied as CSS custom properties.
 */
export const APP_THEMES: AppTheme[] = [
    {
        id: 'default-coral',
        nameKey: 'theme.coralRed',
        colors: {
            primary: '3 76% 58%',
            light: '5 100% 89%',
            dark: '3 67% 47%',
        },
    },
    {
        id: 'ocean-blue',
        nameKey: 'theme.oceanBlue',
        colors: {
            primary: '207 82% 56%',
            light: '207 90% 88%',
            dark: '207 90% 40%',
        },
    },
    {
        id: 'forest-green',
        nameKey: 'theme.forestGreen',
        colors: {
            primary: '145 63% 40%',
            light: '145 63% 85%',
            dark: '145 63% 28%',
        },
    },
    {
        id: 'sunset-orange',
        nameKey: 'theme.sunsetOrange',
        colors: {
            primary: '24 94% 51%',
            light: '24 94% 88%',
            dark: '24 94% 35%',
        }
    },
    {
        id: 'royal-purple',
        nameKey: 'theme.royalPurple',
        colors: {
            primary: '262 68% 50%',
            light: '262 86% 88%',
            dark: '262 68% 36%',
        }
    },
    {
        id: 'graphite-grey',
        nameKey: 'theme.graphiteGrey',
        colors: {
            primary: '210 10% 40%',
            light: '210 10% 85%',
            dark: '210 10% 25%',
        }
    }
];

export const APP_VERSION = '2.1.0 - AI Settings Edition';

export const CHANGELOG_HTML = `
<div class="prose prose-sm dark:prose-invert max-w-none text-grey-dark dark:text-neutral-300 font-light leading-normal">
    <h4>Version 2.1.0 - AI Settings Edition (Current)</h4>
    <ul>
        <li>New Feature: Added AI provider settings. You can now configure different LLM providers (OpenAI, Claude, etc.) and custom endpoints.</li>
        <li>UI Change: Removed the background image customization feature from the Appearance settings to simplify the interface.</li>
    </ul>
    <h4>Version 2.0.0 - Offline Edition</h4>
    <ul>
        <li>Major Refactor: Application is now a fully standalone frontend app.</li>
        <li>Data Persistence: All tasks, lists, and settings are stored locally in your browser's localStorage.</li>
        <li>Removed all user authentication (login, register, accounts). The app is ready to use immediately.</li>
        <li>Removed all premium and payment-related features.</li>
        <li>Removed backend-dependent AI features (AI Task creation, AI Summary generation) to enable full offline functionality.</li>
    </ul>
</div>
`;

export const PRIVACY_POLICY_HTML = `
<div class="prose prose-sm dark:prose-invert max-w-none text-grey-dark dark:text-neutral-300 font-light leading-normal">
    <p><strong>Last Updated: ${new Date().toLocaleDateString()}</strong></p>
    <p>Your privacy is important to us. This Tada application is a standalone application that operates entirely on local storage within your browser. We do not collect, transmit, or store any of your personal task data on any external servers.</p>
    <h4>Information We Store (Locally)</h4>
    <ul>
        <li><strong>Task Data:</strong> All tasks, subtasks, notes, due dates, priorities, and tags you create are stored locally in your browser's localStorage.</li>
        <li><strong>Settings Data:</strong> Your application preferences, such as theme, dark mode, default settings, and AI provider configurations (including API keys), are also stored locally. API keys are not transmitted to any server other than the one you configure in the AI settings.</li>
    </ul>
    <h4>How We Use Your Information</h4>
    <p>Your data is used solely to provide the functionality of this application on your device. It is not used for tracking, advertising, or any other purpose.</p>
    <h4>Data Security</h4>
    <p>Since data is stored locally, its security depends on the security of your browser and device. We are not responsible for any data loss. It is your responsibility to manage backups if desired. Clearing your browser's site data will permanently delete all your tasks and settings.</p>
    <h4>Third-Party Services</h4>
    <p>This application may connect to third-party AI services based on your configuration in the AI settings. Your use of these services is subject to their respective privacy policies and terms of use.</p>
    <h4>Contact Us</h4>
    <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@tada-app.example.com" class="text-primary hover:underline">privacy@tada-app.example.com</a>.</p>
</div>
`;

export const TERMS_OF_USE_HTML = `
<div class="prose prose-sm dark:prose-invert max-w-none text-grey-dark dark:text-neutral-300 font-light leading-normal">
    <p><strong>Last Updated: ${new Date().toLocaleDateString()}</strong></p>
    <p>Welcome to Tada! By using this application, you agree to these Terms of Use.</p>
    <h4>1. Use of the Application</h4>
    <p>Tada is provided for personal task management. You are responsible for the data you input and manage within the application. The application is provided "as is" without warranties of any kind.</p>
    <h4>2. Local Data Storage</h4>
    <p>You acknowledge that all your task data and settings are stored locally in your browser. We are not responsible for any loss of data. It is your responsibility to manage backups if desired (e.g., by exporting data if such a feature is available, or by other means).</p>
    <h4>3. AI Features</h4>
    <p>The AI features require you to configure a third-party Large Language Model (LLM) provider and provide your own API key. Your use of these third-party services is governed by their terms and conditions. We are not responsible for the performance, availability, or policies of these third-party services.</p>
    <h4>4. Intellectual Property</h4>
    <p>The application design, UI, and underlying code are the property of the application developers. You may not copy, modify, or distribute the application without permission.</p>
    <h4>5. Prohibited Conduct</h4>
    <p>You agree not to use the application for any unlawful purpose.</p>
    <h4>6. Disclaimer of Warranties</h4>
    <p>The application is provided "as is" and "as available" without any warranties, express or implied. We do not warrant that the application will be error-free or uninterrupted.</p>
    <h4>7. Limitation of Liability</h4>
    <p>To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, resulting from your use of the application.</p>
    <h4>Contact Us</h4>
    <p>If you have any questions about these Terms, please contact us at <a href="mailto:terms@tada-app.example.com" class="text-primary hover:underline">terms@tada-app.example.com</a>.</p>
</div>
`;