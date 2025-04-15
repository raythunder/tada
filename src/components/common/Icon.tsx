// src/components/common/Icon.tsx
import React from 'react';
import {
    CheckSquare, Calendar, Search, User, Settings, Inbox,
    FileText, Trash2, List, Grid, Clock, AlertCircle,
    Plus, MoreHorizontal, ChevronDown, Sun, Moon, Edit3,
    Check, X, ArrowLeft, ArrowRight, Star, Flag, Tag,
    Bell, Share2, UploadCloud, Download, LogOut, Lock,
    Wrench, Layers, Package, Sliders, Info, HelpCircle,
    Phone, Mail, ExternalLink, Crown, Terminal
} from 'lucide-react';

export type IconName =
    | 'check-square'
    | 'calendar'
    | 'search'
    | 'user'
    | 'settings'
    | 'inbox'
    | 'file-text'
    | 'trash'
    | 'list'
    | 'grid'
    | 'clock'
    | 'alert-circle'
    | 'plus'
    | 'more-horizontal'
    | 'chevron-down'
    | 'sun'
    | 'moon'
    | 'edit'
    | 'check'
    | 'x'
    | 'arrow-left'
    | 'arrow-right'
    | 'star'
    | 'flag'
    | 'tag'
    | 'bell'
    | 'share'
    | 'upload'
    | 'download'
    | 'logout'
    | 'lock'
    | 'tool'
    | 'layers'
    | 'package'
    | 'sliders'
    | 'info'
    | 'help'
    | 'phone'
    | 'mail'
    | 'external-link'
    | 'crown'
    | 'terminal';

interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
    onClick?: () => void;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className = '', onClick }) => {
    const iconMap = {
        'check-square': CheckSquare,
        'calendar': Calendar,
        'search': Search,
        'user': User,
        'settings': Settings,
        'inbox': Inbox,
        'file-text': FileText,
        'trash': Trash2,
        'list': List,
        'grid': Grid,
        'clock': Clock,
        'alert-circle': AlertCircle,
        'plus': Plus,
        'more-horizontal': MoreHorizontal,
        'chevron-down': ChevronDown,
        'sun': Sun,
        'moon': Moon,
        'edit': Edit3,
        'check': Check,
        'x': X,
        'arrow-left': ArrowLeft,
        'arrow-right': ArrowRight,
        'star': Star,
        'flag': Flag,
        'tag': Tag,
        'bell': Bell,
        'share': Share2,
        'upload': UploadCloud,
        'download': Download,
        'logout': LogOut,
        'lock': Lock,
        'tool': Wrench,
        'layers': Layers,
        'package': Package,
        'sliders': Sliders,
        'info': Info,
        'help': HelpCircle,
        'phone': Phone,
        'mail': Mail,
        'external-link': ExternalLink,
        'crown': Crown,
        'terminal': Terminal,
    };

    const IconComponent = iconMap[name];

    return IconComponent ? (
        <IconComponent
            size={size}
            className={`${className}`}
            onClick={onClick}
        />
    ) : null;
};

export default Icon;