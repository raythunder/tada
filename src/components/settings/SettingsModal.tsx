// src/components/settings/SettingsModal.tsx
import React from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom, isSettingsOpenAtom, settingsSelectedTabAtom } from '@/store/atoms';
import { SettingsTab } from '@/types';
import Icon, { IconName } from '../common/Icon';
import Button from '../common/Button';
import {AnimatePresence, motion} from 'framer-motion';
import { twMerge } from 'tailwind-merge';
// import { clsx } from 'clsx';

// Define Setting Sections and Items
interface SettingsItem {
    id: SettingsTab;
    label: string;
    icon: IconName;
}

const settingsSections: SettingsItem[] = [
    { id: 'account', label: 'Account', icon: 'user' },
    { id: 'premium', label: 'Premium', icon: 'crown' },
    { id: 'features', label: 'Features', icon: 'layers' },
    { id: 'smart-list', label: 'Smart List', icon: 'list' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'date-time', label: 'Date & Time', icon: 'clock' },
    { id: 'appearance', label: 'Appearance', icon: 'settings' }, // Changed icon
    { id: 'more', label: 'More', icon: 'sliders' },
    { id: 'integrations', label: 'Integrations & Import', icon: 'share' },
    { id: 'collaborate', label: 'Collaborate', icon: 'users' }, // Changed icon
    { id: 'shortcuts', label: 'Shortcuts', icon: 'terminal' },
    { id: 'about', label: 'About', icon: 'info' },
];


// Placeholder Content Components for each tab
const AccountSettings: React.FC = () => {
    const [currentUser] = useAtom(currentUserAtom);
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center mb-8">
                <motion.div
                    className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-medium"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                >
                    {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-3xl font-medium">
                            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-800">{currentUser?.name}</h3>
                {currentUser?.isPremium && (
                    <div className="text-sm text-yellow-600 flex items-center mt-1 font-medium">
                        <Icon name="crown" size={14} className="mr-1 text-yellow-500" />
                        <span>Premium User</span>
                    </div>
                )}
            </div>

            {/* Form-like settings */}
            <div className="space-y-5">
                <SettingsRow label="Email" value={currentUser?.email ?? 'N/A'} />
                <SettingsRow label="Password" action={<Button variant="link" size="sm">Change Password</Button>} />
                <SettingsRow label="2-Step Verification" action={<Button variant="link" size="sm">Manage</Button>} />
                <hr className="border-gray-200/80"/>
                <SettingsRow label="Google Account" value="Linked" action={<Button variant="link" size="sm" className="text-muted-foreground">Unlink</Button>} />
                <SettingsRow label="Apple Account" action={<Button variant="link" size="sm">Link Apple ID</Button>} />
                <hr className="border-gray-200/80"/>
                <SettingsRow label="Backup & Restore">
                    <div className="flex space-x-3">
                        <Button variant="outline" size="sm" icon="download">Generate Backup</Button>
                        <Button variant="outline" size="sm" icon="upload">Import Backup</Button>
                    </div>
                </SettingsRow>
                <SettingsRow label="Manage Account" action={<Button variant="link" size="sm" className="text-red-600 hover:text-red-700">Delete Account</Button>} />
                <SettingsRow label="Login Devices" action={<Button variant="link" size="sm">Manage Devices</Button>} />
            </div>
        </div>
    );
};

const SettingsRow: React.FC<{label: string, value?: string | React.ReactNode, action?: React.ReactNode, children?: React.ReactNode}> = ({label, value, action, children}) => (
    <div className="flex justify-between items-center py-2">
        <span className="text-sm text-gray-600 font-medium">{label}</span>
        <div className="text-sm text-gray-800 flex items-center space-x-4">
            {value && <span>{value}</span>}
            {action}
            {children}
        </div>
    </div>
);

// Placeholder for other sections
const PlaceholderSettings: React.FC<{ title: string }> = ({ title }) => (
    <div className="p-6 text-center text-gray-500 animate-fade-in">
        <Icon name="tool" size={48} className="mx-auto mb-4 text-gray-300" />
        Settings for "{title}" are not implemented yet.
    </div>
);


const SettingsModal: React.FC = () => {
    const [, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
    const [selectedTab, setSelectedTab] = useAtom(settingsSelectedTabAtom);

    const handleClose = () => setIsSettingsOpen(false);

    const renderContent = () => {
        switch (selectedTab) {
            case 'account': return <AccountSettings />;
            // Add cases for other tabs, using PlaceholderSettings for now
            case 'premium': return <PlaceholderSettings title="Premium" />;
            case 'features': return <PlaceholderSettings title="Features" />;
            case 'appearance': return <PlaceholderSettings title="Appearance" />;
            // ... other cases
            default: return <AccountSettings />; // Default to account
        }
    };

    return (
        // Backdrop with blur and fade-in
        <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose} // Close on backdrop click
        >
            {/* Modal Content with scale-in */}
            <motion.div
                className="bg-canvas w-full max-w-4xl h-[70vh] max-h-[700px] rounded-xl shadow-strong flex overflow-hidden"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                {/* Sidebar */}
                <div className="w-56 bg-canvas-alt border-r border-gray-200/80 p-4 flex flex-col shrink-0">
                    <h2 className="text-lg font-semibold mb-6 px-2">Settings</h2>
                    <nav className="space-y-1 flex-1 overflow-y-auto styled-scrollbar -mr-1 pr-1">
                        {settingsSections.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedTab(item.id)}
                                className={twMerge(
                                    'flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-100 ease-in-out',
                                    selectedTab === item.id
                                        ? 'bg-primary/15 text-primary font-medium'
                                        : 'text-gray-600 hover:bg-gray-500/10 hover:text-gray-800'
                                )}
                            >
                                <Icon name={item.icon} size={16} className="mr-2.5" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    {/* Logout Button */}
                    <div className="mt-auto pt-4 border-t border-gray-200/80">
                        <Button variant="ghost" size="sm" icon="logout" className="w-full justify-start text-muted-foreground hover:text-red-600">
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto styled-scrollbar relative">
                    {/* Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="absolute top-3 right-3 text-muted hover:bg-gray-100"
                        aria-label="Close settings"
                    >
                        <Icon name="x" size={18} />
                    </Button>

                    {/* Render selected tab content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SettingsModal;