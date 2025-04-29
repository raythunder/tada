// src/components/layout/Sidebar.tsx
import React, { useCallback, useRef, useMemo, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
    currentFilterAtom, isAddListModalOpenAtom, taskCountsAtom,
    userDefinedListsAtom, userListNamesAtom, userTagNamesAtom,
    searchTermAtom, selectedTaskIdAtom,
    rawSearchResultsAtom
} from '@/store/atoms';
import { TaskFilter, Task } from '@/types';
import { cn } from "@/lib/utils";
import useDebounce from '@/hooks/useDebounce';
import Icon from '../common/Icon';
import { IconName } from "@/components/common/IconMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import AddListModal from '../common/AddListModal'; // Keep import for rendering
import Highlighter from "react-highlight-words";
import { motion, AnimatePresence } from 'framer-motion';

// Helper snippet function (remains the same)
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
    if (firstMatchIndex === -1) {
        return content.substring(0, length) + (content.length > length ? '...' : '');
    }
    const start = Math.max(0, firstMatchIndex - Math.floor(length / 3));
    const end = Math.min(content.length, firstMatchIndex + matchedWord.length + Math.ceil(length * 2 / 3));
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return snippet;
}

// Sidebar Navigation Item Component using shadcn Button
interface SidebarButtonLinkProps {
    to: string;
    filter: TaskFilter;
    icon: IconName;
    label: string;
    count?: number;
}
const SidebarButtonLink: React.FC<SidebarButtonLinkProps> = memo(({ to, filter, icon, label, count }) => {
    const [currentActiveFilter] = useAtom(currentFilterAtom);
    const isActive = useMemo(() => currentActiveFilter === filter, [currentActiveFilter, filter]);

    return (
        <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
                "w-full justify-start h-7 px-2 mb-0.5", // Adjusted height and padding
                isActive && "bg-primary/10 text-primary hover:bg-primary/15" // Active styling
            )}
            size="sm" // Use sm size for consistency
            asChild // Render as Link
        >
            <Link to={to} aria-current={isActive ? 'page' : undefined}>
                <Icon name={icon} size={15} className="mr-1.5 flex-shrink-0 opacity-80" aria-hidden="true" />
                <span className="truncate flex-1 text-sm">{label}</span>
                {(count !== undefined && count > 0) && (
                    <Badge
                        variant={isActive ? "default" : "secondary"} // Badge variant based on active state
                        className={cn(
                            "ml-1 h-4 px-1.5 text-[10px] font-mono",
                            isActive && "bg-primary/80 text-primary-foreground" // Primary badge style when active
                        )}
                        aria-label={`${count} items`}
                    >
                        {count}
                    </Badge>
                )}
            </Link>
        </Button>
    );
});
SidebarButtonLink.displayName = 'SidebarButtonLink';

