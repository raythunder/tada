// src/components/layout/Sidebar.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import Icon from '../common/Icon';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {
    currentFilterAtom,
    isAddListModalOpenAtom,
    rawSearchResultsAtom,
    searchTermAtom,
    selectedTaskIdAtom,
    taskCountsAtom,
    userDefinedListsAtom,
    userListNamesAtom,
    userTagNamesAtom
} from '@/store/atoms';
import {Task, TaskFilter} from '@/types';
import {twMerge} from 'tailwind-merge';
import Button from '../common/Button';
import AddListModal from '../common/AddListModal'; // Import Radix-based Dialog
import {IconName} from "@/components/common/IconMap";
import Highlighter from "react-highlight-words";
import {AnimatePresence, motion} from 'framer-motion';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'; // Import Radix Collapsible

// Debounce Hook (Keep as is)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// Helper function for snippet generation (Keep as is)
function generateContentSnippet(content: string, term: string, length: number = 35): string {
    if (!content || !term) return '';
    const lowerContent = content.toLowerCase();
    const searchWords = term.toLowerCase().split(' ').filter(Boolean);
    let firstMatchIndex = -1;
    let matchedWord = '';
    for (const word of searchWords) {
        const index = lowerContent.indexOf(word);
        if (index !== -1) {
            firstMatchIndex = index;
            matchedWord = word;
            break;
        }
    }
    if (firstMatchIndex === -1) return content.substring(0, length) + (content.length > length ? '...' : '');
    const start = Math.max(0, firstMatchIndex - Math.floor(length / 3));
    const end = Math.min(content.length, firstMatchIndex + matchedWord.length + Math.ceil(length * 2 / 3));
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return snippet;
}


// Sidebar Navigation Item Component (Refined styles)
const SidebarItem: React.FC<{
    to: string; filter: TaskFilter; icon: IconName; label: string; count?: number; isUserList?: boolean;
}> = memo(({to, filter, icon, label, count, isUserList = false}) => {
    const [currentActiveFilter,] = useAtom(currentFilterAtom);
    const navigate = useNavigate();
    const isActive = useMemo(() => currentActiveFilter === filter, [currentActiveFilter, filter]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        navigate(to);
    }, [navigate, to]);

    const linkClassName = useMemo(() => twMerge(
        // Base styling
        'flex items-center justify-between px-2 py-1 h-7 rounded-md mb-0.5 text-sm group transition-colors duration-150 ease-apple cursor-pointer', // Faster transition
        // Active state
        isActive ? 'bg-primary/15 dark:bg-primary/25 text-primary font-medium backdrop-blur-sm' : 'text-gray-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-neutral-100 hover:backdrop-blur-sm',
        // Focus state
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-glass-alt-100 dark:focus-visible:ring-offset-neutral-800'
    ), [isActive]);

    const countClassName = useMemo(() => twMerge(
        // Base count style
        "text-[10px] font-mono px-1 py-0 rounded-full ml-1 tabular-nums flex-shrink-0 backdrop-blur-sm",
        // State-based style
        isActive ? 'text-primary bg-primary/20 dark:bg-primary/30' : 'text-muted-foreground dark:text-neutral-400 bg-black/10 dark:bg-white/10 group-hover:bg-black/15 dark:group-hover:bg-white/15'
    ), [isActive]);

    return (
        <Link
            to={to}
            onClick={handleClick}
            className={linkClassName}
            aria-current={isActive ? 'page' : undefined}
        >
            <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0 mr-1">
                <Icon name={icon} size={15} className="mr-1.5 flex-shrink-0 opacity-70" aria-hidden="true"/>
                <span className="truncate">{label}</span>
            </div>
            {(count !== undefined && count > 0) && (
                <span className={countClassName} aria-label={`${count} items`}>
                    {count}
                </span>
            )}
            {/* Placeholder for drag handle or actions if needed later */}
            {isUserList && <div className="w-4 h-4 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-50"></div>}
        </Link>
    );
});
SidebarItem.displayName = 'SidebarItem';


