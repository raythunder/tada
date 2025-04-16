// src/components/common/Icon.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type IconName = keyof typeof iconMap; // Dynamically generate type from map keys

// Keep the map for lookup, ensure keys match IconName type implicitly
const iconMap = {
    'check-square': LucideIcons.CheckSquare,
    'calendar': LucideIcons.Calendar,
    'search': LucideIcons.Search,
    'user': LucideIcons.User,
    'settings': LucideIcons.Settings,
    // 'inbox': LucideIcons.Inbox, // Removed
    'file-text': LucideIcons.FileText,
    'trash': LucideIcons.Trash2,
    'list': LucideIcons.List,
    'grid': LucideIcons.Grid,
    'clock': LucideIcons.Clock,
    'alert-circle': LucideIcons.AlertCircle,
    'plus': LucideIcons.Plus,
    'more-horizontal': LucideIcons.MoreHorizontal,
    'chevron-down': LucideIcons.ChevronDown,
    'chevron-up': LucideIcons.ChevronUp,
    'chevron-left': LucideIcons.ChevronLeft,
    'chevron-right': LucideIcons.ChevronRight,
    'sun': LucideIcons.Sun,
    'moon': LucideIcons.Moon,
    'edit': LucideIcons.Edit3,
    'check': LucideIcons.Check,
    'x': LucideIcons.X,
    'arrow-left': LucideIcons.ArrowLeft,
    'arrow-right': LucideIcons.ArrowRight,
    'star': LucideIcons.Star,
    'flag': LucideIcons.Flag,
    'tag': LucideIcons.Tag,
    'bell': LucideIcons.Bell,
    'share': LucideIcons.Share2,
    'upload': LucideIcons.UploadCloud,
    'download': LucideIcons.Download,
    'logout': LucideIcons.LogOut,
    'lock': LucideIcons.Lock,
    'tool': LucideIcons.Wrench,
    'layers': LucideIcons.Layers,
    'package': LucideIcons.Package,
    'sliders': LucideIcons.SlidersHorizontal,
    'info': LucideIcons.Info,
    'help': LucideIcons.HelpCircle,
    'phone': LucideIcons.Phone,
    'mail': LucideIcons.Mail,
    'external-link': LucideIcons.ExternalLink,
    'crown': LucideIcons.Crown,
    'terminal': LucideIcons.Terminal,
    'grip-vertical': LucideIcons.GripVertical,
    'copy': LucideIcons.Copy,
    'archive': LucideIcons.Archive, // For 'All Tasks'
    'arrow-up-down': LucideIcons.ArrowUpDown,
    'calendar-days': LucideIcons.CalendarDays, // For Calendar icon
    'loader': LucideIcons.Loader2, // Use Loader2 for better spinning animation
    'users': LucideIcons.Users,
    'sparkles': LucideIcons.Sparkles, // For AI actions
};

interface IconProps extends React.SVGAttributes<SVGElement> {
    name: IconName;
    size?: number | string;
    className?: string;
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ name, size = '1em', className, ...props }, ref) => {
        const IconComponent = iconMap[name];

        if (!IconComponent) {
            console.warn(`Icon "${name}" not found.`);
            // Render a fallback or nothing
            return <LucideIcons.HelpCircle ref={ref} size={size} className={twMerge('inline-block flex-shrink-0 stroke-current text-red-500', className)} {...props} />;
        }

        return (
            <IconComponent
                ref={ref}
                size={size}
                // Use stroke-width 1.75 for a slightly lighter feel like Apple SF Symbols
                strokeWidth={1.75}
                absoluteStrokeWidth={false} // Ensure stroke width scales with size
                className={twMerge('inline-block flex-shrink-0 stroke-current', className)}
                {...props}
            />
        );
    }
);
Icon.displayName = 'Icon';
export default Icon;