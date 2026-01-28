import React, {useCallback} from 'react';
import ZenModeView from "@/components/features/zen/ZenModeView.tsx";
import {useAtomValue, useSetAtom} from 'jotai';
import {selectedTaskIdAtom} from '@/store/jotai.ts';
import {AnimatePresence, motion} from 'framer-motion';
import TaskDetail from "@/components/features/tasks/TaskDetail.tsx";
import {twMerge} from 'tailwind-merge';

const ZenPage: React.FC = () => {
    const selectedTaskId = useAtomValue(selectedTaskIdAtom);
    const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);

    const closeDetail = useCallback(() => {
        setSelectedTaskId(null);
    }, [setSelectedTaskId]);

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* The main Zen Mode View */}
            <ZenModeView />

            {/* Task Detail Slide-over */}
            <AnimatePresence>
                {selectedTaskId && (
                    <>
                        <motion.div
                            key="zen-detail-backdrop"
                            className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 backdrop-blur-sm"
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            transition={{duration: 0.3}}
                            onClick={closeDetail}
                        />
                        <motion.div
                            key="zen-detail-panel"
                            className={twMerge(
                                "fixed top-0 right-0 h-full w-full sm:w-[95%] md:w-1/3 md:min-w-[450px] shadow-2xl z-50 flex flex-col",
                                "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                                "bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border-l border-grey-light/50 dark:border-neutral-700/50"
                            )}
                            initial={{x: '100%'}}
                            animate={{x: 0}}
                            exit={{x: '100%'}}
                            transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
                        >
                            <TaskDetail/>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ZenPage;