// Main Sidebar Component
const Sidebar: React.FC = () => {
    const counts = useAtomValue(taskCountsAtom);
    const userLists = useAtomValue(userListNamesAtom);
    const userTags = useAtomValue(userTagNamesAtom);
    const searchResults = useAtomValue(rawSearchResultsAtom);
    const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
    const setUserDefinedLists = useSetAtom(userDefinedListsAtom);
    const [isModalOpen, setIsModalOpen] = useAtom(isAddListModalOpenAtom);

    const navigate = useNavigate();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 250);
    const isSearching = useMemo(() => debouncedSearchTerm.trim().length > 0, [debouncedSearchTerm]);

    // Add list handlers
    const handleAddNewListClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent accordion toggle if button is inside trigger
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
        // Modal closes itself
    }, [setUserDefinedLists, navigate]);

    // Search handlers
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, [setSearchTerm]);

    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        searchInputRef.current?.focus();
    }, [setSearchTerm]);

    const handleSearchResultClick = useCallback((task: Task) => {
        setSelectedTaskId(task.id);
        // No navigation needed when search is active
    }, [setSelectedTaskId]);

    const myListsToDisplay = useMemo(() => userLists.filter(list => list !== 'Inbox'), [userLists]);
    const tagsToDisplay = useMemo(() => userTags, [userTags]);

    const highlighterProps = useMemo(() => ({
        highlightClassName: "bg-primary/20 text-inherit font-semibold rounded-[1px] px-0",
        searchWords: debouncedSearchTerm.split(' ').filter(Boolean),
        autoEscape: true,
    }), [debouncedSearchTerm]);

    // Define default open sections for the Accordion
    const defaultAccordionValue = useMemo(() => ['main-filters', 'my-lists'], []);

    return (
        <>
            <aside className="flex-1 h-full flex flex-col pt-3 pb-2">
                {/* Search Input Area */}
                <div className="px-3 mb-2 flex-shrink-0">
                    <div className="relative flex items-center">
                        <Icon name="search" size={15} className="absolute left-2.5 text-muted-foreground pointer-events-none z-10" />
                        <Input
                            ref={searchInputRef}
                            id="sidebar-search"
                            type="search"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="h-8 pl-8 pr-7 text-sm bg-background/50 dark:bg-black/20 border-border/60 focus:border-primary/50 focus:bg-background/70 dark:focus:bg-black/30"
                            aria-label="Search tasks"
                        />
                        <AnimatePresence>
                            {searchTerm && (
                                <motion.div
                                    key="clear-search-btn"
                                    initial={{ scale: 0.7, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.7, opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-1 h-full flex items-center z-10"
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleClearSearch}
                                        className="w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-accent"
                                        aria-label="Clear search"
                                    >
                                        <Icon name="x-circle" size={14} />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Scrollable Area */}
                <ScrollArea className="flex-1 px-1.5">
                    <AnimatePresence mode="wait">
                        {isSearching ? (
                            // Search Results View
                            <motion.div
                                key="search-results"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="pb-2"
                            >
                                {searchResults.length > 0 ? (
                                    <>
                                        <p className="text-xs font-medium text-muted-foreground px-1 py-1.5">{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</p>
                                        <div className="space-y-0.5">
                                            {searchResults.map((task: Task) => (
                                                <Button
                                                    key={task.id}
                                                    variant="ghost"
                                                    onClick={() => handleSearchResultClick(task)}
                                                    className="w-full h-auto justify-start items-start px-2 py-1.5 text-left"
                                                    aria-label={`Search result: ${task.title || 'Untitled Task'}`}
                                                >
                                                    <Icon name={task.list === 'Inbox' ? 'inbox' : (task.list === 'Trash' ? 'trash' : 'list')} size={14} className="mr-2 mt-0.5 flex-shrink-0 text-muted-foreground" aria-hidden="true"/>
                                                    <div className="flex-1 overflow-hidden">
                                                        <Highlighter
                                                            {...highlighterProps}
                                                            textToHighlight={task.title || 'Untitled Task'}
                                                            className={cn(
                                                                "block truncate text-sm text-foreground",
                                                                task.completed && task.list !== 'Trash' && "line-through text-muted-foreground",
                                                                task.list === 'Trash' && "italic text-muted-foreground"
                                                            )}
                                                        />
                                                        {task.content && generateContentSnippet(task.content, debouncedSearchTerm) && (
                                                            <Highlighter
                                                                {...highlighterProps}
                                                                textToHighlight={generateContentSnippet(task.content, debouncedSearchTerm)}
                                                                className="block truncate text-xs text-muted-foreground mt-0.5"
                                                            />
                                                        )}
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </>
                                ) : ( <p className="text-xs text-muted-foreground text-center py-6 px-2 italic">No tasks found matching "{debouncedSearchTerm}".</p> )}
                            </motion.div>
                        ) : (
                            // Standard Filter Navigation View
                            <motion.div
                                key="filters"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="pb-2"
                            >
                                <nav className="mb-1">
                                    <SidebarButtonLink to="/all" filter="all" icon="archive" label="All Tasks" count={counts.all} />
                                    <SidebarButtonLink to="/today" filter="today" icon="sun" label="Today" count={counts.today} />
                                    <SidebarButtonLink to="/next7days" filter="next7days" icon="calendar" label="Next 7 Days" count={counts.next7days} />
                                    <SidebarButtonLink to="/list/Inbox" filter="list-Inbox" icon="inbox" label="Inbox" count={counts.lists['Inbox']} />
                                </nav>

                                <Accordion type="multiple" defaultValue={defaultAccordionValue} className="w-full">
                                    <AccordionItem value="my-lists" className="border-b-0">
                                        <AccordionTrigger className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground hover:no-underline py-1.5 px-2 rounded data-[state=open]:bg-accent/50">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <Icon name="folder" size={13} className="mr-1.5 opacity-80" />
                                                My Lists
                                            </div>
                                            {/* Add List Button - positioned outside the flex-1 div */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-6 h-6 text-muted-foreground hover:text-primary hover:bg-primary/10 ml-auto mr-1" // Adjusted margin
                                                onClick={handleAddNewListClick}
                                                aria-label="Add New List"
                                            >
                                                <Icon name="folder-plus" size={15}/>
                                            </Button>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-1 pb-0 pl-1">
                                            {myListsToDisplay.length === 0
                                                ? ( <p className="text-xs text-muted-foreground px-2 py-1 italic">No custom lists yet.</p> )
                                                : ( myListsToDisplay.map(listName => ( <SidebarButtonLink key={listName} to={`/list/${encodeURIComponent(listName)}`} filter={`list-${listName}`} icon="list" label={listName} count={counts.lists[listName]}/> )) )
                                            }
                                        </AccordionContent>
                                    </AccordionItem>

                                    {tagsToDisplay.length > 0 && (
                                        <AccordionItem value="tags" className="border-b-0">
                                            <AccordionTrigger className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground hover:no-underline py-1.5 px-2 rounded data-[state=open]:bg-accent/50">
                                                <div className="flex items-center flex-1 min-w-0">
                                                    <Icon name="tag" size={13} className="mr-1.5 opacity-80" />
                                                    Tags
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-1 pb-0 pl-1">
                                                {tagsToDisplay.map(tagName => ( <SidebarButtonLink key={tagName} to={`/tag/${encodeURIComponent(tagName)}`} filter={`tag-${tagName}`} icon="tag" label={`#${tagName}`} count={counts.tags[tagName]}/> ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                    )}

                                    <AccordionItem value="system" className="border-b-0">
                                        <AccordionTrigger className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground hover:no-underline py-1.5 px-2 rounded data-[state=open]:bg-accent/50">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <Icon name="settings" size={13} className="mr-1.5 opacity-80" />
                                                System
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-1 pb-0 pl-1">
                                            <SidebarButtonLink to="/completed" filter="completed" icon="check-square" label="Completed" count={counts.completed} />
                                            <SidebarButtonLink to="/trash" filter="trash" icon="trash" label="Trash" count={counts.trash} />
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </ScrollArea>
            </aside>
            {/* Add List Modal */}
            <AnimatePresence>
                {isModalOpen && <AddListModal onAdd={handleListAdded} />}
            </AnimatePresence>
        </>
    );
};
Sidebar.displayName = 'Sidebar';
export default Sidebar;