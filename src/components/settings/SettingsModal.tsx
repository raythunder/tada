// src/components/settings/SettingsModal.tsx
import React, {memo, useCallback, useMemo} from 'react';
import {useAtom} from 'jotai';
import {currentUserAtom, isSettingsOpenAtom, settingsSelectedTabAtom} from '@/store/atoms';
import {SettingsTab} from '@/types';
import Icon from '../common/Icon';
import Button from '../common/Button';
import {twMerge} from 'tailwind-merge';
import {IconName} from "@/components/common/IconMap";
import * as Dialog from '@radix-ui/react-dialog';

// --- Setting Sections Definition ---
interface SettingsItem {
    id: SettingsTab;
    label: string;
    icon: IconName;
}

const settingsSections: SettingsItem[] = [
    {id: 'account', label: 'Account', icon: 'user'},
    {id: 'appearance', label: 'Appearance', icon: 'settings'}, // Changed icon for variety
    {id: 'premium', label: 'Premium', icon: 'crown'},
    {id: 'notifications', label: 'Notifications', icon: 'bell'},
    {id: 'integrations', label: 'Integrations', icon: 'share'},
    {id: 'about', label: 'About', icon: 'info'},
];

// --- Reusable Settings Row Component ---
// No Radix changes needed here, it's just layout
const SettingsRow: React.FC<{
    label: string,
    value?: React.ReactNode,
    action?: React.ReactNode,
    children?: React.ReactNode,
    description?: string
}> =
    memo(({label, value, action, children, description}) => (
        <div className="flex justify-between items-center py-2.5 min-h-[44px] border-b border-black/5 last:border-b-0">
            <div className="flex-1 mr-4">
                <span className="text-sm text-gray-700 font-medium block">{label}</span>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <div className="text-sm text-gray-800 flex items-center space-x-2 flex-shrink-0">
                {value && !action && !children && <span className="text-muted-foreground text-right">{value}</span>}
                {action && !children && <div className="flex justify-end">{action}</div>}
                {children && <div className="flex justify-end space-x-2">{children}</div>}
            </div>
        </div>
    ));
SettingsRow.displayName = 'SettingsRow';

// --- Account Settings Panel ---
// No Radix changes needed here, it's content
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
                    className="w-16 h-16 rounded-full overflow-hidden shadow-medium flex-shrink-0 border-2 border-white backdrop-blur-sm bg-white/40">
                    {avatarSrc ? (
                        <img src={avatarSrc} alt={userName} className="w-full h-full object-cover"/>
                    ) : (
                        <div
                            className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-2xl font-medium">
                            {avatarInitial || <Icon name="user" size={24}/>}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">{userName}</h3>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                    {isPremium && (
                        <div
                            className="text-xs text-yellow-700 flex items-center mt-1.5 font-medium bg-yellow-400/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full w-fit shadow-inner border border-yellow-500/20">
                            <Icon name="crown" size={12} className="mr-1 text-yellow-600"/>
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
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Connected
                    Accounts</h4>
                <SettingsRow label="Google Account" value={currentUser?.email ? "Linked" : "Not Linked"}
                             action={currentUser?.email ?
                                 <Button variant="link" size="sm" className="text-muted-foreground hover:text-red-600"
                                         onClick={handleUnlink}>Unlink</Button> : undefined}/>
                <SettingsRow label="Apple ID"
                             action={<Button variant="link" size="sm" onClick={handleLinkApple}>Link Apple
                                 ID</Button>}/>
            </div>

            {/* Data Management */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Data
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
                <Button variant="glass" size="md" icon="logout" onClick={handleLogout} className="w-full sm:w-auto">
                    Logout
                </Button>
            </div>
        </div>
    );
});
AccountSettings.displayName = 'AccountSettings';


// --- Placeholder for other settings panels ---
// No Radix changes needed
const PlaceholderSettings: React.FC<{ title: string, icon?: IconName }> = memo(({title, icon = 'settings'}) => (
    <div className="p-6 text-center text-gray-400 h-full flex flex-col items-center justify-center">
        <Icon name={icon} size={44} className="mx-auto mb-4 text-gray-300 opacity-70"/>
        <p className="text-base font-medium text-gray-500">{title} Settings</p>
        <p className="text-xs mt-1.5 text-muted">Configuration options for {title.toLowerCase()} will appear here.</p>
    </div>
));
PlaceholderSettings.displayName = 'PlaceholderSettings';


// --- Main Settings Modal Component ---
const SettingsModal: React.FC = () => {
    const [isOpen, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
    const [selectedTab, setSelectedTab] = useAtom(settingsSelectedTabAtom);

    const handleOpenChange = useCallback((open: boolean) => {
        setIsSettingsOpen(open);
    }, [setIsSettingsOpen]);

    const handleTabClick = useCallback((id: SettingsTab) => setSelectedTab(id), [setSelectedTab]);

    // Memoize content rendering logic
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
                return <AccountSettings/>; // Fallback
        }
    }, [selectedTab]);

    // Memoize modal title
    const modalTitle = useMemo(() => settingsSections.find(s => s.id === selectedTab)?.label ?? 'Settings', [selectedTab]);

    // Use Radix Dialog
    return (
        <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className="fixed inset-0 bg-black/60 backdrop-blur-xl z-40 data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut"/>
                <Dialog.Content
                    className={twMerge(
                        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
                        "bg-glass-100 backdrop-blur-xl w-full max-w-3xl h-[75vh] max-h-[600px]",
                        "rounded-xl shadow-strong flex overflow-hidden border border-black/10",
                        "data-[state=open]:animate-contentShow",
                        "data-[state=closed]:animate-contentHide"
                    )}
                    aria-describedby={undefined}
                    onEscapeKeyDown={() => handleOpenChange(false)}
                >
                    {/* Settings Sidebar */}
                    <div
                        className="w-52 bg-glass-alt-100 backdrop-blur-xl border-r border-black/10 p-3 flex flex-col shrink-0">
                        <nav className="space-y-0.5 flex-1 mt-2">
                            {settingsSections.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabClick(item.id)}
                                    className={twMerge(
                                        'flex items-center w-full px-2 py-1 h-7 text-sm rounded-md transition-colors duration-30 ease-apple',
                                        selectedTab === item.id
                                            ? 'bg-primary/25 text-primary font-medium backdrop-blur-sm'
                                            : 'text-gray-600 hover:bg-black/15 hover:text-gray-800 hover:backdrop-blur-sm',
                                        'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-glass-alt-100'
                                    )}
                                    aria-current={selectedTab === item.id ? 'page' : undefined}
                                >
                                    <Icon name={item.icon} size={15} className="mr-2 opacity-70" aria-hidden="true"/>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Settings Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-glass backdrop-blur-lg relative">
                        {/* Content Header */}
                        <div
                            className="flex items-center justify-between px-5 py-3 border-b border-black/10 flex-shrink-0 h-[53px] bg-glass-alt-200 backdrop-blur-lg">
                            <Dialog.Title className="text-lg font-semibold text-gray-800">
                                {modalTitle}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <Button variant="ghost" size="icon" icon="x"
                                        className="text-muted-foreground hover:bg-black/15 w-7 h-7 -mr-2"
                                        aria-label="Close settings"/>
                            </Dialog.Close>
                        </div>
                        {/* Scrollable Content Panel */}
                        <div className="flex-1 p-5 overflow-y-auto styled-scrollbar">
                            {renderContent}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
SettingsModal.displayName = 'SettingsModal';
export default SettingsModal;