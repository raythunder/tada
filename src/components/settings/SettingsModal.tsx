// src/components/settings/SettingsModal.tsx
import React, {memo, useCallback, useMemo} from 'react';
import {useAtom} from 'jotai';
import {currentUserAtom, isSettingsOpenAtom, settingsSelectedTabAtom} from '@/store/atoms';
import {SettingsTab} from '@/types';
import Icon from '../common/Icon';
import Button from '../common/Button';
import {twMerge} from 'tailwind-merge';
import {IconName} from "@/components/common/IconMap";
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TabsPrimitive from '@radix-ui/react-tabs';

// --- Setting Sections Definition --- (Keep as is)
interface SettingsItem {
    id: SettingsTab;
    label: string;
    icon: IconName;
}

const settingsSections: SettingsItem[] = [
    {id: 'account', label: 'Account', icon: 'user'},
    {id: 'appearance', label: 'Appearance', icon: 'settings'},
    {id: 'premium', label: 'Premium', icon: 'crown'},
    {id: 'notifications', label: 'Notifications', icon: 'bell'},
    {id: 'integrations', label: 'Integrations', icon: 'share'},
    {id: 'about', label: 'About', icon: 'info'},
];

// --- Reusable Settings Row Component --- (Keep as is, style refined)
const SettingsRow: React.FC<{
    label: string,
    value?: React.ReactNode,
    action?: React.ReactNode,
    children?: React.ReactNode,
    description?: string
}> =
    memo(({label, value, action, children, description}) => (
        <div
            className="flex justify-between items-center py-2.5 min-h-[44px] border-b border-black/5 dark:border-white/5 last:border-b-0">
            {/* Left Side: Label & Description */}
            <div className="flex-1 mr-4">
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium block">{label}</span>
                {description &&
                    <p className="text-xs text-muted-foreground dark:text-neutral-400 mt-0.5">{description}</p>}
            </div>
            {/* Right Side: Value or Action(s) */}
            <div className="text-sm text-gray-800 dark:text-gray-100 flex items-center space-x-2 flex-shrink-0">
                {value && !action && !children &&
                    <span className="text-muted-foreground dark:text-neutral-400 text-right">{value}</span>}
                {action && !children && <div className="flex justify-end">{action}</div>}
                {children && <div className="flex justify-end space-x-2">{children}</div>}
            </div>
        </div>
    ));
SettingsRow.displayName = 'SettingsRow';

