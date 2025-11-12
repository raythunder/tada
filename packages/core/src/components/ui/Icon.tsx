import React from 'react';
import * as LucideIcons from 'lucide-react';
import {twMerge} from 'tailwind-merge';
import {iconMap, IconName} from "@/components/ui/IconMap.ts";

interface IconProps extends Omit<LucideIcons.LucideProps, 'ref'> {
    name: IconName;
    size?: number | string;
    className?: string;
    strokeWidth?: number;
}

/**
 * A dynamic icon component that renders a Lucide icon based on a given name.
 * It provides a fallback icon and a console warning for development if an icon is not found.
 */
const IconComponent = React.memo(React.forwardRef<SVGSVGElement, IconProps>(
    ({name, size = 16, className, strokeWidth = 1, ...props}, ref) => {
        const LucideIcon = iconMap[name];

        if (!LucideIcon) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Icon "${name}" not found in iconMap. Rendering fallback (HelpCircle).`);
            }
            const FallbackIcon = LucideIcons.HelpCircle;
            return (
                <FallbackIcon
                    ref={ref} size={size} strokeWidth={strokeWidth}
                    absoluteStrokeWidth={true}
                    className={twMerge('inline-block flex-shrink-0 stroke-current text-error animate-pulse', className)}
                    {...props} />
            );
        }

        return (
            <LucideIcon
                ref={ref} size={size} strokeWidth={strokeWidth}
                absoluteStrokeWidth={true} // Ensures thin lines render correctly regardless of size
                className={twMerge('inline-block flex-shrink-0 stroke-current', className)}
                {...props} />
        );
    }
));
IconComponent.displayName = 'Icon';
export default IconComponent;