// src/components/layout/Sidebar.tsx
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
    currentFilterAtom,
    isAddListModalOpenAtom,
    taskCountsAtom,
    userDefinedListsAtom,
    userListNamesAtom,
    userTagNamesAtom,
    searchTermAtom, // Import search atom
    tasksAtom, // Need tasks for search filtering
    selectedTaskIdAtom // To select task from search
} from '@/store/atoms';
import { TaskFilter, Task } from '@/types';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../common/Button';
import AddListModal from '../common/AddListModal';
import { IconName } from "@/components/common/IconMap.tsx";
// import TaskItem from "@/components/tasks/TaskItem"; // Import TaskItem for search results
import Highlighter from "react-highlight-words"; // For highlighting search terms

// Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}


// Sidebar Navigation Item Component (Memoized)
const SidebarItem: React.FC<{
    to: string; filter: TaskFilter; icon: IconName; label: string; count?: number; isUserList?: boolean;
}> = React.memo(({ to, filter, icon, label, count, isUserList = false }) => {
    const [currentActiveFilter, setCurrentFilter] = useAtom(currentFilterAtom);
    const setSearchTerm = useSetAtom(searchTermAtom); // To clear search on nav click
    const navigate = useNavigate();
    const isActive = currentActiveFilter === filter;

    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (!isActive) {
            setCurrentFilter(filter);
            setSearchTerm(''); // Clear search when navigating via sidebar
            navigate(to);
        }
    }, [isActive, setCurrentFilter, filter, navigate, to, setSearchTerm]);

    return (
        <a
            href={to}
            onClick={handleClick}
            className={twMerge(
                'flex items-center justify-between px-2 py-1 h-7 rounded-md mb-0.5 text-sm group transition-colors duration-100 ease-apple cursor-pointer',
                isActive
                    ? 'bg-primary/15 text-primary font-medium backdrop-blur-xs' // Active glass
                    : 'text-gray-600 hover:bg-black/10 hover:text-gray-800 hover:backdrop-blur-xs' // Hover glass
            )}
            aria-current={isActive ? 'page' : undefined}
        >
            <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0 mr-1">
                <Icon name={icon} size={16} className="mr-1.5 flex-shrink-0 opacity-80" aria-hidden="true" />
                <span className="truncate">{label}</span>
            </div>
            <AnimatePresence>
                {(count !== undefined && count > 0) && (
                    <motion.span
                        className={twMerge(
                            "text-[10px] font-mono px-1 py-0 rounded-full ml-1 tabular-nums flex-shrink-0 backdrop-blur-xs", // Added blur
                            isActive
                                ? 'text-primary bg-primary/20'
                                : 'text-muted-foreground bg-gray-500/10 group-hover:bg-gray-500/15'
                        )}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        aria-label={`${count} items`}
                    >
                        {count}
                    </motion.span>
                )}
            </AnimatePresence>
            {isUserList && <div className="w-4 h-4 ml-1 flex-shrink-0"></div>}
        </a>
    );
});
SidebarItem.displayName = 'SidebarItem';


