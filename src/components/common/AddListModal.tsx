// src/components/common/AddListModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { isAddListModalOpenAtom, userListNamesAtom } from '@/store/atoms';
// import Icon from './Icon';
import Button from './Button';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface AddListModalProps {
    onAdd: (listName: string) => void; // Callback when list is added
}

const AddListModal: React.FC<AddListModalProps> = ({ onAdd }) => {
    const [, setIsOpen] = useAtom(isAddListModalOpenAtom);
    const [allListNames] = useAtom(userListNamesAtom);
    const [listName, setListName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClose = () => setIsOpen(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, []);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = listName.trim();
        if (!trimmedName) {
            setError("List name cannot be empty.");
            inputRef.current?.focus();
            return;
        }
        if (allListNames.some(name => name.toLowerCase() === trimmedName.toLowerCase())) {
            setError(`List "${trimmedName}" already exists.`);
            inputRef.current?.select();
            return;
        }
        const reservedNames = ['inbox', 'trash', 'archive', 'all', 'today', 'next 7 days', 'completed'];
        if (reservedNames.includes(trimmedName.toLowerCase())) {
            setError(`"${trimmedName}" is a reserved system name.`);
            inputRef.current?.select();
            return;
        }

        setError(null);
        onAdd(trimmedName);
        handleClose();
    };

    return (
        // Subtle backdrop fade
        <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={handleClose}
            aria-modal="true"
            role="dialog"
            aria-labelledby="addListModalTitle"
        >
            {/* Subtle modal scale/fade */}
            <motion.div
                className={twMerge(
                    "bg-glass-100 w-full max-w-sm rounded-lg shadow-strong overflow-hidden border border-black/5", // Use glass bg
                    "flex flex-col"
                )}
                initial={{ scale: 0.98, opacity: 0 }} // Less dramatic scale
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }} // Faster transition
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-black/5 flex justify-between items-center flex-shrink-0">
                    <h2 id="addListModalTitle" className="text-base font-semibold text-gray-800">Create New List</h2>
                    {/* Use icon prop for Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        icon="x" // Use icon prop
                        onClick={handleClose}
                        className="text-muted-foreground hover:bg-black/5 w-7 h-7 -mr-1"
                        aria-label="Close modal"
                    />
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label htmlFor="listNameInput" className="block text-xs font-medium text-muted-foreground mb-1.5">
                            List Name
                        </label>
                        <input
                            ref={inputRef}
                            id="listNameInput"
                            type="text"
                            value={listName}
                            onChange={(e) => {
                                setListName(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="e.g., Groceries, Project X"
                            className={twMerge(
                                "w-full h-9 px-3 text-sm bg-canvas-inset border rounded-md focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-muted",
                                error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-border-color-medium'
                            )}
                            aria-required="true"
                            aria-invalid={!!error}
                            aria-describedby={error ? "listNameError" : undefined}
                        />
                        {error && <p id="listNameError" className="text-xs text-red-600 mt-1.5">{error}</p>}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button variant="outline" size="md" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="md" disabled={!listName.trim() || !!error}>
                            Create List
                        </Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default AddListModal;