// --- Account Settings Panel --- (Keep as is, styles adjusted internally via SettingsRow/Button)
const AccountSettings: React.FC = memo(() => {
    const [currentUser] = useAtom(currentUserAtom);
    const handleEdit = useCallback(() => console.log("Edit action triggered"), []);
    const handleChangePassword = useCallback(() => console.log("Change password action triggered"), []);
    const handleUnlink = useCallback(() => console.log("Unlink Google action triggered"), []);
    const handleLinkApple = useCallback(() => console.log("Link Apple ID action triggered"), []);
    const handleBackup = useCallback(() => console.log("Backup action triggered"), []);
    const handleImport = useCallback(() => console.log("Import action triggered"), []);
    const handleDeleteAccount = useCallback(() => console.log("Delete account action triggered"), []);
    const handleLogout = useCallback(() => {
        console.log("Logout action triggered"); /* Add actual logout logic here */
    }, []);

    const userName = useMemo(() => currentUser?.name ?? 'Guest User', [currentUser?.name]);
    const userEmail = useMemo(() => currentUser?.email ?? 'No email provided', [currentUser?.email]);
    const isPremium = useMemo(() => currentUser?.isPremium ?? false, [currentUser?.isPremium]);
    const avatarSrc = useMemo(() => currentUser?.avatar, [currentUser?.avatar]);
    const avatarInitial = useMemo(() => currentUser?.name?.charAt(0).toUpperCase(), [currentUser?.name]);

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4 mb-4">
                <div
                    className="w-16 h-16 rounded-full overflow-hidden shadow-md flex-shrink-0 border-2 border-white dark:border-neutral-700 bg-neutral-200/50 dark:bg-neutral-600/50 backdrop-blur-sm">
                    {avatarSrc ? (
                        <img src={avatarSrc} alt={userName} className="w-full h-full object-cover"/>
                    ) : (
                        <div
                            className="w-full h-full bg-gradient-to-br from-neutral-400 to-neutral-500 dark:from-neutral-500 dark:to-neutral-600 flex items-center justify-center text-white text-2xl font-medium">
                            {avatarInitial || <Icon name="user" size={24}/>}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{userName}</h3>
                    <p className="text-sm text-muted-foreground dark:text-neutral-400">{userEmail}</p>
                    {isPremium && (
                        <div
                            className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center mt-1.5 font-medium bg-yellow-400/30 dark:bg-yellow-600/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full w-fit shadow-inner border border-yellow-500/20 dark:border-yellow-400/20">
                            <Icon name="crown" size={12} className="mr-1 text-yellow-600 dark:text-yellow-400"/>
                            <span>Premium Member</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Account Details */}
            <div className="space-y-0">
                <SettingsRow label="Name" value={userName}
                             action={<Button variant="link" size="sm" onClick={handleEdit}>Edit</Button>}/>
                <SettingsRow label="Email Address" value={userEmail} description="Used for login and notifications."/>
                <SettingsRow label="Password" action={<Button variant="link" size="sm" onClick={handleChangePassword}>Change
                    Password</Button>}/>
            </div>

            {/* Connected Accounts */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground dark:text-neutral-500 uppercase tracking-wider mb-2 mt-4">Connected
                    Accounts</h4>
                <SettingsRow label="Google Account" value={currentUser?.email ? "Linked" : "Not Linked"}
                             action={currentUser?.email ? <Button variant="link" size="sm"
                                                                  className="text-muted-foreground hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-500"
                                                                  onClick={handleUnlink}>Unlink</Button> : undefined}/>
                <SettingsRow label="Apple ID"
                             action={<Button variant="link" size="sm" onClick={handleLinkApple}>Link Apple
                                 ID</Button>}/>
            </div>

            {/* Data Management */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground dark:text-neutral-500 uppercase tracking-wider mb-2 mt-4">Data
                    Management</h4>
                <SettingsRow label="Backup & Restore" description="Save or load your task data.">
                    <Button variant="glass" size="sm" icon="download" onClick={handleBackup}>Backup</Button>
                    <Button variant="glass" size="sm" icon="upload" onClick={handleImport}>Import</Button>
                </SettingsRow>
                <SettingsRow label="Delete Account" description="Permanently delete your account and data." action={
                    <Button variant="danger" size="sm" onClick={handleDeleteAccount}>Request Deletion</Button>
                }/>
            </div>

            {/* Logout Button */}
            <div className="mt-6">
                <Button variant="secondary" size="md" icon="logout" onClick={handleLogout} className="w-full sm:w-auto">
                    Logout
                </Button>
            </div>
        </div>
    );
});
AccountSettings.displayName = 'AccountSettings';

// --- Placeholder for other settings panels --- (Keep as is, style refined)
const PlaceholderSettings: React.FC<{ title: string, icon?: IconName }> = memo(({title, icon = 'settings'}) => (
    <div
        className="p-6 text-center text-gray-400 dark:text-neutral-500 h-full flex flex-col items-center justify-center">
        <Icon name={icon} size={44} className="mx-auto mb-4 text-gray-300 dark:text-neutral-600 opacity-70"/>
        <p className="text-base font-medium text-gray-500 dark:text-neutral-400">{title} Settings</p>
        <p className="text-xs mt-1.5 text-muted-foreground dark:text-neutral-500">Configuration options
            for {title.toLowerCase()} will appear here.</p>
    </div>
));
PlaceholderSettings.displayName = 'PlaceholderSettings';


// --- Main Settings Modal Component (Using Radix Dialog and Tabs) ---
const SettingsModal: React.FC = () => {
    const [isOpen, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
    const [selectedTab, setSelectedTab] = useAtom(settingsSelectedTabAtom);

    // Callback to sync Radix Tabs state with Jotai atom
    const handleTabValueChange = useCallback((value: string) => {
        setSelectedTab(value as SettingsTab);
    }, [setSelectedTab]);

    // Memoize content rendering logic (remains the same)
    const renderContent = useMemo(() => {
        switch (selectedTab) {
            case 'account':
                return <AccountSettings/>;
            case 'appearance':
                return <PlaceholderSettings title="Appearance" icon="settings"/>;
            case 'premium':
                return <PlaceholderSettings title="Premium" icon="crown"/>;
            case 'notifications':
                return <PlaceholderSettings title="Notifications" icon="bell"/>;
            case 'integrations':
                return <PlaceholderSettings title="Integrations" icon="share"/>;
            case 'about':
                return <PlaceholderSettings title="About" icon="info"/>;
            default:
                return <AccountSettings/>;
        }
    }, [selectedTab]);

    const modalTitle = useMemo(() => settingsSections.find(s => s.id === selectedTab)?.label ?? 'Settings', [selectedTab]);

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={setIsSettingsOpen}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-40 bg-black/65 dark:bg-black/75 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"/>
                {/* Content */}
                <DialogPrimitive.Content
                    className={twMerge(
                        // Base positioning and sizing
                        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 p-0 duration-200",
                        // Appearance
                        "border border-black/10 dark:border-neutral-700/50 bg-glass-100 dark:bg-neutral-800/90 backdrop-blur-2xl rounded-xl shadow-strong",
                        // Layout
                        "h-[75vh] max-h-[650px] flex overflow-hidden", // Flex layout for sidebar/content
                        // Radix Animations
                        "data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out"
                    )}
                    // Prevent closing on inner click automatically
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={() => setIsSettingsOpen(false)} // Close on escape
                >
                    {/* Radix Tabs for Settings Sections */}
                    <TabsPrimitive.Root
                        value={selectedTab}
                        onValueChange={handleTabValueChange}
                        orientation="vertical"
                        className="flex h-full w-full" // Let Tabs control the layout
                    >
                        {/* Settings Sidebar (Tabs List) */}
                        <TabsPrimitive.List
                            className="w-52 bg-glass-alt-100 dark:bg-neutral-800/70 backdrop-blur-xl border-r border-black/10 dark:border-neutral-700/50 p-3 flex flex-col shrink-0"
                            aria-label="Settings categories"
                        >
                            <nav className="space-y-0.5 flex-1 mt-2">
                                {settingsSections.map((item) => (
                                    // Radix Tabs Trigger
                                    <TabsPrimitive.Trigger
                                        key={item.id}
                                        value={item.id}
                                        className={twMerge(
                                            // Base styling
                                            'flex items-center w-full px-2 py-1 h-7 text-sm rounded-md transition-colors duration-150 ease-apple group',
                                            // State styling using Radix data attributes
                                            'data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:backdrop-blur-sm',
                                            'data-[state=inactive]:text-gray-600 data-[state=inactive]:dark:text-neutral-400',
                                            'data-[state=inactive]:hover:bg-black/10 data-[state=inactive]:dark:hover:bg-white/10 data-[state=inactive]:hover:text-gray-800 data-[state=inactive]:dark:hover:text-neutral-100 data-[state=inactive]:hover:backdrop-blur-sm',
                                            // Focus styling
                                            'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-glass-alt-100 dark:focus-visible:ring-offset-neutral-800'
                                        )}
                                    >
                                        <Icon name={item.icon} size={15} className="mr-2 opacity-70 flex-shrink-0"
                                              aria-hidden="true"/>
                                        <span className="truncate">{item.label}</span>
                                    </TabsPrimitive.Trigger>
                                ))}
                            </nav>
                        </TabsPrimitive.List>

                        {/* Settings Content Area */}
                        <div
                            className="flex-1 flex flex-col overflow-hidden bg-white/30 dark:bg-neutral-900/30 backdrop-blur-lg relative">
                            {/* Content Header */}
                            <div
                                className="flex items-center justify-between px-5 py-3 border-b border-black/10 dark:border-neutral-700/50 flex-shrink-0 h-[53px] bg-neutral-100/50 dark:bg-neutral-800/50 backdrop-blur-lg">
                                <DialogPrimitive.Title
                                    className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                    {modalTitle}
                                </DialogPrimitive.Title>
                                {/* Close Button using Radix Dialog Close */}
                                <DialogPrimitive.Close asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        icon="x"
                                        className="text-muted-foreground dark:text-neutral-400 hover:bg-black/15 dark:hover:bg-white/10 w-7 h-7 -mr-2"
                                        aria-label="Close settings"
                                    />
                                </DialogPrimitive.Close>
                            </div>

                            {/* Scrollable Content Panel (Tabs Content) */}
                            {/* We only need one TabsContent wrapper, which will hold the dynamically rendered panel */}
                            <TabsPrimitive.Content
                                value={selectedTab} // This ensures only the active tab's content is technically "rendered" by Radix
                                className="flex-1 p-5 overflow-y-auto styled-scrollbar focus:outline-none"
                                // Force re-mount on tab change if necessary for state resets, though usually not needed
                                // key={selectedTab}
                            >
                                {renderContent}
                            </TabsPrimitive.Content>
                            {/* Render other TabsContent placeholders if needed, but usually one is enough */}
                            {/* settingsSections.filter(s => s.id !== selectedTab).map(item => (
                                <TabsPrimitive.Content key={item.id} value={item.id} className="hidden"></TabsPrimitive.Content>
                             )) */}
                        </div>
                    </TabsPrimitive.Root>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
SettingsModal.displayName = 'SettingsModal';
export default SettingsModal;