// Collapsible Section Component (Using Radix Collapsible)
const CollapsibleSection: React.FC<{
    title: string; children: React.ReactNode; icon?: IconName; initiallyOpen?: boolean; action?: React.ReactNode;
}> = memo(({title, icon, children, initiallyOpen = true, action}) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);

    return (
        // Use Radix Collapsible Root
        <CollapsiblePrimitive.Root
            open={isOpen}
            onOpenChange={setIsOpen}
            className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 first:mt-0 first:pt-0 first:border-t-0"
        >
            <div className="flex items-center justify-between px-2 py-0.5 mb-0.5">
                {/* Radix Collapsible Trigger */}
                <CollapsiblePrimitive.Trigger asChild>
                    <button
                        className="flex items-center flex-1 min-w-0 h-6 text-[10px] font-semibold text-muted-foreground dark:text-neutral-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-neutral-200 focus:outline-none group rounded"
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${title} section`}
                    >
                        {icon &&
                            <Icon name={icon} size={12} className="mr-1 opacity-70 flex-shrink-0" aria-hidden="true"/>}
                        <span className="mr-1 flex-shrink-0">{title}</span>
                        {/* Chevron indicates state */}
                        <Icon
                            name={'chevron-down'}
                            size={14}
                            className={twMerge(
                                "transition-transform duration-200 ease-apple ml-auto opacity-60 group-hover:opacity-80",
                                // Use Radix data state for rotation
                                "group-data-[state=open]:rotate-180 group-data-[state=closed]:rotate-0"
                            )}
                            aria-hidden="true"
                        />
                    </button>
                </CollapsiblePrimitive.Trigger>
                {action && <div className="-mr-1 ml-1 flex-shrink-0">{action}</div>}
            </div>
            {/* Radix Collapsible Content with animation */}
            <CollapsiblePrimitive.Content
                className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up"
                // Radix animations use keyframes defined in tailwind.config.js (or CSS)
                // For a simpler fade/height:
                // className="overflow-hidden transition-all duration-200 ease-out data-[state=open]:mt-0.5 data-[state=closed]:mt-0"
            >
                {children}
            </CollapsiblePrimitive.Content>
        </CollapsiblePrimitive.Root>
    );
});
CollapsibleSection.displayName = 'CollapsibleSection';


// Main Sidebar Component
const Sidebar: React.FC = () => {
    // Atoms and State (Keep as is)
    const counts = useAtomValue(taskCountsAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const userTags = useAtomValue(userTagNamesAtom);
    const searchResults = useAtomValue(rawSearchResultsAtom);
    const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const setUserDefinedLists = useSetAtom(userDefinedListsAtom);
    const [, setIsModalOpen] = useAtom(isAddListModalOpenAtom);

    const navigate = useNavigate();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 250);
    const isSearching = useMemo(() => debouncedSearchTerm.trim().length > 0, [debouncedSearchTerm]);

    // Handlers (Keep as is)
    const handleAddNewListClick = useCallback(() => {
        setIsModalOpen(true);
    }, [setIsModalOpen]);
    const handleListAdded = useCallback((newListName: string) => {
        const trimmedName = newListName.trim();
        if (!trimmedName) return;
        setUserDefinedLists((prevLists = []) => {
            const newListSet = new Set(prevLists);
            newListSet.add(trimmedName);
            return Array.from(newListSet).sort((a, b) => a.localeCompare(b));
        });
        navigate(`/list/${encodeURIComponent(trimmedName)}`);
        // Modal closes itself via Radix state change
    }, [setUserDefinedLists, navigate]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, [setSearchTerm]);

    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        searchInputRef.current?.focus();
    }, [setSearchTerm]);

    const handleSearchResultClick = useCallback((task: Task) => {
        setSelectedTaskId(task.id);
        // No navigation, MainPage handles display based on searchTerm
    }, [setSelectedTaskId]);

    // Memoized data/styles
    const myListsToDisplay = useMemo(() => userLists.filter(list => list !== 'Inbox'), [userLists]);
    const tagsToDisplay = useMemo(() => userTags, [userTags]);

    const searchInputClassName = useMemo(() => twMerge(
        // Refined input styling
        "w-full h-7 pl-8 pr-7 text-sm rounded-md focus:outline-none",
        "bg-neutral-200/60 dark:bg-neutral-700/60", // Input background
        "border border-transparent focus:border-primary/40 dark:focus:border-primary/60", // Focus border
        "focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30", // Focus ring
        "placeholder:text-neutral-400 dark:placeholder:text-neutral-500", // Placeholder color
        "text-neutral-800 dark:text-neutral-100", // Text color
        "transition-colors duration-150 ease-in-out"
    ), []);

    const highlighterProps = useMemo(() => ({
        highlightClassName: "bg-yellow-300/70 dark:bg-yellow-500/40 font-semibold rounded-[2px] px-0.5 mx-[-0.5px] backdrop-blur-xs text-black/80 dark:text-white/90",
        searchWords: debouncedSearchTerm.split(' ').filter(Boolean),
        autoEscape: true,
    }), [debouncedSearchTerm]);

    const searchResultButtonClassName = "flex items-start w-full px-2 py-1.5 text-left rounded-md hover:bg-black/15 dark:hover:bg-white/10 hover:backdrop-blur-sm text-sm group transition-colors duration-100 ease-apple focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-glass-alt-100 dark:focus-visible:ring-offset-neutral-800";

    return (
        <>
            {/* Sidebar container with refined background/border */}
            <aside
                className="w-56 bg-glass-alt-100 dark:bg-neutral-800/80 backdrop-blur-xl border-r border-black/5 dark:border-white/5 h-full flex flex-col shrink-0 z-10 pt-3 pb-2">
                {/* Search Input Area */}
                <div className="px-2.5 mb-2 flex-shrink-0">
                    <div className="relative flex items-center">
                        <label htmlFor="sidebar-search" className="sr-only">Search Tasks</label>
                        <Icon name="search" size={15}
                              className="absolute left-2.5 text-muted dark:text-neutral-500 pointer-events-none opacity-70 z-10"/>
                        <input
                            ref={searchInputRef}
                            id="sidebar-search"
                            type="search"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className={searchInputClassName}
                            aria-label="Search tasks"
                        />
                        {/* Clear button animation */}
                        <AnimatePresence>
                            {searchTerm && (
                                <motion.div
                                    key="clear-search-btn"
                                    initial={{scale: 0.7, opacity: 0}}
                                    animate={{scale: 1, opacity: 1}}
                                    exit={{scale: 0.7, opacity: 0}}
                                    transition={{duration: 0.1}}
                                    className="absolute right-1 h-full flex items-center z-10"
                                >
                                    <Button
                                        variant="ghost" size="icon" icon="x-circle"
                                        onClick={handleClearSearch}
                                        className="w-5 h-5 text-muted-foreground dark:text-neutral-400 opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                                        aria-label="Clear search"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Scrollable Filters/Search Results Area */}
                <div className="flex-1 overflow-y-auto styled-scrollbar">
                    <AnimatePresence mode="wait">
                        {isSearching ? (
                            // Search Results View
                            <motion.div
                                key="search-results"
                                initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                                transition={{duration: 0.1, ease: 'linear'}}
                                className="px-1.5 pb-2"
                            >
                                {searchResults.length > 0 ? (
                                    <>
                                        <p className="text-xs font-medium text-muted dark:text-neutral-400 px-1 py-1">{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</p>
                                        {searchResults.map((task: Task) => (
                                            <button key={task.id} onClick={() => handleSearchResultClick(task)}
                                                    className={searchResultButtonClassName}
                                                    aria-label={`Search result: ${task.title || 'Untitled Task'}`}>
                                                <Icon
                                                    name={task.list === 'Inbox' ? 'inbox' : (task.list === 'Trash' ? 'trash' : 'list')}
                                                    size={15}
                                                    className="mr-2 mt-[2px] flex-shrink-0 text-muted dark:text-neutral-500 opacity-70"
                                                    aria-hidden="true"/>
                                                <div className="flex-1 overflow-hidden">
                                                    <Highlighter
                                                        {...highlighterProps}
                                                        textToHighlight={task.title || 'Untitled Task'}
                                                        className={twMerge(
                                                            "block truncate text-neutral-800 dark:text-neutral-100",
                                                            task.completed && task.list !== 'Trash' && "line-through text-muted dark:text-neutral-500",
                                                            task.list === 'Trash' && "italic text-muted dark:text-neutral-500"
                                                        )}
                                                    />
                                                    {task.content && generateContentSnippet(task.content, debouncedSearchTerm) && (
                                                        <Highlighter
                                                            {...highlighterProps}
                                                            textToHighlight={generateContentSnippet(task.content, debouncedSearchTerm)}
                                                            className="block truncate text-xs text-muted dark:text-neutral-400 mt-0.5"
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted dark:text-neutral-500 text-center py-4 px-2 italic">No
                                        tasks found matching "{debouncedSearchTerm}".</p>)}
                            </motion.div>
                        ) : (
                            // Standard Filter Navigation View
                            <motion.div
                                key="filters"
                                initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                                transition={{duration: 0.1, ease: 'linear'}}
                                className="px-1.5 pb-2"
                            >
                                <nav className="mb-1">
                                    <SidebarItem to="/all" filter="all" icon="archive" label="All Tasks"
                                                 count={counts.all}/>
                                    <SidebarItem to="/today" filter="today" icon="sun" label="Today"
                                                 count={counts.today}/>
                                    <SidebarItem to="/next7days" filter="next7days" icon="calendar" label="Next 7 Days"
                                                 count={counts.next7days}/>
                                    <SidebarItem to="/list/Inbox" filter="list-Inbox" icon="inbox" label="Inbox"
                                                 count={counts.lists['Inbox']}/>
                                </nav>
                                {/* Use Radix Collapsible */}
                                <CollapsibleSection
                                    title="My Lists" icon="folder"
                                    action={<Button variant="ghost" size="icon" icon="folder-plus"
                                                    className="w-6 h-6 text-muted-foreground dark:text-neutral-400 hover:text-primary dark:hover:text-primary-dark hover:bg-black/10 dark:hover:bg-white/10"
                                                    onClick={handleAddNewListClick} aria-label="Add New List"/>}
                                >
                                    {myListsToDisplay.length === 0
                                        ? (<p className="text-xs text-muted dark:text-neutral-500 px-2 py-1 italic">No
                                            custom lists yet.</p>)
                                        : (myListsToDisplay.map(listName => (
                                            <SidebarItem key={listName} to={`/list/${encodeURIComponent(listName)}`}
                                                         filter={`list-${listName}`} icon="list" label={listName}
                                                         count={counts.lists[listName]} isUserList={true}/>)))
                                    }
                                </CollapsibleSection>
                                {tagsToDisplay.length > 0 && (
                                    <CollapsibleSection title="Tags" icon="tag" initiallyOpen={false}>
                                        {tagsToDisplay.map(tagName => (
                                            <SidebarItem key={tagName} to={`/tag/${encodeURIComponent(tagName)}`}
                                                         filter={`tag-${tagName}`} icon="tag" label={`#${tagName}`}
                                                         count={counts.tags[tagName]}/>))}
                                    </CollapsibleSection>
                                )}
                                <CollapsibleSection title="System" initiallyOpen={false}>
                                    <SidebarItem to="/completed" filter="completed" icon="check-square"
                                                 label="Completed" count={counts.completed}/>
                                    <SidebarItem to="/trash" filter="trash" icon="trash" label="Trash"
                                                 count={counts.trash}/>
                                </CollapsibleSection>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </aside>
            {/* Radix Dialog is portal-based, rendered conditionally via atom state */}
            <AddListModal onAdd={handleListAdded}/>
        </>
    );
};
Sidebar.displayName = 'Sidebar';
export default Sidebar;