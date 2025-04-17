// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { useAtom, useAtomValue } from 'jotai';
import {
    currentFilterAtom,
    isAddListModalOpenAtom,
    taskCountsAtom,
    userDefinedListsAtom,
    userListNamesAtom,
    userTagNamesAtom
} from '@/store/atoms';
import { TaskFilter } from '@/types';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../common/Button';
import AddListModal from '../common/AddListModal';
import { IconName } from "@/components/common/IconMap.tsx";

interface SidebarItemProps {
    to: string;
    filter: TaskFilter;
    icon: IconName;
    label: string;
    count?: number;
    exact?: boolean;
    isUserList?: boolean;
}

interface NavLinkRenderProps { isActive: boolean; isPending: boolean; }

// Sidebar Navigation Item Component
const SidebarItem: React.FC<SidebarItemProps> = ({
                                                     to, filter, icon, label, count, exact = false, isUserList = false
                                                 }) => {
    const [, setCurrentFilter] = useAtom(currentFilterAtom);
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setCurrentFilter(filter);
        navigate(to);
    };

    return (
        <NavLink
            to={to}
            end={exact}
            className={({ isActive }: NavLinkRenderProps) =>
                twMerge(
                    'flex items-center justify-between px-2 py-1 h-7 rounded-md mb-0.5 text-sm group transition-colors duration-100 ease-apple',
                    isActive ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-black/5 hover:text-gray-800'
                )
            }
            onClick={handleClick}
            {...(({ isActive }: NavLinkRenderProps) => isActive ? { 'aria-current': 'page' } : {})}
        >
            {({ isActive }) => (
                <>
                    <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0 mr-1">
                        <Icon name={icon} size={16} className="mr-1.5 flex-shrink-0 opacity-80" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                    </div>
                    {/* Subtle Count Indicator Animation */}
                    <AnimatePresence>
                        {(count !== undefined && count > 0) && (
                            <motion.span
                                className={twMerge(
                                    "text-[10px] font-mono px-1 py-0 rounded-full ml-1 tabular-nums flex-shrink-0",
                                    isActive ? 'text-primary bg-primary/15' : 'text-muted-foreground bg-gray-100 group-hover:bg-gray-200'
                                )}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.7, opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }} // Keep this subtle animation
                                aria-label={`${count} items`}
                            >
                                {count}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    {isUserList && <div className="w-4 h-4 ml-1 flex-shrink-0"></div>}
                </>
            )}
        </NavLink>
    );
};


interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    icon?: IconName;
    initiallyOpen?: boolean;
    action?: React.ReactNode;
}

