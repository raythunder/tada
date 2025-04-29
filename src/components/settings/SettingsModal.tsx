// src/components/settings/SettingsModal.tsx
import React, { useCallback, useMemo, memo } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom, isSettingsOpenAtom, settingsSelectedTabAtom } from '@/store/atoms';
import { SettingsTab } from '@/types';
import { cn } from '@/lib/utils';
import Icon from '../common/Icon';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconName } from "@/components/common/IconMap";
import { Separator } from "@/components/ui/separator";

// Settings Sections Definition (remains the same)
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

// Settings Row Helper (Replaced with direct layout in AccountSettings)

// Account Settings Panel (Refactored)
const AccountSettings: React.FC = memo(() => {
    const [currentUser] = useAtom(currentUserAtom);

    // Placeholder actions
    const handleEdit = useCallback(() => console.log("Edit action triggered"), []);
    const handleChangePassword = useCallback(() => console.log("Change password action triggered"), []);
    const handleUnlink = useCallback(() => console.log("Unlink Google action triggered"), []);
    const handleLinkApple = useCallback(() => console.log("Link Apple ID action triggered"), []);
    const handleBackup = useCallback(() => console.log("Backup action triggered"), []);
    const handleImport = useCallback(() => console.log("Import action triggered"), []);
    const handleDeleteAccount = useCallback(() => console.log("Delete account action triggered"), []);
    const handleLogout = useCallback(() => { console.log("Logout action triggered"); /* Add actual logout logic here */ }, []);

    const userName = useMemo(() => currentUser?.name ?? 'Guest User', [currentUser?.name]);
    const userEmail = useMemo(() => currentUser?.email ?? 'No email provided', [currentUser?.email]);
    const isPremium = useMemo(() => currentUser?.isPremium ?? false, [currentUser?.isPremium]);
    const avatarSrc = useMemo(() => currentUser?.avatar, [currentUser?.avatar]);
    const avatarInitial = useMemo(() => currentUser?.name?.charAt(0).toUpperCase(), [currentUser?.name]);

    // Helper for rendering rows
    const renderSettingRow = (label: string, value?: React.ReactNode, action?: React.ReactNode, description?: string) => (
        <div className="flex justify-between items-center py-2.5 min-h-[44px] border-b border-border/50 last:border-b-0">
            <div className="flex-1 mr-4">
                <span className="text-sm text-foreground font-medium block">{label}</span>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <div className="text-sm text-foreground flex items-center space-x-2 flex-shrink-0">
                {value && !action && <span className="text-muted-foreground text-right">{value}</span>}
                {action && <div className="flex justify-end">{action}</div>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4 mb-4">
                <Avatar className="w-16 h-16 border-2 border-background shadow-md">
                    <AvatarImage src={avatarSrc} alt={userName} />
                    <AvatarFallback className="bg-muted text-xl">
                        {avatarInitial || <Icon name="user" size={24} />}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="text-xl font-semibold text-foreground">{userName}</h3>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                    {isPremium && (
                        <div className="mt-1.5 inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-400/15 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-300 backdrop-blur-sm shadow-inner">
                            <Icon name="crown" size={12} className="mr-1 text-yellow-600 dark:text-yellow-400" />
                            Premium Member
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            {/* Account Details */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-3">Profile</h4>
                {renderSettingRow("Name", userName, <Button variant="link" size="sm" onClick={handleEdit}>Edit</Button>)}
                {renderSettingRow("Email Address", userEmail, undefined, "Used for login and notifications.")}
                {renderSettingRow("Password", undefined, <Button variant="link" size="sm" onClick={handleChangePassword}>Change Password</Button>)}
            </div>

            <Separator />

            {/* Connected Accounts */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-3">Connected Accounts</h4>
                {renderSettingRow("Google Account", currentUser?.email ? "Linked" : "Not Linked", currentUser?.email ? <Button variant="link" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleUnlink}>Unlink</Button> : undefined)}
                {renderSettingRow("Apple ID", undefined, <Button variant="link" size="sm" onClick={handleLinkApple}>Link Apple ID</Button>)}
            </div>

            <Separator />

            {/* Data Management */}
            <div className="space-y-0">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-3">Data Management</h4>
                <div className="flex justify-between items-center py-2.5 min-h-[44px] border-b border-border/50">
                    <div className="flex-1 mr-4">
                        <span className="text-sm text-foreground font-medium block">Backup & Restore</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Save or load your task data.</p>
                    </div>
                    <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={handleBackup}>
                            <Icon name="download" size={14} className="mr-1.5"/> Backup
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleImport}>
                            <Icon name="upload" size={14} className="mr-1.5"/> Import
                        </Button>
                    </div>
                </div>
                {renderSettingRow("Delete Account", undefined, <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Request Deletion</Button>, "Permanently delete your account and data.")}
            </div>

            <Separator />

            {/* Logout Button */}
            <div className="mt-6">
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <Icon name="logout" size={14} className="mr-1.5"/> Logout
                </Button>
            </div>
        </div>
    );
});
AccountSettings.displayName = 'AccountSettings';


// Placeholder for other settings panels (remains similar)
const PlaceholderSettings: React.FC<{ title: string, icon?: IconName }> = memo(({ title, icon = 'settings' }) => (
    <div className="p-6 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
        <Icon name={icon} size={44} className="mx-auto mb-4 opacity-30" />
        <p className="text-base font-medium">{title} Settings</p>
        <p className="text-xs mt-1.5">Configuration options for {title.toLowerCase()} will appear here.</p>
    </div>
));
PlaceholderSettings.displayName = 'PlaceholderSettings';


// Main Settings Modal Component (Refactored)
const SettingsModal: React.FC = () => {
    const [isOpen, setIsOpen] = useAtom(isSettingsOpenAtom);
    const [selectedTab, setSelectedTab] = useAtom(settingsSelectedTabAtom);

    const handleOpenChange = useCallback((open: boolean) => {
        setIsOpen(open);
    }, [setIsOpen]);

    const handleTabChange = useCallback((value: string) => {
        setSelectedTab(value as SettingsTab);
    }, [setSelectedTab]);

    const renderContent = useMemo(() => {
        switch (selectedTab) {
            case 'account': return <AccountSettings />;
            case 'appearance': return <PlaceholderSettings title="Appearance" icon="settings" />;
            case 'premium': return <PlaceholderSettings title="Premium" icon="crown" />;
            case 'notifications': return <PlaceholderSettings title="Notifications" icon="bell" />;
            case 'integrations': return <PlaceholderSettings title="Integrations" icon="share" />;
            case 'about': return <PlaceholderSettings title="About" icon="info" />;
            default: return <AccountSettings />;
        }
    }, [selectedTab]);

    const modalTitle = useMemo(() =>
            settingsSections.find(s => s.id === selectedTab)?.label ?? 'Settings'
        , [selectedTab]);

    // Use Dialog component from shadcn/ui
    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl h-[75vh] max-h-[650px] p-0 gap-0 flex overflow-hidden bg-background/80 backdrop-blur-xl border-border/50 !rounded-xl">
                {/* Use shadcn Tabs within the Dialog */}
                <Tabs value={selectedTab} onValueChange={handleTabChange} className="flex-1 flex h-full">
                    {/* Settings Sidebar (TabsList) */}
                    <TabsList className={cn(
                        "flex flex-col h-full justify-start items-stretch w-52",
                        "bg-secondary/40 backdrop-blur-sm border-r border-border/50 rounded-none p-3"
                    )}>
                        <nav className="space-y-0.5 flex-1 mt-1">
                            {settingsSections.map((item) => (
                                <TabsTrigger
                                    key={item.id}
                                    value={item.id}
                                    className={cn(
                                        "w-full justify-start px-2 py-1 h-7 text-sm rounded-md",
                                        "data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none",
                                        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                        "focus-visible:ring-offset-secondary/40" // Adjust focus ring offset
                                    )}
                                >
                                    <Icon name={item.icon} size={15} className="mr-2 opacity-70" aria-hidden="true"/>
                                    <span>{item.label}</span>
                                </TabsTrigger>
                            ))}
                        </nav>
                    </TabsList>

                    {/* Settings Content Area (TabsContent) */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-background/50 dark:bg-black/10">
                        {/* Header inside the content area */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 flex-shrink-0 h-[53px] bg-secondary/30 dark:bg-black/5 backdrop-blur-md">
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {modalTitle}
                            </DialogTitle>
                            {/* DialogClose is handled by the 'x' in DialogContent */}
                        </div>

                        {/* Scrollable Content Panel */}
                        <div className="flex-1 overflow-y-auto styled-scrollbar">
                            {settingsSections.map(item => (
                                <TabsContent key={item.id} value={item.id} className="mt-0 p-5 focus-visible:ring-0 focus-visible:ring-offset-0">
                                    {selectedTab === item.id && renderContent}
                                </TabsContent>
                            ))}
                        </div>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
SettingsModal.displayName = 'SettingsModal';
export default SettingsModal;