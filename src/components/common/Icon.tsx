// src/components/common/Icon.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { iconMap, IconName } from "@/components/common/IconMap";

// Extend LucideProps, but omit 'ref' as it's handled by forwardRef
interface IconProps extends Omit<LucideIcons.LucideProps, 'ref'> {
    name: IconName;
    size?: number | string; // Allow string for flexibility, e.g., "1.5em"
    className?: string;
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ name, size = 16, className, strokeWidth = 1.75, ...props }, ref) => {
        const IconComponent = iconMap[name];

        // Fallback for missing icons
        if (!IconComponent) {
            console.warn(`Icon "${name}" not found in iconMap. Rendering fallback (HelpCircle).`);
            return (
                <LucideIcons.HelpCircle
                    ref={ref}
                    size={size}
                    strokeWidth={strokeWidth}
                    // Ensure strokeWidth scales with size unless specified otherwise
                    absoluteStrokeWidth={typeof strokeWidth === 'number' && strokeWidth > 3}
                    className={twMerge(
                        'inline-block flex-shrink-0 stroke-current text-red-500 animate-pulse', // Fallback styling
                        className
                    )}
                    {...props}
                />
            );
        }

        // Render the requested icon
        return (
            <IconComponent
                ref={ref}
                size={size}
                strokeWidth={strokeWidth}
                absoluteStrokeWidth={typeof strokeWidth === 'number' && strokeWidth > 3}
                className={twMerge(
                    'inline-block flex-shrink-0 stroke-current', // Base styling
                    className // Allow external classes
                )}
                {...props} // Pass other SVG attributes (like color, fill, etc.)
            />
        );
    }
);
Icon.displayName = 'Icon';
export default Icon;