// Collapsible Section Component - Standard Animation
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
                                                                   title, icon, children, initiallyOpen = true, action
                                                               }) => {
    const [isOpen, setIsOpen] = React.useState(initiallyOpen);

    return (
        <div className="mt-2 pt-2 border-t border-border-color/60 first:mt-0 first:pt-0 first:border-t-0">
            <div className="flex items-center justify-between px-2 py-0.5 mb-0.5">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center flex-1 min-w-0 h-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-gray-700 focus:outline-none group"
                    aria-expanded={isOpen}
                    aria-controls={`section-content-${title.replace(/\s+/g, '-')}`}
                >
                    {icon && <Icon name={icon} size={12} className="mr-1 opacity-70" aria-hidden="true"/>}
                    <span className="mr-1">{title}</span>
                    <Icon
                        name={'chevron-down'}
                        size={14}
                        className={twMerge(
                            "transition-transform duration-200 ease-apple ml-auto opacity-60 group-hover:opacity-80",
                            isOpen ? "rotate-180" : "rotate-0"
                        )}
                        aria-hidden="true"
                    />
                </button>
                {action && <div className="-mr-1 ml-1 flex-shrink-0">{action}</div>}
            </div>
            {/* Collapsible Content - Standard Animation */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        id={`section-content-${title.replace(/\s+/g, '-')}`}
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto', marginTop: '2px' },
                            collapsed: { opacity: 0, height: 0, marginTop: '0px' },
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }} // Keep standard subtle animation
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Main Sidebar Component
const Sidebar: React.FC = () => {
    const counts = useAtomValue(taskCountsAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const userTags = useAtomValue(userTagNamesAtom);
    const [, setCurrentFilter] = useAtom(currentFilterAtom);
    const [, setUserDefinedLists] = useAtom(userDefinedListsAtom);
    const [isModalOpen, setIsModalOpen] = useAtom(isAddListModalOpenAtom);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = React.useState('');

    const handleAddNewListClick = () => setIsModalOpen(true);

    const handleListAdded = (newListName: string) => {
        setUserDefinedLists((prevLists) => [...prevLists, newListName].sort((a,b) => a.localeCompare(b)));
        const newListFilter: TaskFilter = `list-${newListName}`;
        setCurrentFilter(newListFilter);
        navigate(`/list/${encodeURIComponent(newListName)}`);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        // Future: Implement debounced search filter update
    };

    const myListsToDisplay = userLists.filter(list => list !== 'Inbox');

    return (
        <>
            {/* Sidebar Container - Subtle Glass Effect */}
            <aside className="w-56 bg-glass-alt-200 backdrop-blur-sm border-r border-black/5 h-full flex flex-col shrink-0 z-10 pt-3 pb-2">
                {/* Search Bar */}
                <div className="px-2.5 mb-2 flex-shrink-0">
                    <div className="relative">
                        <Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none opacity-70 z-10"/>
                        <input
                            type="search"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full h-7 pl-8 pr-2 text-sm bg-canvas-inset border border-black/5 rounded-md focus:border-primary/30 focus:ring-1 focus:ring-primary/20 placeholder:text-muted text-gray-800 shadow-inner"
                            aria-label="Search tasks"
                        />
                    </div>
                </div>

                {/* Main Filters */}
                <nav className="px-1.5 flex-shrink-0 mb-1">
                    <SidebarItem to="/all" filter="all" icon="archive" label="All Tasks" count={counts.all} exact/>
                    <SidebarItem to="/today" filter="today" icon="sun" label="Today" count={counts.today}/>
                    <SidebarItem to="/next7days" filter="next7days" icon="calendar" label="Next 7 Days" count={counts.next7days}/>
                    <SidebarItem to="/list/Inbox" filter="list-Inbox" icon="inbox" label="Inbox" count={counts.lists['Inbox']} />
                </nav>

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-1.5 styled-scrollbar">
                    {/* User Lists Section */}
                    {/* Render "My Lists" only if user-defined lists exist */}
                    {(myListsToDisplay.length > 0 || userLists.includes('Inbox')) && ( // Adjusted condition slightly
                        <CollapsibleSection
                            title="My Lists"
                            icon="folder"
                            action={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    icon="folder-plus"
                                    className="w-6 h-6 text-muted-foreground hover:text-primary"
                                    onClick={handleAddNewListClick}
                                    aria-label="Add New List"
                                />
                            }
                        >
                            {/* Removed Inbox from here as it's in the main filters now */}
                            {myListsToDisplay.map(listName => (
                                <SidebarItem
                                    key={listName}
                                    to={`/list/${encodeURIComponent(listName)}`}
                                    filter={`list-${listName}`}
                                    icon="list"
                                    label={listName}
                                    count={counts.lists[listName]}
                                    isUserList={true}
                                />
                            ))}
                        </CollapsibleSection>
                    )}

                    {/* Tags Section */}
                    {userTags.length > 0 && (
                        <CollapsibleSection title="Tags" icon="tag" initiallyOpen={false}>
                            {userTags.map(tagName => (
                                <SidebarItem
                                    key={tagName}
                                    to={`/tag/${encodeURIComponent(tagName)}`}
                                    filter={`tag-${tagName}`}
                                    icon="tag"
                                    label={`#${tagName}`}
                                    count={counts.tags[tagName]}
                                />
                            ))}
                        </CollapsibleSection>
                    )}

                    {/* System Filters Section */}
                    <CollapsibleSection title="System" initiallyOpen={false}>
                        <SidebarItem to="/completed" filter="completed" icon="check-square" label="Completed" count={counts.completed}/>
                        <SidebarItem to="/trash" filter="trash" icon="trash" label="Trash" count={counts.trash}/>
                    </CollapsibleSection>
                </div>
            </aside>

            {/* Add List Modal */}
            <AnimatePresence>
                {isModalOpen && <AddListModal onAdd={handleListAdded}/>}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;