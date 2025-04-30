// src/components/common/ConfirmDeleteModal.tsx
import React, {useCallback} from 'react';
import Button from './Button';
import Icon from './Icon';
import {twMerge} from 'tailwind-merge';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    taskTitle: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
                                                                   isOpen,
                                                                   onClose, // Will be called by Radix onOpenChange
                                                                   onConfirm,
                                                                   taskTitle
                                                               }) => {

    const handleConfirmClick = useCallback(() => {
        onConfirm();
        // No need to call onClose here, Radix handles it if button is wrapped in DialogClose
    }, [onConfirm]);

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-50 bg-black/65 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"/>
                {/* Content */}
                <DialogPrimitive.Content
                    className={twMerge(
                        // Base styling using Tailwind and Radix data attributes
                        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-black/10 bg-glass-100 backdrop-blur-xl p-6 shadow-strong duration-200 data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out rounded-xl"
                    )}
                    onEscapeKeyDown={onClose} // Ensure ESC closes
                    onPointerDownOutside={onClose} // Ensure click outside closes
                >
                    {/* Icon and Title */}
                    <div className="flex flex-col items-center text-center space-y-3">
                        <div
                            className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <Icon name="trash" size={24} className="text-red-600 dark:text-red-500"/>
                        </div>
                        <div className="space-y-1">
                            <DialogPrimitive.Title className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                                Move to Trash?
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="text-sm text-muted-foreground px-2">
                                Are you sure you want to move the task "{taskTitle || 'Untitled Task'}" to the Trash?
                            </DialogPrimitive.Description>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center space-x-3 mt-2">
                        <DialogPrimitive.Close asChild>
                            <Button variant="outline" size="md" className="flex-1">
                                Cancel
                            </Button>
                        </DialogPrimitive.Close>
                        {/* Confirm button closes the dialog via its own logic */}
                        <Button variant="danger" size="md" onClick={handleConfirmClick} className="flex-1">
                            Move to Trash
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
ConfirmDeleteModal.displayName = 'ConfirmDeleteModal';
export default ConfirmDeleteModal;