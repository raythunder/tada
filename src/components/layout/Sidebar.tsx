// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon, { IconName } from '../common/Icon';
import { useAtom } from 'jotai';
import { currentFilterAtom, taskCountsAtom, userListNamesAtom, userTagNamesAtom } from '@/store/atoms';
import { TaskFilter } from '@/types';
import { twMerge } from 'tailwind-merge';
// import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button';

interface SidebarItemProps {
    to: string;
    filter: TaskFilter; // Use filter type
    icon: IconName;
    label: string;
    count?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, filter, icon, label, count }) => {
    const [currentFilter, setCurrentFilter] = useAtom(currentFilterAtom);
    const isActive = currentFilter === filter;

    const handleClick = (e: React.MouseEvent) => {
        // Prevent full page reload if it's already active, maybe? Or allow re-clicking to refresh?
        // For now, always set the filter.
        e.preventDefault(); // Prevent default NavLink navigation IF needed
        setCurrentFilter(filter);
        // Consider using useNavigate hook if state change should also trigger navigation
        // const navigate = useNavigate(); navigate(to);
    };

    return (
        <NavLink
            to={to} // Keep NavLink for potential future use and accessibility
            onClick={handleClick}
            className={twMerge(
                'flex items-center justify-between px-3 py-1.5 h-8 rounded-md mb-1 text-sm group transition-colors duration-100 ease-in-out',
                isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-gray-600 hover:bg-gray-500/10 hover:text-gray-800'
            )}
            aria-current={isActive ? 'page' : undefined}
        >
            <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis">
                <Icon name={icon} size={16} className="mr-2.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
            </div>
            {count !== undefined && count > 0 && (
                <span className={twMerge(
                    "text-xs font-mono px-1.5 py-0.5 rounded-full ml-2",
                    isActive ? 'text-primary bg-primary/20' : 'text-muted-foreground bg-gray-100 group-hover:bg-gray-200'
                )}>
                    {count}
                </span>
            )}
        </NavLink>
    );
};

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    icon?: IconName; // Optional icon for the section header
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children }) => {
    const [isOpen, setIsOpen] = React.useState(true); // Default open

    return (
        <div className="mt-3 pt-3 border-t border-gray-200/80">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-gray-700 focus:outline-none"
                aria-expanded={isOpen}
            >
                <div className="flex items-center">
                    {icon && <Icon name={icon} size={14} className="mr-1.5" />}
                    <span>{title}</span>
                </div>
                <Icon
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    className="transition-transform duration-200"
                />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden mt-1"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const Sidebar: React.FC = () => {
    const [counts] = useAtom(taskCountsAtom);
    const [userLists] = useAtom(userListNamesAtom);
    const [userTags] = useAtom(userTagNamesAtom);
    const [, setCurrentFilter] = useAtom(currentFilterAtom); // For adding new list/tag

    const handleAddNewList = () => {
        const newListName = prompt("Enter new list name:");
        if (newListName) {
            // In a real app, you'd update a dedicated lists atom/state
            // For now, just set the filter to navigate (assuming a task will be added later)
            setCurrentFilter(`list-${newListName}`);
            // Potentially add a dummy task to make the list appear if using task-derived lists
        }
    };

    return (
        <aside className="w-64 bg-canvas-alt border-r border-gray-200/80 h-full flex flex-col shrink-0 z-10 pt-4 pb-2">
            {/* Optional Search Bar */}
            <div className="px-3 mb-3">
                <div className="relative">
                    <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="search"
                        placeholder="Search..."
                        className="w-full h-8 pl-8 pr-2 text-sm bg-canvas-inset border border-gray-200 rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* Main Filters */}
            <nav className="px-2 flex-shrink-0">
                <SidebarItem to="/" filter="all" icon="inbox" label="Inbox" count={counts.inbox} /> {/* Changed to inbox icon/label for clarity */}
                <SidebarItem to="/today" filter="today" icon="sun" label="Today" count={counts.today} />
                <SidebarItem to="/next7days" filter="next7days" icon="calendar" label="Next 7 Days" count={counts.next7days} />
                <SidebarItem to="/all" filter="all" icon="archive" label="All Tasks" count={counts.all} /> {/* Added explicit All Tasks */}
            </nav>

            {/* Scrollable Area for Lists, Tags, etc. */}
            <div className="flex-1 overflow-y-auto px-2 pt-2 styled-scrollbar">
                {/* Lists Section */}
                <CollapsibleSection title="Lists" icon="list">
                    {userLists.map(listName => (
                        <SidebarItem
                            key={listName}
                            to={`/list/${listName}`}
                            filter={`list-${listName}`}
                            icon="list" // Use a generic list icon or allow custom icons later
                            label={listName}
                            count={counts.lists[listName]}
                        />
                    ))}
                    <Button variant="ghost" size="sm" icon="plus" className="w-full justify-start mt-1 text-muted-foreground hover:text-gray-800" onClick={handleAddNewList}>
                        Add List
                    </Button>
                </CollapsibleSection>

                {/* Tags Section */}
                {userTags.length > 0 && (
                    <CollapsibleSection title="Tags" icon="tag">
                        {userTags.map(tagName => (
                            <SidebarItem
                                key={tagName}
                                to={`/tag/${tagName}`}
                                filter={`tag-${tagName}`}
                                icon="tag"
                                label={tagName}
                                count={counts.tags[tagName]}
                            />
                        ))}
                    </CollapsibleSection>
                )}

                {/* System Filters Section */}
                <CollapsibleSection title="System">
                    <SidebarItem to="/completed" filter="completed" icon="check" label="Completed" count={counts.completed} />
                    <SidebarItem to="/trash" filter="trash" icon="trash" label="Trash" count={counts.trash} />
                </CollapsibleSection>
            </div>
        </aside>
    );
};

export default Sidebar;