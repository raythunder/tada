// src/components/common/IconMap.tsx
import * as LucideIcons from "lucide-react";

// Comprehensive map of icons used in the application
export const iconMap = {
    'check-square': LucideIcons.CheckSquare,
    'calendar': LucideIcons.Calendar,
    'search': LucideIcons.Search,
    'user': LucideIcons.User,
    'settings': LucideIcons.Settings,
    'file-text': LucideIcons.FileText,
    'trash': LucideIcons.Trash2,
    'list': LucideIcons.List,
    'grid': LucideIcons.Grid, // Might be unused now
    'clock': LucideIcons.Clock, // Might be unused
    'alert-circle': LucideIcons.AlertCircle,
    'plus': LucideIcons.Plus,
    'more-horizontal': LucideIcons.MoreHorizontal,
    'chevron-down': LucideIcons.ChevronDown,
    'chevron-up': LucideIcons.ChevronUp,
    'chevron-left': LucideIcons.ChevronLeft,
    'chevron-right': LucideIcons.ChevronRight,
    'sun': LucideIcons.Sun,
    'sunset': LucideIcons.Sunset,
    'moon': LucideIcons.Moon,
    'calendar-plus': LucideIcons.CalendarPlus, // Might be unused
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
    'lock': LucideIcons.Lock, // Potentially for auth/settings
    'tool': LucideIcons.Wrench, // Potentially for settings/debug
    'layers': LucideIcons.Layers, // Potentially for future features
    'package': LucideIcons.Package, // Potentially for features
    'sliders': LucideIcons.SlidersHorizontal, // Potentially for filter/sort options
    'info': LucideIcons.Info, // Used in Settings
    'help': LucideIcons.HelpCircle, // Fallback icon
    'phone': LucideIcons.Phone, // Potentially for contact/about
    'mail': LucideIcons.Mail, // Potentially for contact/about
    'external-link': LucideIcons.ExternalLink,
    'crown': LucideIcons.Crown, // Used in Settings
    'terminal': LucideIcons.Terminal, // Potentially for debug/dev features
    'grip-vertical': LucideIcons.GripVertical, // Used for TaskItem drag handle
    'copy': LucideIcons.Copy, // Potentially for copy actions
    'archive': LucideIcons.Archive, // Used for 'All Tasks' icon
    'arrow-up-down': LucideIcons.ArrowUpDown, // Potentially for sorting indicator
    'calendar-days': LucideIcons.CalendarDays, // Used for Calendar icon in IconBar
    'loader': LucideIcons.Loader2, // Used for loading states (spin animation)
    'users': LucideIcons.Users, // Potentially for collaboration/sharing
    'sparkles': LucideIcons.Sparkles, // Used for AI Summary icon
    'folder-plus': LucideIcons.FolderPlus, // Used for 'Add List' button
    'folder': LucideIcons.Folder, // Used for 'My Lists' section header
    'minus': LucideIcons.Minus, // General purpose
    'inbox': LucideIcons.Inbox, // Used for 'Inbox' list icon
    'x-circle': LucideIcons.XCircle, // Used for clearing search input
    'calendar-check': LucideIcons.CalendarCheck, // Potentially for completed date indicator
    'refresh-cw': LucideIcons.RefreshCw, // Used in DatePicker 'Repeat' button
};

// Export the type for Icon names based on the map keys
export type IconName = keyof typeof iconMap;