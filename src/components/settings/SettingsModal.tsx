// src/components/settings/SettingsModal.tsx
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import Icon from '../common/Icon';

const SettingsModal: React.FC = () => {
    const { currentUser, setIsSettingsOpen } = useAppContext();

    const handleClose = () => {
        setIsSettingsOpen(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
            <div className="bg-white w-[800px] h-[600px] rounded-lg shadow-xl flex">
                <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
                    <h2 className="text-xl font-semibold mb-8">Settings</h2>

                    <div className="space-y-4">
                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer bg-gray-100">
                            <Icon name="user" size={18} className="mr-3" />
                            <span>Account</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="crown" size={18} className="mr-3" />
                            <span>Premium</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="layers" size={18} className="mr-3" />
                            <span>Features</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="list" size={18} className="mr-3" />
                            <span>Smart List</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="bell" size={18} className="mr-3" />
                            <span>Notifications</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="clock" size={18} className="mr-3" />
                            <span>Date & Time</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="settings" size={18} className="mr-3" />
                            <span>Appearance</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="sliders" size={18} className="mr-3" />
                            <span>More</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="share" size={18} className="mr-3" />
                            <span>Integrations & Import</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="user" size={18} className="mr-3" />
                            <span>Collaborate</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="terminal" size={18} className="mr-3" />
                            <span>Shortcuts</span>
                        </div>

                        <div className="flex items-center py-2 px-3 text-gray-700 rounded-md cursor-pointer hover:bg-gray-100">
                            <Icon name="info" size={18} className="mr-3" />
                            <span>About</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 relative">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <Icon name="x" size={20} />
                    </button>

                    <div className="flex flex-col items-center mb-8">
                        {currentUser?.avatar ? (
                            <img
                                src={currentUser.avatar}
                                alt={currentUser.name}
                                className="w-16 h-16 rounded-full mb-4"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl mb-4">
                                {currentUser?.name.charAt(0) || 'U'}
                            </div>
                        )}
                        <h3 className="text-xl font-semibold text-gray-800">{currentUser?.name}</h3>
                        <div className="text-sm text-amber-500 flex items-center mt-1">
                            <span>Premium Features</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">Email</span>
                            <span className="text-gray-600">{currentUser?.email}</span>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">Password</span>
                            <button className="text-blue-500 hover:text-blue-600 text-sm">Set Password</button>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">2-Step Verification</span>
                            <button className="text-blue-500 hover:text-blue-600 text-sm">Setting</button>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">Google</span>
                            <span className="text-gray-600">Liu Yunpeng</span>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">Apple</span>
                            <button className="text-blue-500 hover:text-blue-600 text-sm">Link</button>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">Backup & Restore</span>
                            <div className="flex space-x-4">
                                <button className="text-blue-500 hover:text-blue-600 text-sm">Generate Backup</button>
                                <button className="text-blue-500 hover:text-blue-600 text-sm">Import Backups</button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">Manage Account</span>
                            <button className="text-red-500 hover:text-red-600 text-sm">Delete Account</button>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-gray-700">Login Devices</span>
                            <button className="text-blue-500 hover:text-blue-600 text-sm">Manage</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;