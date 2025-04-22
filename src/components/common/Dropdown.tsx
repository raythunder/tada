// src/components/common/Dropdown.tsx
import React, { useState, useCallback, useRef, memo, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for createPortal
import { usePopper } from 'react-popper';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export interface DropdownRenderProps {
    close: () => void;
}

interface DropdownProps {
    trigger: React.ReactElement;
    children: React.ReactNode | ((props: DropdownRenderProps) => React.ReactNode);
    contentClassName?: string;
    placement?: import('@popperjs/core').Placement;
    wrapperClassName?: string;
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    zIndex?: number;
    onClose?: () => void;
    usePortal?: boolean; // <<< Add portal prop
}

const Dropdown: React.FC<DropdownProps> = memo(({
                                                    trigger,
                                                    children,
                                                    contentClassName,
                                                    placement = 'bottom-start',
                                                    wrapperClassName,
                                                    isOpen: externalIsOpen,
                                                    onOpenChange,
                                                    zIndex = 50,
                                                    onClose,
                                                    usePortal = false // <<< Default to false
                                                }) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = externalIsOpen ?? internalIsOpen;
    const wasOpenRef = useRef(isOpen);

    const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null);
    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the trigger wrapper for click-away

    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        placement: placement,
        strategy: usePortal ? 'fixed' : 'absolute', // <<< Use 'fixed' strategy for portals
        modifiers: [
            { name: 'offset', options: { offset: [0, 6] } },
            { name: 'preventOverflow', options: { padding: 8 } },
            { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] } }
        ],
    });

    useEffect(() => {
        if (isOpen && update) {
            update();
        }
    }, [isOpen, update]);


    const setIsOpen = useCallback((value: boolean) => {
        if (onOpenChange) {
            onOpenChange(value);
        } else {
            setInternalIsOpen(value);
        }
    }, [onOpenChange]);

    useEffect(() => {
        if (wasOpenRef.current && !isOpen) {
            onClose?.();
        }
        wasOpenRef.current = isOpen;
    }, [isOpen, onClose]);

    const close = useCallback(() => {
        setIsOpen(false);
    }, [setIsOpen]);

    // Use clickAway on the trigger wrapper (dropdownRef) AND the popperElement itself if it exists
    // This handles clicks outside both the trigger and the floated content
    const clickAwayHandler = useCallback((event: MouseEvent | TouchEvent) => {
        // Check if the click is outside the trigger wrapper AND outside the popper element
        const isClickInsideTrigger = dropdownRef.current?.contains(event.target as Node);
        // Check the popper element directly, ignoring .ignore-click-away class here
        // because we *want* clicks outside the popper to close it unless it's on the trigger
        const isClickInsidePopper = popperElement?.contains(event.target as Node);

        if (!isClickInsideTrigger && !isClickInsidePopper) {
            close();
        }
        // Clicks *inside* elements marked with ignore-click-away should *already* be handled
        // by the listener in useClickAway stopping propagation or returning early.
        // Let's rely on that. If issues persist, we might need to re-add explicit ignore check here.

    }, [close, popperElement]); // Depend on popperElement existence

    // We attach the listener directly here instead of using the hook
    // because we need to check against both the trigger and the popper
    useEffect(() => {
        if (!isOpen) return; // Only listen when open

        document.addEventListener('mousedown', clickAwayHandler);
        document.addEventListener('touchstart', clickAwayHandler);

        return () => {
            document.removeEventListener('mousedown', clickAwayHandler);
            document.removeEventListener('touchstart', clickAwayHandler);
        };
    }, [isOpen, clickAwayHandler]); // Re-bind listener if isOpen or the handler changes


    const handleTriggerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    }, [isOpen, setIsOpen]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
        } else if (e.key === 'Escape') {
            close();
        }
    }, [isOpen, setIsOpen, close]);

    const popperStyle = useMemo(() => ({
        ...styles.popper,
        zIndex: zIndex
    }), [styles.popper, zIndex]);

    const popperWrapperClasses = twMerge(
        'ignore-click-away min-w-[180px] overflow-hidden', // Keep ignore-click-away here for nested scenarios
        !contentClassName?.includes('date-picker-popover') && 'bg-glass-100 backdrop-blur-xl rounded-lg shadow-strong border border-black/10',
        contentClassName
    );

    const dropdownContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div ref={setPopperElement} style={popperStyle} {...attributes.popper}
                            className={popperWrapperClasses}
                            initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5, transition: { duration: 0.1 } }} transition={{ duration: 0.15, ease: 'easeOut' }}
                    // Stop propagation to prevent immediate closure by the trigger's clickAway
                    // Note: This shouldn't prevent the document-level listener above from working for clicks *outside*
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()} // Also prevent mousedown propagation
                            onTouchStart={(e) => e.stopPropagation()} // And touchstart
                >
                    {typeof children === 'function' ? children({ close }) : children}
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div ref={dropdownRef} className={twMerge("relative inline-block", wrapperClassName)}>
            <div ref={setReferenceElement} onClick={handleTriggerClick} className="w-full cursor-pointer" role="button" aria-haspopup="listbox" aria-expanded={isOpen} tabIndex={0} onKeyDown={handleKeyDown}>
                {trigger}
            </div>
            {/* Conditionally render using portal */}
            {usePortal ? ReactDOM.createPortal(dropdownContent, document.body) : dropdownContent}
        </div>
    );
});
Dropdown.displayName = 'Dropdown';
export default Dropdown;