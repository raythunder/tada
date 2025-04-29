// src/components/common/ConfirmDeleteModal.tsx
import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    // AlertDialogTrigger // Typically triggered programmatically
} from "@/components/ui/alert-dialog";
import Icon from './Icon';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void; // Renamed from onCancel for clarity with AlertDialogCancel
    onConfirm: () => void;
    taskTitle: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
                                                                   isOpen,
                                                                   onClose,
                                                                   onConfirm,
                                                                   taskTitle
                                                               }) => {

    // AlertDialog handles open/close state and backdrop clicks via onOpenChange
    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose(); // Call the onClose prop when the dialog requests to be closed
        }
        // If open is true, it's handled by the parent component setting isOpen
    }, [onClose]);

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="bg-background/80 backdrop-blur-xl border-border/50">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center text-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3 mr-3">
                            <Icon name="trash" size={24} className="text-destructive" />
                        </div>
                        Move to Trash?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center px-4">
                        Are you sure you want to move the task "{taskTitle || 'Untitled Task'}" to the Trash?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 sm:justify-center">
                    {/* AlertDialogCancel automatically calls onClose via onOpenChange */}
                    <AlertDialogCancel asChild>
                        <Button variant="outline" className="flex-1 sm:flex-none">Cancel</Button>
                    </AlertDialogCancel>
                    {/* AlertDialogAction triggers the onConfirm callback */}
                    <AlertDialogAction onClick={onConfirm} asChild>
                        <Button variant="destructive" className="flex-1 sm:flex-none">Move to Trash</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
ConfirmDeleteModal.displayName = 'ConfirmDeleteModal';
export default ConfirmDeleteModal;