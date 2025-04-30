// src/components/common/AddListModal.tsx
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useAtom} from 'jotai';
import {isAddListModalOpenAtom, userListNamesAtom} from '@/store/atoms';
import Button from './Button';
import {twMerge} from 'tailwind-merge';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface AddListModalProps {
    onAdd: (listName: string) => void;
}

const AddListModal: React.FC<AddListModalProps> = ({onAdd}) => {
    const [isOpen, setIsOpen] = useAtom(isAddListModalOpenAtom);
    const [allListNames] = useAtom(userListNamesAtom);
    const [listName, setListName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens/closes via Radix state change
    useEffect(() => {
        if (isOpen) {
            setListName('');
            setError(null);
            // Radix Dialog handles focus trapping, focus input on open if needed
            // setTimeout(() => inputRef.current?.focus(), 50); // May not be needed with Radix
        }
    }, [isOpen]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = listName.trim();
        if (!trimmedName) {
            setError("List name cannot be empty.");
            inputRef.current?.focus();
            return;
        }
        const lowerTrimmedName = trimmedName.toLowerCase();
        if (allListNames.some(name => name.toLowerCase() === lowerTrimmedName)) {
            setError(`List "${trimmedName}" already exists.`);
            inputRef.current?.select();
            return;
        }
        const reservedNames = ['inbox', 'trash', 'archive', 'all', 'today', 'next 7 days', 'completed', 'later', 'nodate', 'overdue'];
        if (reservedNames.includes(lowerTrimmedName)) {
            setError(`"${trimmedName}" is a reserved system name.`);
            inputRef.current?.select();
            return;
        }

        setError(null);
        onAdd(trimmedName);
        setIsOpen(false); // Close modal by updating atom state
    }, [listName, allListNames, onAdd, setIsOpen]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setListName(e.target.value);
        if (error) setError(null);
    }, [error]);

    // Radix Dialog handles open/close state and click outside
    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"/>
                {/* Content */}
                <DialogPrimitive.Content
                    onOpenAutoFocus={(e) => {
                        // Focus the input when the modal opens
                        e.preventDefault();
                        inputRef.current?.focus();
                    }}
                    className={twMerge(
                        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-black/10 bg-glass-100 backdrop-blur-xl p-0 shadow-strong duration-200 data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out rounded-xl",
                        "flex flex-col" // Ensure flex column layout
                    )}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-black/10 flex-shrink-0 bg-glass-alt-100/80 backdrop-blur-lg rounded-t-xl">
                        <DialogPrimitive.Title className="text-base font-semibold text-gray-800">
                            Create New List
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                icon="x"
                                className="text-muted-foreground hover:bg-black/15 w-7 h-7 -mr-1"
                                aria-label="Close modal"
                            />
                        </DialogPrimitive.Close>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        <div>
                            <label htmlFor="listNameInput"
                                   className="block text-xs font-medium text-muted-foreground mb-1.5">
                                List Name
                            </label>
                            <input
                                ref={inputRef}
                                id="listNameInput"
                                type="text"
                                value={listName}
                                onChange={handleInputChange}
                                placeholder="e.g., Groceries, Project X"
                                className={twMerge(
                                    // Refined input styling
                                    "w-full h-9 px-3 text-sm rounded-md focus:outline-none",
                                    "bg-glass-inset-100 backdrop-blur-sm shadow-inner placeholder:text-muted",
                                    "border focus:ring-2 focus:ring-primary/30",
                                    error
                                        ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                                        : 'border-neutral-300 dark:border-neutral-700 focus:border-primary/50',
                                    "focus:bg-glass-inset-200 transition-colors duration-150 ease-apple" // Focus style
                                )}
                                required
                                aria-required="true"
                                aria-invalid={!!error}
                                aria-describedby={error ? "listNameError" : undefined}
                            />
                            {error && <p id="listNameError" className="text-xs text-red-600 mt-1.5">{error}</p>}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-2 pt-2">
                            <DialogPrimitive.Close asChild>
                                <Button variant="outline" size="md">
                                    Cancel
                                </Button>
                            </DialogPrimitive.Close>
                            <Button type="submit" variant="primary" size="md" disabled={!listName.trim() || !!error}>
                                Create List
                            </Button>
                        </div>
                    </form>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
AddListModal.displayName = 'AddListModal';
export default AddListModal;