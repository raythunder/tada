// src/components/common/IconMap.tsx
// No changes needed based on the requirements. Retained original code.
import * as LucideIcons from "lucide-react";

// Comprehensive map of icons used in the application
export const iconMap = {
    'check-square': LucideIcons.CheckSquare,
    'calendar': LucideIcons.CalendarDays, // Use CalendarDays for consistency
    'search': LucideIcons.Search,
    'user': LucideIcons.User,
    'settings': LucideIcons.Settings,
    'file-text': LucideIcons.FileText,
    'trash': LucideIcons.Trash2,
    'list': LucideIcons.List,
    'grid': LucideIcons.LayoutGrid, // Use LayoutGrid if needed
    'clock': LucideIcons.Clock,
    'alert-circle': LucideIcons.AlertCircle,
    'plus': LucideIcons.Plus,
    'more-horizontal': LucideIcons.MoreHorizontal,
    'chevron-down': LucideIcons.ChevronDown,
    'chevron-up': LucideIcons.ChevronUp,
    'chevron-left': LucideIcons.ChevronLeft,
    'chevron-right': LucideIcons.ChevronRight,
    'sun': LucideIcons.Sun,
    'sunset': LucideIcons.Sunset, // Keep if used in date picker, else remove
    'moon': LucideIcons.Moon,   // Keep if used in date picker, else remove
    'calendar-plus': LucideIcons.CalendarPlus,
    'edit': LucideIcons.Edit3,
    'check': LucideIcons.Check,
    'x': LucideIcons.X,
    'arrow-left': LucideIcons.ArrowLeft,
    'arrow-right': LucideIcons.ArrowRight,
    'star': LucideIcons.Star,
    'flag': LucideIcons.Flag,
    'tag': LucideIcons.Tag,
    'bell': LucideIcons.Bell, // Used in DatePicker and Settings
    'share': LucideIcons.Share2, // Used in Settings
    'upload': LucideIcons.UploadCloud, // Used in Settings
    'download': LucideIcons.Download, // Used in Settings
    'logout': LucideIcons.LogOut, // Used in Settings
    'lock': LucideIcons.Lock,
    'tool': LucideIcons.Wrench,
    'layers': LucideIcons.Layers,
    'package': LucideIcons.Package,
    'sliders': LucideIcons.SlidersHorizontal,
    'info': LucideIcons.Info, // Used in Settings
    'help': LucideIcons.HelpCircle, // Fallback icon
    'phone': LucideIcons.Phone,
    'mail': LucideIcons.Mail,
    'external-link': LucideIcons.ExternalLink,
    'crown': LucideIcons.Crown, // Used in Settings
    'terminal': LucideIcons.Terminal,
    'grip-vertical': LucideIcons.GripVertical, // Used for TaskItem drag handle
    'copy': LucideIcons.Copy,
    'archive': LucideIcons.Archive, // Used for 'All Tasks' icon
    'arrow-up-down': LucideIcons.ArrowUpDown,
    'calendar-days': LucideIcons.CalendarDays, // Used for Calendar icon in IconBar
    'loader': LucideIcons.Loader2, // Used for loading states (spin animation)
    'users': LucideIcons.Users,
    'sparkles': LucideIcons.Sparkles, // Used for AI Summary icon
    'folder-plus': LucideIcons.FolderPlus, // Used for 'Add List' button
    'folder': LucideIcons.Folder, // Used for 'My Lists' section header
    'minus': LucideIcons.Minus,
    'inbox': LucideIcons.Inbox, // Used for 'Inbox' list icon
    'x-circle': LucideIcons.XCircle, // Used for clearing search input
    'calendar-check': LucideIcons.CalendarCheck,
    'refresh-cw': LucideIcons.RefreshCw, // Used in DatePicker 'Repeat' button
};

// Export the type for Icon names based on the map keys
export type IconName = keyof typeof iconMap;