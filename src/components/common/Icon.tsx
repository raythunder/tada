// src/components/common/Icon.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { twMerge } from 'tailwind-merge';
// import { clsx } from 'clsx';

// Keep the existing IconName type
export type IconName =
    | 'check-square' | 'calendar' | 'search' | 'user' | 'settings' | 'inbox'
    | 'file-text' | 'trash' | 'list' | 'grid' | 'clock' | 'alert-circle'
    | 'plus' | 'more-horizontal' | 'chevron-down' | 'chevron-up' | 'chevron-left' | 'chevron-right'
    | 'sun' | 'moon' | 'edit' | 'check' | 'x' | 'arrow-left' | 'arrow-right'
    | 'star' | 'flag' | 'tag' | 'bell' | 'share' | 'upload' | 'download'
    | 'logout' | 'lock' | 'tool' | 'layers' | 'package' | 'sliders' | 'info'
    | 'help' | 'phone' | 'mail' | 'external-link' | 'crown' | 'terminal'
    | 'grip-vertical' | 'copy' | 'archive' | 'arrow-up-down' | 'calendar-days' | 'loader' | 'users'; // Added some potentially useful icons

// Map string names to Lucide components (Case-insensitive matching for flexibility)
const iconMap: { [key: string]: React.ComponentType<LucideIcons.LucideProps> } = {
    'check-square': LucideIcons.CheckSquare,
    'calendar': LucideIcons.Calendar,
    'search': LucideIcons.Search,
    'user': LucideIcons.User,
    'settings': LucideIcons.Settings,
    'inbox': LucideIcons.Inbox,
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
    'archive': LucideIcons.Archive,
    'arrow-up-down': LucideIcons.ArrowUpDown,
    'calendar-days': LucideIcons.CalendarDays,
    'loader': LucideIcons.Loader,
    'users': LucideIcons.Users,
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
            return null; // Or return a default placeholder icon
        }

        return (
            <IconComponent
                ref={ref}
                size={size}
                className={twMerge('inline-block flex-shrink-0 stroke-current', className)}
                strokeWidth={2} // Default stroke width for lucide
                {...props}
            />
        );
    }
);
Icon.displayName = 'Icon';
export default Icon;