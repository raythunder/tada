// src/components/common/Dropdown.tsx
import React, { useState, useCallback, useRef, memo, useMemo, useEffect } from 'react';
import { usePopper } from 'react-popper';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import useClickAway from '@/hooks/useClickAway';

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
    zIndex?: number; // Allow overriding z-index
    /** Callback fired *after* the dropdown closes */
    onClose?: () => void;
}

const Dropdown: React.FC<DropdownProps> = memo(({
                                                    trigger,
                                                    children,
                                                    contentClassName,
                                                    placement = 'bottom-start',
                                                    wrapperClassName,
                                                    isOpen: externalIsOpen,
                                                    onOpenChange,
                                                    zIndex = 50, // Increased default z-index
                                                    onClose // New callback prop
                                                }) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = externalIsOpen ?? internalIsOpen;
    const wasOpenRef = useRef(isOpen); // Track previous open state

    const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null);
    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        placement: placement,
        modifiers: [
            { name: 'offset', options: { offset: [0, 6] } },
            { name: 'preventOverflow', options: { padding: 8 } },
            // Flip might be useful if space is limited
            { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] } }
        ],
    });

    // Update popper position if reference changes
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

    // Effect to call onClose when dropdown transitions from open to closed
    useEffect(() => {
        if (wasOpenRef.current && !isOpen) {
            onClose?.(); // Call the onClose callback if provided
        }
        wasOpenRef.current = isOpen; // Update ref after check
    }, [isOpen, onClose]);

    const close = useCallback(() => {
        setIsOpen(false);
        // No need to call onClose here, the effect above handles it
    }, [setIsOpen]);

    // Click away handling
    useClickAway(dropdownRef, close);

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

    // Apply zIndex via style prop
    const popperStyle = useMemo(() => ({
        ...styles.popper,
        zIndex: zIndex // Apply the z-index
    }), [styles.popper, zIndex]);

    // Add 'ignore-click-away' class
    const popperWrapperClasses = twMerge(
        'ignore-click-away min-w-[180px] overflow-hidden',
        !contentClassName?.includes('date-picker-popover') && 'bg-glass-100 backdrop-blur-xl rounded-lg shadow-strong border border-black/10',
        contentClassName
    );

    return (
        <div ref={dropdownRef} className={twMerge("relative inline-block", wrapperClassName)}>
            <div ref={setReferenceElement} onClick={handleTriggerClick} className="w-full cursor-pointer" role="button" aria-haspopup="listbox" aria-expanded={isOpen} tabIndex={0} onKeyDown={handleKeyDown}>
                {trigger}
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div ref={setPopperElement} style={popperStyle} {...attributes.popper}
                                className={popperWrapperClasses}
                                initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5, transition: { duration: 0.1 } }} transition={{ duration: 0.15, ease: 'easeOut' }}
                        // Prevent clicks inside content from closing via event bubbling
                                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                    >
                        {typeof children === 'function' ? children({ close }) : children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
Dropdown.displayName = 'Dropdown';
export default Dropdown;