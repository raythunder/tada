// src/components/common/Icon.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { iconMap, IconName } from "./IconMap"; // Ensure path is correct

interface IconProps extends Omit<LucideIcons.LucideProps, 'ref'> {
    name: IconName;
    size?: number | string;
    className?: string;
}

const IconComponent = React.memo(React.forwardRef<SVGSVGElement, IconProps>(
    ({ name, size = 16, className, strokeWidth = 1.75, ...props }, ref) => {
        const LucideIcon = iconMap[name];

        if (!LucideIcon) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Icon "${name}" not found in iconMap. Rendering fallback (HelpCircle).`);
            }
            const FallbackIcon = LucideIcons.HelpCircle;
            return (
                <FallbackIcon
                    ref={ref}
                    size={size}
                    strokeWidth={strokeWidth}
                    absoluteStrokeWidth={typeof strokeWidth === 'number' && strokeWidth > 3}
                    className={twMerge(
                        'inline-block flex-shrink-0 stroke-current text-destructive animate-pulse', // Adjusted fallback style
                        className
                    )}
                    {...props}
                />
            );
        }

        return (
            <LucideIcon
                ref={ref}
                size={size}
                strokeWidth={strokeWidth}
                absoluteStrokeWidth={typeof strokeWidth === 'number' && strokeWidth > 3}
                className={twMerge(
                    'inline-block flex-shrink-0 stroke-current', // Base styling
                    className
                )}
                {...props}
            />
        );
    }
));
IconComponent.displayName = 'Icon';
export default IconComponent;