// Collapsible Section Component (Memoized)
const CollapsibleSection: React.FC<{
    title: string; children: React.ReactNode; icon?: IconName; initiallyOpen?: boolean; action?: React.ReactNode;
}> = React.memo(({ title, icon, children, initiallyOpen = true, action }) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    const sectionId = `section-content-${title.replace(/\s+/g, '-')}`;

    return (
        <div className="mt-2 pt-2 border-t border-black/5 first:mt-0 first:pt-0 first:border-t-0">
            <div className="flex items-center justify-between px-2 py-0.5 mb-0.5">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center flex-1 min-w-0 h-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-gray-700 focus:outline-none group"
                    aria-expanded={isOpen}
                    aria-controls={sectionId}
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
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        id={sectionId}
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto', marginTop: '2px' },
                            collapsed: { opacity: 0, height: 0, marginTop: '0px' },
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
CollapsibleSection.displayName = 'CollapsibleSection';


// Main Sidebar Component
const Sidebar: React.FC = () => {
    const counts = useAtomValue(taskCountsAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const userTags = useAtomValue(userTagNamesAtom);
    const allTasks = useAtomValue(tasksAtom);
    const [, setCurrentFilter] = useAtom(currentFilterAtom);
    const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const [, setUserDefinedLists] = useAtom(userDefinedListsAtom);
    const [isModalOpen, setIsModalOpen] = useAtom(isAddListModalOpenAtom);

    const navigate = useNavigate();
    const location = useLocation();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 250); // Debounce search term

    const [searchResults, setSearchResults] = useState<Task[]>([]);
    const [isSearching, setIsSearching] = useState(false); // Explicit searching state

    // Perform search when debounced term changes
    useEffect(() => {
        if (debouncedSearchTerm.trim().length > 0) {
            setIsSearching(true);
            const lowerCaseTerm = debouncedSearchTerm.toLowerCase();
            const results = allTasks.filter(task =>
                    task.list !== 'Trash' && ( // Exclude trash from search results
                        task.title.toLowerCase().includes(lowerCaseTerm) ||
                        (task.content && task.content.toLowerCase().includes(lowerCaseTerm)) ||
                        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(lowerCaseTerm)))
                    )
            ).sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt)); // Sort results
            setSearchResults(results);
        } else {
            setIsSearching(false);
            setSearchResults([]); // Clear results if search term is empty
        }
    }, [debouncedSearchTerm, allTasks]);

    const handleAddNewListClick = useCallback(() => {
        setIsModalOpen(true);
    }, [setIsModalOpen]);

    const handleListAdded = useCallback((newListName: string) => {
        setUserDefinedLists((prevLists) =>
            [...prevLists.filter(l => l !== 'Inbox'), newListName]
                .sort((a,b) => a.localeCompare(b))
        );
        const newListFilter: TaskFilter = `list-${newListName}`;
        setCurrentFilter(newListFilter);
        setSearchTerm(''); // Clear search on navigation
        navigate(`/list/${encodeURIComponent(newListName)}`);
    }, [setUserDefinedLists, setCurrentFilter, navigate, setSearchTerm]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setIsSearching(false);
        setSearchResults([]);
        searchInputRef.current?.focus();
    };

    const handleSearchResultClick = (taskId: string) => {
        setSelectedTaskId(taskId);
        // Optionally navigate to the task's list if needed, or just show detail
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
            // If not already on a list/tag page, navigate to the task's list
            if (!location.pathname.startsWith('/list/') && !location.pathname.startsWith('/tag/')) {
                const listFilter: TaskFilter = `list-${task.list}`;
                setCurrentFilter(listFilter);
                navigate(`/list/${encodeURIComponent(task.list)}`);
            }
        }
        // Keep search active after selecting an item? Maybe clear? User preference. Let's keep it.
        // setSearchTerm('');
    };

    const myListsToDisplay = userLists.filter(list => list !== 'Inbox');

    return (
        <>
            {/* Sidebar Container with STRONG Glass Effect */}
            <aside className="w-56 bg-glass-alt-100 backdrop-blur-xl border-r border-black/10 h-full flex flex-col shrink-0 z-10 pt-3 pb-2 shadow-strong"> {/* Strongest glass */}
                {/* Search Bar */}
                <div className="px-2.5 mb-2 flex-shrink-0">
                    <div className="relative">
                        <label htmlFor="sidebar-search" className="sr-only">Search Tasks</label>
                        <Icon name="search" size={15}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none opacity-70 z-10"/>
                        <input
                            ref={searchInputRef}
                            id="sidebar-search"
                            type="search"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            // Subtle inset glass search bar
                            className="w-full h-7 pl-8 pr-7 text-sm bg-glass-inset-100 backdrop-blur-sm border border-black/10 rounded-md focus:border-primary/30 focus:ring-1 focus:ring-primary/20 placeholder:text-muted text-gray-800 shadow-inner focus:bg-glass-inset-200" // Glass input
                            aria-label="Search tasks"
                        />
                        {/* Clear Search Button */}
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                icon="x-circle" // Use x-circle icon
                                onClick={handleClearSearch}
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-50 hover:opacity-100"
                                aria-label="Clear search"
                            />
                        )}
                    </div>
                </div>

                {/* Conditional Rendering: Search Results or Regular Filters */}
                <div className="flex-1 overflow-y-auto styled-scrollbar">
                    {/* Search Results View */}
                    <AnimatePresence mode="wait">
                        {isSearching ? (
                            <motion.div
                                key="search-results"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="px-1.5" // Padding for results container
                            >
                                {searchResults.length > 0 ? (
                                    <>
                                        <p className="text-xs font-medium text-muted px-1 py-1">{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</p>
                                        {/* Re-use TaskItem styling but make it simpler for search */}
                                        {searchResults.map(task => (
                                            <button
                                                key={task.id}
                                                onClick={() => handleSearchResultClick(task.id)}
                                                className="flex items-center w-full px-2 py-1.5 text-left rounded-md hover:bg-black/10 hover:backdrop-blur-xs text-sm group transition-colors duration-100 ease-apple"
                                            >
                                                {/* Basic icon based on list or fallback */}
                                                <Icon
                                                    name={task.list === 'Inbox' ? 'inbox' : 'file-text'}
                                                    size={15}
                                                    className="mr-2 flex-shrink-0 text-muted opacity-70"
                                                />
                                                <div className="flex-1 overflow-hidden">
                                                    <Highlighter
                                                        highlightClassName="bg-yellow-200/70 font-semibold rounded-[2px] px-0.5 mx-[-0.5px]" // Glassy highlight
                                                        searchWords={[debouncedSearchTerm]}
                                                        autoEscape={true}
                                                        textToHighlight={task.title || 'Untitled Task'}
                                                        className={twMerge("block truncate text-gray-800", task.completed && "line-through text-muted")}
                                                    />
                                                    {/* Optionally show a snippet of content match */}
                                                    {task.content?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) && !task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) && (
                                                        <Highlighter
                                                            highlightClassName="bg-yellow-200/70 rounded-[2px] px-0.5 mx-[-0.5px]"
                                                            searchWords={[debouncedSearchTerm]}
                                                            autoEscape={true}
                                                            textToHighlight={task.content.substring(0, 50) + '...'} // Show snippet
                                                            className="block truncate text-xs text-muted mt-0.5"
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted text-center py-4 px-2 italic">No tasks found matching "{debouncedSearchTerm}".</p>
                                )}
                            </motion.div>
                        ) : (
                            /* Regular Filters View */
                            <motion.div
                                key="filters"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="px-1.5" // Padding for filters container
                            >
                                {/* Static Filters */}
                                <nav className="mb-1">
                                    <SidebarItem to="/all" filter="all" icon="archive" label="All Tasks" count={counts.all} />
                                    <SidebarItem to="/today" filter="today" icon="sun" label="Today" count={counts.today} />
                                    <SidebarItem to="/next7days" filter="next7days" icon="calendar" label="Next 7 Days" count={counts.next7days} />
                                    <SidebarItem to="/list/Inbox" filter="list-Inbox" icon="inbox" label="Inbox" count={counts.lists['Inbox']} />
                                </nav>

                                {/* Collapsible Sections */}
                                <CollapsibleSection
                                    title="My Lists"
                                    icon="folder"
                                    action={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            icon="folder-plus"
                                            className="w-6 h-6 text-muted-foreground hover:text-primary hover:bg-black/10"
                                            onClick={handleAddNewListClick}
                                            aria-label="Add New List"
                                        />
                                    }
                                >
                                    {myListsToDisplay.length === 0 ? (
                                        <p className="text-xs text-muted px-2 py-1 italic">No custom lists yet.</p>
                                    ) : (
                                        myListsToDisplay.map(listName => (
                                            <SidebarItem
                                                key={listName}
                                                to={`/list/${encodeURIComponent(listName)}`}
                                                filter={`list-${listName}`}
                                                icon="list"
                                                label={listName}
                                                count={counts.lists[listName]}
                                                isUserList={true}
                                            />
                                        ))
                                    )}
                                </CollapsibleSection>

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

                                <CollapsibleSection title="System" initiallyOpen={false}>
                                    <SidebarItem to="/completed" filter="completed" icon="check-square" label="Completed" count={counts.completed} />
                                    <SidebarItem to="/trash" filter="trash" icon="trash" label="Trash" count={counts.trash} />
                                </CollapsibleSection>
                            </motion.div>
                        )}
                    </AnimatePresence>
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