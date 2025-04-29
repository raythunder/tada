// src/components/common/AddListModal.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { isAddListModalOpenAtom, userListNamesAtom } from '@/store/atoms';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import Icon from './Icon';
import { cn } from '@/lib/utils';

interface AddListModalProps {
    onAdd: (listName: string) => void;
}

const AddListModal: React.FC<AddListModalProps> = ({ onAdd }) => {
    const [isOpen, setIsOpen] = useAtom(isAddListModalOpenAtom);
    const [allListNames] = useAtom(userListNamesAtom);
    const [listName, setListName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleOpenChange = useCallback((open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setError(null);
            setListName('');
        }
    }, [setIsOpen]);

    // Focus input when dialog opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100); // Delay needed for Dialog animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
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
        handleOpenChange(false); // Close the modal
    }, [listName, allListNames, onAdd, handleOpenChange]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setListName(e.target.value);
        if (error) setError(null);
    }, [error]);

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-xl border-border/50">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Icon name="folder-plus" size={18} className="mr-2 opacity-70" />
                        Create New List
                    </DialogTitle>
                </DialogHeader>
                {/* Use a form element for semantics and potential enter key submission */}
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="listNameInput" className="text-right text-muted-foreground">
                            Name
                        </Label>
                        <div className="col-span-3">
                            <Input
                                ref={inputRef}
                                id="listNameInput"
                                value={listName}
                                onChange={handleInputChange}
                                placeholder="e.g., Groceries, Project X"
                                className={cn(error && "border-destructive focus-visible:ring-destructive/50")}
                                aria-invalid={!!error}
                                aria-describedby={error ? "listNameError" : undefined}
                            />
                            {error && <p id="listNameError" className="text-xs text-destructive mt-1.5">{error}</p>}
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </DialogClose>
                    {/* Disable button if name is empty or error exists */}
                    <Button type="button" onClick={handleSubmit} disabled={!listName.trim() || !!error}>
                        Create List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
AddListModal.displayName = 'AddListModal';
export default AddListModal;