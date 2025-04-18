// src/components/settings/SettingsModal.tsx
import React, { useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom, isSettingsOpenAtom, settingsSelectedTabAtom } from '@/store/atoms';
import { SettingsTab } from '@/types'; // Added User import
import Icon from '../common/Icon';
import Button from '../common/Button';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { IconName } from "@/components/common/IconMap.tsx";

// Define Setting Sections and Items Interface
interface SettingsItem {
    id: SettingsTab;
    label: string;
    icon: IconName;
}

const settingsSections: SettingsItem[] = [
    { id: 'account', label: 'Account', icon: 'user' },
    { id: 'appearance', label: 'Appearance', icon: 'settings' },
    { id: 'premium', label: 'Premium', icon: 'crown' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'integrations', label: 'Integrations', icon: 'share' },
    { id: 'about', label: 'About', icon: 'info' },
];

// --- Placeholder Content Components ---

// Helper component for rows in settings pages
const SettingsRow: React.FC<{label: string, value?: React.ReactNode, action?: React.ReactNode, children?: React.ReactNode, description?: string}> =
    React.memo(({label, value, action, children, description}) => (
        <div className="flex justify-between items-center py-2.5 min-h-[40px] border-b border-black/5 last:border-b-0">
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


// Specific Account Settings Content
const AccountSettings: React.FC = () => {
    const [currentUser] = useAtom(currentUserAtom);
    // Placeholder actions
    const handleEdit = useCallback(() => console.log("Edit action"), []);
    const handleChangePassword = useCallback(() => console.log("Change password action"), []);
    const handleUnlink = useCallback(() => console.log("Unlink action"), []);
    const handleLinkApple = useCallback(() => console.log("Link Apple ID action"), []);
    const handleBackup = useCallback(() => console.log("Backup action"), []);
    const handleImport = useCallback(() => console.log("Import action"), []);
    const handleDeleteAccount = useCallback(() => console.log("Delete account action"), []);
    const handleLogout = useCallback(() => { console.log("Logout action"); /* Add actual logout logic here */ }, []);

    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
        >
            {/* User Profile Header */}
            <div className="flex items-center space-x-4 mb-4">
                <motion.div
                    className="w-16 h-16 rounded-full overflow-hidden shadow-medium flex-shrink-0 border-2 border-white backdrop-blur-sm bg-white/30" // Added subtle glass bg
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                >
                    {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name ?? 'User Avatar'} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-2xl font-medium">
                            {currentUser?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                    )}
                </motion.div>
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">{currentUser?.name ?? 'Guest User'}</h3>
                    <p className="text-sm text-muted-foreground">{currentUser?.email ?? 'No email'}</p>
                    {currentUser?.isPremium && (
                        <div className="text-xs text-yellow-700 flex items-center mt-1.5 font-medium bg-yellow-400/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full w-fit"> {/* Glassy premium badge */}
                            <Icon name="crown" size={12} className="mr-1 text-yellow-600" />
                            <span>Premium Member</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Settings */}
            <div className="space-y-0">
                <SettingsRow label="Name" value={currentUser?.name ?? '-'} action={<Button variant="link" size="sm" onClick={handleEdit}>Edit</Button>} />
                <SettingsRow label="Email Address" value={currentUser?.email ?? '-'} description="Used for login and notifications."/>
                <SettingsRow label="Password" action={<Button variant="link" size="sm" onClick={handleChangePassword}>Change Password</Button>} />
            </div>

            {/* Connected Accounts */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Connected Accounts</h4>
                <SettingsRow label="Google Account" value="Linked" action={<Button variant="link" size="sm" className="text-muted-foreground hover:text-red-600" onClick={handleUnlink}>Unlink</Button>} />
                <SettingsRow label="Apple ID" action={<Button variant="link" size="sm" onClick={handleLinkApple}>Link Apple ID</Button>} />
            </div>

            {/* Data Management */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Data Management</h4>
                <SettingsRow label="Backup & Restore" description="Save or load your task data.">
                    <Button variant="glass" size="sm" icon="download" onClick={handleBackup}>Backup</Button>
                    <Button variant="glass" size="sm" icon="upload" onClick={handleImport}>Import</Button>
                </SettingsRow>
                <SettingsRow label="Delete Account" description="Permanently delete your account and data." action={
                    <Button variant="danger" size="sm" onClick={handleDeleteAccount}>Request Deletion</Button>
                } />
            </div>

            {/* Logout Action */}
            <div className="mt-6">
                <Button variant="glass" size="md" icon="logout" onClick={handleLogout} className="w-full sm:w-auto"> {/* Use glass button */}
                    Logout
                </Button>
            </div>
        </motion.div>
    );
};

// Generic Placeholder for other sections
const PlaceholderSettings: React.FC<{ title: string, icon?: IconName }> = ({ title, icon = 'settings' }) => (
    <motion.div
        className="p-6 text-center text-gray-400 h-full flex flex-col items-center justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
    >
        <Icon name={icon} size={44} className="mx-auto mb-4 text-gray-300 opacity-70" />
        <p className="text-base font-medium text-gray-500">{title} Settings</p>
        <p className="text-xs mt-1.5 text-muted">Configuration options for {title.toLowerCase()} will appear here.</p>
    </motion.div>
);


// Main Settings Modal Component
const SettingsModal: React.FC = () => {
    const [, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
    const [selectedTab, setSelectedTab] = useAtom(settingsSelectedTabAtom);

    const handleClose = useCallback(() => setIsSettingsOpen(false), [setIsSettingsOpen]);

    const renderContent = useMemo(() => {
        switch (selectedTab) {
            case 'account': return <AccountSettings />;
            case 'appearance': return <PlaceholderSettings title="Appearance" icon="settings" />;
            case 'premium': return <PlaceholderSettings title="Premium" icon="crown" />;
            case 'notifications': return <PlaceholderSettings title="Notifications" icon="bell" />;
            case 'integrations': return <PlaceholderSettings title="Integrations" icon="share" />;
            case 'about': return <PlaceholderSettings title="About" icon="info" />;
            default:
                console.warn("Unknown settings tab:", selectedTab);
                return <AccountSettings />; // Fallback
        }
    }, [selectedTab]); // Only re-render when tab changes

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40 flex items-center justify-center p-4" // Stronger backdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={handleClose}
            aria-modal="true"
            role="dialog"
            aria-labelledby="settingsModalTitle"
        >
            {/* Modal Content - Apply STRONG glass effect */}
            <motion.div
                className={twMerge(
                    "bg-glass-100 backdrop-blur-xl w-full max-w-3xl h-[75vh] max-h-[600px]", // Strongest glass bg and blur
                    "rounded-lg shadow-strong flex overflow-hidden border border-black/10"
                )}
                initial={{ scale: 0.95, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 5, opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
                {/* Settings Sidebar - Apply STRONG glass effect */}
                <div className="w-52 bg-glass-alt-100 backdrop-blur-xl border-r border-black/10 p-3 flex flex-col shrink-0"> {/* Stronger alt glass */}
                    <nav className="space-y-0.5 flex-1 mt-2">
                        {settingsSections.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedTab(item.id)}
                                className={twMerge(
                                    'flex items-center w-full px-2 py-1 h-7 text-sm rounded-md transition-colors duration-100 ease-apple',
                                    selectedTab === item.id
                                        ? 'bg-primary/20 text-primary font-medium backdrop-blur-xs' // Active glass
                                        : 'text-gray-600 hover:bg-black/15 hover:text-gray-800 hover:backdrop-blur-xs' // Hover glass
                                )}
                                aria-current={selectedTab === item.id ? 'page' : undefined}
                            >
                                <Icon name={item.icon} size={15} className="mr-2 opacity-70" aria-hidden="true"/>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area - Use subtle glass */}
                <div className="flex-1 flex flex-col overflow-hidden bg-glass backdrop-blur-lg relative"> {/* Primary content glass */}
                    {/* Header within content area - Subtle tint */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 flex-shrink-0 h-[53px] bg-glass-alt-200 backdrop-blur-md"> {/* Header glass */}
                        <h2 id="settingsModalTitle" className="text-lg font-semibold text-gray-800">
                            {settingsSections.find(s => s.id === selectedTab)?.label ?? 'Settings'}
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            icon="x" // Use icon prop
                            onClick={handleClose}
                            className="text-muted-foreground hover:bg-black/10 w-7 h-7 -mr-2"
                            aria-label="Close settings"
                        />
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 p-5 overflow-y-auto styled-scrollbar">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedTab} // Key change triggers animation
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                            >
                                {renderContent}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SettingsModal;