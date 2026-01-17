import React from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { scheduledReportModalAtom, selectedEchoReportIdAtom, selectedSummaryIdAtom } from '@/store/jotai';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';

/**
 * A persistent modal that displays when a scheduled report is generated.
 * Appears in the bottom-right corner and does NOT auto-close.
 * User must manually click the close button to dismiss.
 */
const ScheduledReportModal: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [reportData, setReportData] = useAtom(scheduledReportModalAtom);
    const setSelectedEchoReportId = useSetAtom(selectedEchoReportIdAtom);
    const setSelectedSummaryId = useSetAtom(selectedSummaryIdAtom);

    const handleClose = () => {
        setReportData(null);
    };

    const handleViewFull = () => {
        if (reportData?.type === 'summary') {
            // Set the selected summary ID so SummaryView can display it
            setSelectedSummaryId(reportData.reportId);
            navigate('/summary');
        } else {
            // Set the selected echo report ID so EchoView can display it
            setSelectedEchoReportId(reportData?.reportId ?? null);
            navigate('/echo');
        }
        handleClose();
    };

    if (!reportData) return null;

    const isSummary = reportData.type === 'summary';

    return (
        <AnimatePresence>
            {reportData && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={twMerge(
                        "fixed bottom-6 right-6 z-[9999]",
                        "w-[420px] max-h-[500px]",
                        "bg-white dark:bg-neutral-800",
                        "rounded-xl shadow-2xl",
                        "border border-grey-light/50 dark:border-neutral-700",
                        "flex flex-col overflow-hidden"
                    )}
                >
                    {/* Header */}
                    <div className={twMerge(
                        "flex items-center justify-between px-4 py-3",
                        "border-b border-grey-light/50 dark:border-neutral-700",
                        isSummary
                            ? "bg-gradient-to-r from-primary/10 to-transparent dark:from-primary/20"
                            : "bg-gradient-to-r from-amber-500/10 to-transparent dark:from-amber-500/20"
                    )}>
                        <div className="flex items-center space-x-2">
                            <div className={twMerge(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                isSummary
                                    ? "bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light"
                                    : "bg-amber-500/20 text-amber-600 dark:bg-amber-500/30 dark:text-amber-400"
                            )}>
                                <Icon
                                    name={isSummary ? "sparkles" : "zap"}
                                    size={18}
                                    strokeWidth={1.5}
                                />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-grey-dark dark:text-neutral-100">
                                    {isSummary
                                        ? t('scheduledReport.dailyReportGenerated')
                                        : t('scheduledReport.echoGenerated')}
                                </h3>
                                <p className="text-[11px] text-grey-medium dark:text-neutral-400">
                                    {t('scheduledReport.generatedAt', {
                                        time: new Date(reportData.createdAt).toLocaleTimeString(undefined, {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                    })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className={twMerge(
                                "w-7 h-7 rounded-lg flex items-center justify-center",
                                "text-grey-medium hover:text-grey-dark dark:text-neutral-400 dark:hover:text-neutral-200",
                                "hover:bg-grey-light/50 dark:hover:bg-neutral-700",
                                "transition-colors"
                            )}
                            aria-label={t('common.close')}
                        >
                            <Icon name="x" size={16} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto styled-scrollbar-thin p-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {reportData.content.substring(0, 800) + (reportData.content.length > 800 ? '...' : '')}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={twMerge(
                        "flex items-center justify-end gap-2 px-4 py-3",
                        "border-t border-grey-light/50 dark:border-neutral-700",
                        "bg-grey-ultra-light/50 dark:bg-neutral-900/50"
                    )}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            className="!h-8"
                        >
                            {t('common.close')}
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={isSummary ? "file-text" : "zap"}
                            onClick={handleViewFull}
                            className="!h-8"
                        >
                            {t('scheduledReport.viewFull')}
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

ScheduledReportModal.displayName = 'ScheduledReportModal';
export default ScheduledReportModal;
