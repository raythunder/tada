// src/components/settings/SettingsModal.tsx
import React, {memo, useCallback, useMemo, useState} from 'react';
import {useAtom, useAtomValue, useSetAtom} from 'jotai';
import {
    addNotificationAtom,
    aiSettingsAtom,
    appearanceSettingsAtom,
    DarkModeOption,
    defaultAISettingsForApi,
    defaultAppearanceSettingsForApi,
    DefaultNewTaskDueDate,
    defaultPreferencesSettingsForApi,
    isSettingsOpenAtom,
    preferencesSettingsAtom,
    settingsSelectedTabAtom,
    userListNamesAtom,
} from '@/store/atoms';
import {AIProviderSettings, AISettings as AISettingsType, SettingsTab} from '@/types';
import Icon from '../common/Icon';
import Button from '../common/Button';
import {twMerge} from 'tailwind-merge';
import {IconName} from "@/components/common/IconMap";
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as RadixSwitch from '@radix-ui/react-switch';
import {
    APP_THEMES,
    APP_VERSION,
    CHANGELOG_HTML,
    PRIVACY_POLICY_HTML,
    TERMS_OF_USE_HTML
} from '@/config/themes';
import {useTranslation} from "react-i18next";
import {AIProvider, AI_PROVIDERS, AIModel} from "@/config/aiProviders";
import {fetchProviderModels} from "@/services/aiService";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";

// ... (SettingsItem, SettingsRow, DarkModeSelector, ColorSwatch, AppearanceSettings, PreferencesSettings components are unchanged)
interface SettingsItem {
    id: SettingsTab;
    labelKey: string;
    icon: IconName;
}

const settingsSections: SettingsItem[] = [
    {id: 'appearance', labelKey: 'settings.appearance.title', icon: 'settings'},
    {id: 'preferences', labelKey: 'settings.preferences.title', icon: 'sliders'},
    {id: 'ai', labelKey: 'settings.ai.title', icon: 'sparkles'},
    {id: 'about', labelKey: 'settings.about.title', icon: 'info'},
];

const SettingsRow: React.FC<{
    label: string,
    value?: React.ReactNode,
    action?: React.ReactNode,
    children?: React.ReactNode,
    description?: string,
    htmlFor?: string,
}> = memo(({label, value, action, children, description, htmlFor}) => (
    <div className="flex justify-between items-center py-3 min-h-[48px]">
        <div className="flex-1 mr-4">
            <label htmlFor={htmlFor}
                   className="text-[13px] text-grey-dark dark:text-neutral-200 font-normal block cursor-default">{label}</label>
            {description &&
                <p className="text-[11px] text-grey-medium dark:text-neutral-400 mt-0.5 font-light">{description}</p>}
        </div>
        <div
            className="text-[13px] text-grey-dark dark:text-neutral-200 font-light flex items-center space-x-2 flex-shrink-0">
            {value && !action && !children &&
                <span className="text-grey-medium dark:text-neutral-300 text-right font-normal">{value}</span>}
            {action && !children && <div className="flex justify-end">{action}</div>}
            {children && <div className="flex justify-end items-center space-x-2">{children}</div>}
        </div>
    </div>
));
SettingsRow.displayName = 'SettingsRow';

const DarkModeSelector: React.FC<{ value: DarkModeOption; onChange: (value: DarkModeOption) => void; }> = memo(({
                                                                                                                    value,
                                                                                                                    onChange
                                                                                                                }) => {
    const {t} = useTranslation();
    const options: { value: DarkModeOption; label: string; icon: IconName }[] = [
        {value: 'light', label: t('settings.appearance.darkModeOptions.light'), icon: 'sun'},
        {value: 'dark', label: t('settings.appearance.darkModeOptions.dark'), icon: 'moon'},
        {value: 'system', label: t('settings.appearance.darkModeOptions.system'), icon: 'settings'},
    ];

    return (
        <RadioGroup.Root
            value={value}
            onValueChange={onChange}
            className="flex space-x-1 p-0.5 bg-grey-ultra-light dark:bg-neutral-700 rounded-base"
            aria-label="Appearance mode"
        >
            {options.map(option => (
                <RadioGroup.Item
                    key={option.value}
                    value={option.value}
                    id={`darkMode-${option.value}`}
                    className={twMerge(
                        "flex-1 flex items-center justify-center px-2.5 py-1 h-7 rounded-[4px] text-[12px] font-normal transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                        value === option.value
                            ? "bg-white dark:bg-neutral-600 text-primary dark:text-primary-light shadow-sm"
                            : "text-grey-medium dark:text-neutral-400 hover:text-grey-dark dark:hover:text-neutral-200"
                    )}
                >
                    <Icon name={option.icon} size={14} strokeWidth={1.5} className="mr-1.5 opacity-80"/>
                    {option.label}
                </RadioGroup.Item>
            ))}
        </RadioGroup.Root>
    );
});
DarkModeSelector.displayName = 'DarkModeSelector';


const ColorSwatch: React.FC<{
    colorValue: string;
    selected: boolean;
    onClick: () => void;
    themeName: string;
}> = memo(({colorValue, selected, onClick, themeName}) => (
    <button
        type="button"
        onClick={onClick}
        className={twMerge(
            "w-7 h-7 rounded-full border-2 transition-all duration-150 ease-in-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-grey-deep",
            selected ? "ring-2 ring-offset-1 ring-current" : "border-transparent hover:border-grey-medium/50 dark:hover:border-neutral-400/50"
        )}
        style={{backgroundColor: `hsl(${colorValue})`, borderColor: selected ? `hsl(${colorValue})` : undefined}}
        aria-label={`Select ${themeName} theme`}
        aria-pressed={selected}
    />
));
ColorSwatch.displayName = 'ColorSwatch';

const defaultAppearanceSettingsFromAtoms = defaultAppearanceSettingsForApi();

const AppearanceSettings: React.FC = memo(() => {
    const {t} = useTranslation();
    const [appearance, setAppearance] = useAtom(appearanceSettingsAtom);

    if (!appearance) {
        return <div className="p-4 text-center text-grey-medium">Loading appearance settings...</div>;
    }

    const currentAppearance = appearance ?? defaultAppearanceSettingsFromAtoms;

    const handleThemeChange = (themeId: string) => setAppearance(s => ({
        ...(s ?? defaultAppearanceSettingsFromAtoms),
        themeId
    }));
    const handleDarkModeChange = (mode: DarkModeOption) => setAppearance(s => ({
        ...(s ?? defaultAppearanceSettingsFromAtoms),
        darkMode: mode
    }));

    return (
        <div className="space-y-6">
            <SettingsRow label={t('settings.appearance.mode')} description={t('settings.appearance.modeDescription')}>
                <DarkModeSelector value={currentAppearance.darkMode} onChange={handleDarkModeChange}/>
            </SettingsRow>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>

            <SettingsRow label={t('settings.appearance.themeColor')}
                         description={t('settings.appearance.themeColorDescription')}>
                <div className="flex space-x-2">
                    {APP_THEMES.map(theme => (
                        <ColorSwatch
                            key={theme.id}
                            colorValue={theme.colors.primary}
                            selected={currentAppearance.themeId === theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            themeName={t(theme.nameKey)}
                        />
                    ))}
                </div>
            </SettingsRow>
        </div>
    );
});
AppearanceSettings.displayName = 'AppearanceSettings';

const defaultPreferencesFromAtoms = defaultPreferencesSettingsForApi();

const renderSelect = (id: string, value: string | null, onChange: (value: string) => void, options: {
    value: string,
    label: string
}[], placeholder: string) => (
    <Select.Root value={value ?? undefined} onValueChange={onChange}>
        <Select.Trigger
            id={id}
            className="flex items-center justify-between w-[160px] h-8 px-3 text-[13px] font-light rounded-base bg-grey-ultra-light dark:bg-neutral-700 text-grey-dark dark:text-neutral-100 hover:bg-grey-light dark:hover:bg-neutral-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label={placeholder}
        >
            <Select.Value placeholder={placeholder}/>
            <Select.Icon className="text-grey-medium dark:text-neutral-400">
                <Icon name="chevron-down" size={14} strokeWidth={1.5}/>
            </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
            <Select.Content
                className="z-[60] min-w-[160px] bg-white dark:bg-neutral-750 rounded-base shadow-popover p-1 overflow-hidden animate-popoverShow"
                position="popper" sideOffset={5}
            >
                <Select.Viewport>
                    {options.map(opt => (
                        <Select.Item
                            key={opt.value}
                            value={opt.value}
                            className="relative flex items-center h-7 px-3 text-[13px] font-light rounded-[4px] select-none cursor-pointer data-[highlighted]:bg-grey-ultra-light dark:data-[highlighted]:bg-neutral-600 data-[highlighted]:outline-none text-grey-dark dark:text-neutral-100 data-[state=checked]:text-primary dark:data-[state=checked]:text-primary-light"
                        >
                            <Select.ItemText>{opt.label}</Select.ItemText>
                            <Select.ItemIndicator className="absolute right-2">
                                <Icon name="check" size={12} strokeWidth={2}/>
                            </Select.ItemIndicator>
                        </Select.Item>
                    ))}
                </Select.Viewport>
            </Select.Content>
        </Select.Portal>
    </Select.Root>
);

const PreferencesSettings: React.FC = memo(() => {
    const {t} = useTranslation();
    const [preferences, setPreferences] = useAtom(preferencesSettingsAtom);
    const userLists = useAtomValue(userListNamesAtom) ?? [];

    if (!preferences) {
        return <div className="p-4 text-center text-grey-medium">Loading preferences...</div>;
    }
    const currentPreferences = preferences ?? defaultPreferencesFromAtoms;


    const handleLanguageChange = (value: string) => setPreferences(p => ({
        ...(p ?? defaultPreferencesFromAtoms),
        language: value as 'en' | 'zh-CN'
    }));
    const handleDefaultDueDateChange = (value: string) => setPreferences(p => ({
        ...(p ?? defaultPreferencesFromAtoms),
        defaultNewTaskDueDate: value === 'none' ? null : value as DefaultNewTaskDueDate
    }));
    const handleDefaultPriorityChange = (value: string) => setPreferences(p => ({
        ...(p ?? defaultPreferencesFromAtoms),
        defaultNewTaskPriority: value === 'none' ? null : parseInt(value, 10)
    }));
    const handleDefaultListChange = (value: string) => setPreferences(p => ({
        ...(p ?? defaultPreferencesFromAtoms),
        defaultNewTaskList: value
    }));
    const handleConfirmDeletionsChange = (checked: boolean) => setPreferences(p => ({
        ...(p ?? defaultPreferencesFromAtoms),
        confirmDeletions: checked
    }));


    const dueDateOptions = [
        {value: 'none', label: t('settings.preferences.dueDateOptions.none')},
        {value: 'today', label: t('settings.preferences.dueDateOptions.today')},
        {value: 'tomorrow', label: t('settings.preferences.dueDateOptions.tomorrow')},
    ];
    const priorityOptions = [
        {value: 'none', label: t('settings.preferences.priorityOptions.none')},
        {value: '1', label: t('settings.preferences.priorityOptions.1')},
        {value: '2', label: t('settings.preferences.priorityOptions.2')},
        {value: '3', label: t('settings.preferences.priorityOptions.3')},
    ];
    const listOptions = useMemo(() => {
        return userLists.map(l => ({
            value: l,
            label: l === 'Inbox' ? t('sidebar.inbox') : l
        }));
    }, [userLists, t]);

    return (
        <div className="space-y-0">
            <SettingsRow label={t('settings.preferences.language')}
                         description={t('settings.preferences.languageDescription')}
                         htmlFor="languageSelect">
                {renderSelect('languageSelect', currentPreferences.language, handleLanguageChange, [
                    {value: 'en', label: t('settings.preferences.languages.en')},
                    {value: 'zh-CN', label: t('settings.preferences.languages.zh-CN')}
                ], "Select Language")}
            </SettingsRow>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.preferences.defaultDueDate')}
                         description={t('settings.preferences.defaultDueDateDescription')}
                         htmlFor="defaultDueDateSelect">
                {renderSelect('defaultDueDateSelect', currentPreferences.defaultNewTaskDueDate, handleDefaultDueDateChange, dueDateOptions, "Select Due Date")}
            </SettingsRow>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.preferences.defaultPriority')}
                         description={t('settings.preferences.defaultPriorityDescription')}
                         htmlFor="defaultPrioritySelect">
                {renderSelect('defaultPrioritySelect', currentPreferences.defaultNewTaskPriority?.toString() ?? 'none', handleDefaultPriorityChange, priorityOptions, "Select Priority")}
            </SettingsRow>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.preferences.defaultList')}
                         description={t('settings.preferences.defaultListDescription')}
                         htmlFor="defaultListSelect">
                {renderSelect('defaultListSelect', currentPreferences.defaultNewTaskList, handleDefaultListChange, listOptions, "Select List")}
            </SettingsRow>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.preferences.confirmDeletions')}
                         description={t('settings.preferences.confirmDeletionsDescription')}
                         htmlFor="confirmDeletionsToggle">
                <RadixSwitch.Root
                    id="confirmDeletionsToggle"
                    checked={currentPreferences.confirmDeletions}
                    onCheckedChange={handleConfirmDeletionsChange}
                    aria-label="Toggle confirm deletions"
                    className={twMerge(
                        "custom-switch-track",
                        currentPreferences.confirmDeletions ? "custom-switch-track-on" : "custom-switch-track-off"
                    )}
                >
                    <RadixSwitch.Thumb
                        className={twMerge("custom-switch-thumb", currentPreferences.confirmDeletions ? "custom-switch-thumb-on" : "custom-switch-thumb-off")}/>
                </RadixSwitch.Root>
            </SettingsRow>
        </div>
    );
});
PreferencesSettings.displayName = 'PreferencesSettings';

const defaultAISettingsFromAtoms = defaultAISettingsForApi();

const SortableItem: React.FC<{ item: { id: string; name: string }; isDragging: boolean }> = ({ item, isDragging }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center bg-grey-ultra-light dark:bg-neutral-700 rounded-base p-2 text-sm"
        >
            <button
                {...listeners}
                className="cursor-grab touch-none mr-3 text-grey-medium dark:text-neutral-400 hover:text-grey-dark dark:hover:text-neutral-200"
                aria-label={`Reorder ${item.name}`}
            >
                <Icon name="grip-vertical" size={16} strokeWidth={1.5} />
            </button>
            <span className="text-grey-dark dark:text-neutral-100 font-light">{item.name}</span>
        </div>
    );
};

const AISettings: React.FC = memo(() => {
    const { t } = useTranslation();
    const [aiSettings, setAISettings] = useAtom(aiSettingsAtom);
    const addNotification = useSetAtom(addNotificationAtom);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    if (!aiSettings) {
        return <div className="p-4 text-center text-grey-medium">Loading AI settings...</div>;
    }

    const currentSettings = aiSettings ?? defaultAISettingsFromAtoms;
    const { provider: currentProviderId, providerSettings, providerOrder, fetchedModels = {} } = currentSettings;
    const currentProvider = AI_PROVIDERS.find(p => p.id === currentProviderId) ?? AI_PROVIDERS[0];
    const currentProviderSettings = providerSettings[currentProviderId] ?? { apiKey: '', model: '' };

    const apiKeyDescription = currentProvider.id === 'custom'
        ? t('settings.ai.apiKeyDescription_custom')
        : t('settings.ai.apiKeyDescription', { providerName: currentProvider.name });

    const handleProviderChange = (providerId: AIProvider['id']) => {
        setAISettings(s => {
            const settings = s ?? defaultAISettingsForApi();
            const existingProviderSettings = settings.providerSettings[providerId];
            if (existingProviderSettings?.model) {
                return { ...settings, provider: providerId };
            }
            const newProvider = AI_PROVIDERS.find(p => p.id === providerId);
            const defaultModel = newProvider?.models[0]?.id ?? '';
            return {
                ...settings,
                provider: providerId,
                providerSettings: {
                    ...settings.providerSettings,
                    [providerId]: {
                        ...(settings.providerSettings[providerId] ?? { apiKey: '' }),
                        model: defaultModel,
                    },
                },
            };
        });
    };

    const handleSettingChange = (field: keyof AIProviderSettings, value: string) => {
        setAISettings(s => {
            const settings = s ?? defaultAISettingsForApi();
            const providerSettings = settings.providerSettings[currentProviderId] ?? { apiKey: '', model: '' };
            return {
                ...settings,
                providerSettings: {
                    ...settings.providerSettings,
                    [currentProviderId]: { ...providerSettings, [field]: value },
                },
            };
        });
    };

    const handleFetchModels = useCallback(async () => {
        if (!currentProvider || isFetchingModels || !currentProviderSettings.apiKey) {
            if (!currentProviderSettings.apiKey) {
                addNotification({ type: 'error', message: "API key is required to fetch models." });
            }
            return;
        }
        setIsFetchingModels(true);
        try {
            const models = await fetchProviderModels({
                provider: currentProviderId,
                apiKey: currentProviderSettings.apiKey,
                baseUrl: currentProviderSettings.baseUrl,
            });
            setAISettings(prev => {
                const prevSettings = prev ?? defaultAISettingsForApi();
                return {
                    ...prevSettings,
                    fetchedModels: {
                        ...(prevSettings.fetchedModels ?? {}),
                        [currentProviderId]: models,
                    }
                };
            });
            addNotification({ type: 'success', message: `Successfully fetched ${models.length} models for ${currentProvider.name}.` });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addNotification({ type: 'error', message: `Failed to fetch models: ${errorMessage}` });
        } finally {
            setIsFetchingModels(false);
        }
    }, [currentProvider, currentProviderId, currentProviderSettings, isFetchingModels, setAISettings, addNotification]);

    const handleProviderDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingId(null);
        if (over && active.id !== over.id) {
            setAISettings(s => {
                const settings = s ?? defaultAISettingsFromAtoms;
                const oldOrder = settings.providerOrder;
                const configuredIds = oldOrder.filter(id => !!settings.providerSettings[id]?.apiKey);
                const unconfiguredIds = oldOrder.filter(id => !settings.providerSettings[id]?.apiKey);

                const oldIndex = configuredIds.indexOf(active.id as AIProvider['id']);
                const newIndex = configuredIds.indexOf(over.id as AIProvider['id']);

                if (oldIndex === -1 || newIndex === -1) return settings;

                const reorderedConfigured = arrayMove(configuredIds, oldIndex, newIndex);
                return { ...settings, providerOrder: [...reorderedConfigured, ...unconfiguredIds] };
            });
        }
    };

    const providerOptions = useMemo(() => providerOrder
            .map(id => AI_PROVIDERS.find(p => p.id === id))
            .filter((p): p is AIProvider => !!p)
            .map(p => ({ value: p.id, label: p.name })),
        [providerOrder]);

    const configuredProviders = useMemo(() => providerOrder
            .map(id => AI_PROVIDERS.find(p => p.id === id))
            .filter((p): p is AIProvider => !!p && !!providerSettings[p.id]?.apiKey),
        [providerOrder, providerSettings]);

    const modelOptions = useMemo(() => {
        const providerFetchedModels = (fetchedModels ?? {})[currentProvider.id] ?? [];
        const combinedModels = [...currentProvider.models, ...providerFetchedModels];
        const uniqueModels = Array.from(new Map(combinedModels.map(m => [m.id, m])).values());

        const modelOrder = currentProviderSettings.modelOrder;
        if (modelOrder) {
            uniqueModels.sort((a, b) => {
                const indexA = modelOrder.indexOf(a.id);
                const indexB = modelOrder.indexOf(b.id);
                if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        } else {
            uniqueModels.sort((a, b) => a.name.localeCompare(b.name));
        }
        return uniqueModels.map(m => ({ value: m.id, label: m.name, id: m.id, name: m.name }));
    }, [currentProvider, fetchedModels, currentProviderSettings.modelOrder]);

    const handleModelDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggingId(null);
        if (over && active.id !== over.id) {
            setAISettings(s => {
                const settings = s ?? defaultAISettingsForApi();
                const oldOrder = modelOptions.map(m => m.id);
                const oldIndex = oldOrder.indexOf(active.id as string);
                const newIndex = oldOrder.indexOf(over.id as string);
                const newOrder = arrayMove(oldOrder, oldIndex, newIndex);

                return {
                    ...settings,
                    providerSettings: {
                        ...settings.providerSettings,
                        [currentProviderId]: {
                            ...(settings.providerSettings[currentProviderId] ?? { apiKey: '', model: '' }),
                            modelOrder: newOrder,
                        },
                    },
                };
            });
        }
    };

    return (
        <div className="space-y-0">
            <SettingsRow label={t('settings.ai.provider')} description={t('settings.ai.providerDescription')} htmlFor="aiProviderSelect">
                {renderSelect('aiProviderSelect', currentProviderId, (id) => handleProviderChange(id as AIProvider['id']), providerOptions, "Select Provider")}
            </SettingsRow>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.ai.apiKey')} description={apiKeyDescription} htmlFor="apiKeyInput">
                <input
                    id="apiKeyInput"
                    type="password"
                    value={currentProviderSettings.apiKey}
                    onBlur={handleFetchModels}
                    onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                    placeholder={t('settings.ai.apiKeyPlaceholder')}
                    className={twMerge(
                        "w-[240px] h-8 px-3 text-[13px] font-light rounded-base focus:outline-none",
                        "bg-grey-ultra-light dark:bg-neutral-700",
                        "placeholder:text-grey-medium dark:placeholder:text-neutral-400",
                        "text-grey-dark dark:text-neutral-100 transition-colors duration-200 ease-in-out",
                        "border border-grey-light dark:border-neutral-600 focus:border-primary dark:focus:border-primary-light"
                    )}
                />
            </SettingsRow>
            {currentProvider.requiresBaseUrl && (
                <>
                    <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
                    <SettingsRow label={t('settings.ai.baseUrl')} description={t('settings.ai.baseUrlDescription')} htmlFor="baseUrlInput">
                        <input
                            id="baseUrlInput"
                            type="url"
                            value={currentProviderSettings.baseUrl ?? ''}
                            onChange={(e) => handleSettingChange('baseUrl', e.target.value)}
                            placeholder={t('settings.ai.baseUrlPlaceholder')}
                            className={twMerge(
                                "w-[240px] h-8 px-3 text-[13px] font-light rounded-base focus:outline-none",
                                "bg-grey-ultra-light dark:bg-neutral-700",
                                "placeholder:text-grey-medium dark:placeholder:text-neutral-400",
                                "text-grey-dark dark:text-neutral-100 transition-colors duration-200 ease-in-out",
                                "border border-grey-light dark:border-neutral-600 focus:border-primary dark:focus:border-primary-light"
                            )}
                        />
                    </SettingsRow>
                </>
            )}
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.ai.model')} description={t('settings.ai.modelDescription')} htmlFor="aiModelSelect">
                <div className="flex items-center space-x-2">
                    {currentProvider.id === 'custom' ? (
                        <input
                            id="aiModelInput"
                            type="text"
                            value={currentProviderSettings.model}
                            onChange={(e) => handleSettingChange('model', e.target.value)}
                            placeholder="e.g., gpt-4"
                            className={twMerge( "w-[160px] h-8 px-3 text-[13px] font-light rounded-base focus:outline-none", "bg-grey-ultra-light dark:bg-neutral-700", "placeholder:text-grey-medium dark:placeholder:text-neutral-400", "text-grey-dark dark:text-neutral-100 transition-colors duration-200 ease-in-out", "border border-grey-light dark:border-neutral-600 focus:border-primary dark:focus:border-primary-light")}
                        />
                    ) : (
                        renderSelect('aiModelSelect', currentProviderSettings.model, (value) => handleSettingChange('model', value), modelOptions, "Select Model")
                    )}
                    {currentProvider.listModelsEndpoint && (
                        <Button variant="ghost" size="icon" icon="refresh-cw" onClick={handleFetchModels}
                                disabled={isFetchingModels || !currentProviderSettings.apiKey} loading={isFetchingModels}
                                className="w-7 h-7 text-grey-medium dark:text-neutral-400"
                                aria-label="Fetch latest models"/>
                    )}
                </div>
            </SettingsRow>
            {modelOptions.length > 1 && currentProvider.id !== 'custom' &&
                <div className="py-3">
                    <p className="text-[11px] text-grey-medium dark:text-neutral-400 mt-0.5 font-light">Drag to reorder models for the current provider.</p>
                    <div className="mt-2 max-h-40 overflow-y-auto styled-scrollbar-thin border border-grey-light dark:border-neutral-700 rounded-lg p-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setDraggingId(e.active.id as string)} onDragEnd={handleModelDragEnd}>
                            <SortableContext items={modelOptions.map(m => m.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                    {modelOptions.map(model => (<SortableItem key={model.id} item={model} isDragging={draggingId === model.id} />))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            }
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <div className="py-3">
                <div className="flex-1 mr-4">
                    <label className="text-[13px] text-grey-dark dark:text-neutral-200 font-normal block cursor-default">{t('settings.ai.providerPriority.title')}</label>
                    <p className="text-[11px] text-grey-medium dark:text-neutral-400 mt-0.5 font-light">{t('settings.ai.providerPriority.description')}</p>
                </div>
                <div className="mt-3 max-h-60 overflow-y-auto styled-scrollbar-thin border border-grey-light dark:border-neutral-700 rounded-lg p-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setDraggingId(e.active.id as string)} onDragEnd={handleProviderDragEnd}>
                        <SortableContext items={configuredProviders.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {configuredProviders.length > 0 ? configuredProviders.map(provider => (<SortableItem key={provider.id} item={provider} isDragging={draggingId === provider.id} />))
                                    : <p className="text-center text-xs text-grey-medium p-2">No providers with API keys configured.</p>}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        </div>
    );
});
AISettings.displayName = 'AISettings';


// ... (AboutSettings and SettingsModal components are unchanged)
const AboutSettings: React.FC = memo(() => {
    const {t} = useTranslation();
    const [activeContent, setActiveContent] = useState<'changelog' | 'privacy' | 'terms' | null>(null);

    const contentMap = useMemo(() => ({
        changelog: {title: t('settings.about.changelog'), html: CHANGELOG_HTML},
        privacy: {title: t('settings.about.privacyPolicy'), html: PRIVACY_POLICY_HTML},
        terms: {title: t('settings.about.termsOfUse'), html: TERMS_OF_USE_HTML},
    }), [t]);

    const renderContent = () => {
        if (!activeContent || !contentMap[activeContent]) return null;
        return (
            <div
                className="mt-4 p-4 rounded-base border border-grey-light dark:border-neutral-700 bg-grey-ultra-light/50 dark:bg-neutral-750/50 max-h-[300px] overflow-y-auto styled-scrollbar-thin">
                <h4 className="text-md font-semibold text-grey-dark dark:text-neutral-100 mb-3">{contentMap[activeContent].title}</h4>
                <div dangerouslySetInnerHTML={{__html: contentMap[activeContent].html}}/>
            </div>
        );
    };

    return (
        <div className="space-y-0">
            <SettingsRow label={t('settings.about.version')} value={APP_VERSION}/>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.about.changelog')} action={
                <Button variant="link" size="sm"
                        onClick={() => setActiveContent(activeContent === 'changelog' ? null : 'changelog')}>
                    {activeContent === 'changelog' ? t('settings.about.hide') : t('settings.about.view')}
                </Button>
            }/>
            {activeContent === 'changelog' && renderContent()}
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.about.privacyPolicy')} action={
                <Button variant="link" size="sm"
                        onClick={() => setActiveContent(activeContent === 'privacy' ? null : 'privacy')}>
                    {activeContent === 'privacy' ? t('settings.about.hide') : t('settings.about.view')}
                </Button>
            }/>
            {activeContent === 'privacy' && renderContent()}
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.about.termsOfUse')} action={
                <Button variant="link" size="sm"
                        onClick={() => setActiveContent(activeContent === 'terms' ? null : 'terms')}>
                    {activeContent === 'terms' ? t('settings.about.hide') : t('settings.about.view')}
                </Button>
            }/>
            {activeContent === 'terms' && renderContent()}
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.about.feedback')}
                         description={t('settings.about.feedbackDescription')}>
                <Button as="a" href="mailto:feedback@tada-app.example.com?subject=Tada App Feedback"
                        variant="secondary"
                        size="sm" icon="mail">
                    {t('settings.about.sendEmail')}
                </Button>
            </SettingsRow>
            <div className="h-px bg-grey-light dark:bg-neutral-700 my-0"></div>
            <SettingsRow label={t('settings.about.reportIssue')}
                         description={t('settings.about.reportIssueDescription')}>
                <Button as="a" href="mailto:support@tada-app.example.com?subject=Tada App Issue Report"
                        variant="secondary" size="sm" icon="alert-circle"
                        className="text-warning hover:!bg-warning/10 dark:text-warning dark:hover:!bg-warning/20">
                    {t('settings.about.reportButton')}
                </Button>
            </SettingsRow>
        </div>
    );
});
AboutSettings.displayName = 'AboutSettings';


const SettingsModal: React.FC = () => {
    const {t} = useTranslation();
    const [isOpen, setIsSettingsOpen] = useAtom(isSettingsOpenAtom);
    const [selectedTab, setSelectedTab] = useAtom(settingsSelectedTabAtom);
    const handleOpenChange = useCallback((open: boolean) => {
        setIsSettingsOpen(open);
    }, [setIsSettingsOpen]);
    const handleTabClick = useCallback((id: SettingsTab) => setSelectedTab(id), [setSelectedTab]);
    const renderContent = useMemo(() => {
        switch (selectedTab) {
            case 'appearance':
                return <AppearanceSettings/>;
            case 'preferences':
                return <PreferencesSettings/>;
            case 'ai':
                return <AISettings />;
            case 'about':
                return <AboutSettings/>;
            default:
                return <AppearanceSettings/>;
        }
    }, [selectedTab]);
    const modalTitle = useMemo(() => {
        const section = settingsSections.find(s => s.id === selectedTab);
        return section ? t(section.labelKey) : t('settings.title');
    }, [selectedTab, t]);

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className="fixed inset-0 bg-grey-dark/30 dark:bg-black/50 data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut z-40 backdrop-blur-sm"/>
                <Dialog.Content
                    className={twMerge(
                        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
                        "bg-white dark:bg-neutral-800 w-full max-w-5xl h-[85vh] max-h-[750px]", // Changed size
                        "rounded-base shadow-modal flex overflow-hidden",
                        "data-[state=open]:animate-modalShow data-[state=closed]:animate-modalHide"
                    )}
                    aria-describedby={undefined}
                    onEscapeKeyDown={() => handleOpenChange(false)}
                >
                    <div
                        className="w-52 bg-grey-ultra-light/80 dark:bg-grey-deep/80 backdrop-blur-sm p-3 flex flex-col shrink-0 border-r border-grey-light/50 dark:border-neutral-700/50">
                        <nav className="space-y-0.5 flex-1 mt-2">
                            {settingsSections.map((item) => (
                                <button key={item.id} onClick={() => handleTabClick(item.id)}
                                        className={twMerge('flex items-center w-full px-3 py-2 h-8 text-[13px] rounded-base transition-colors duration-200 ease-in-out',
                                            selectedTab === item.id
                                                ? 'bg-grey-light text-primary dark:bg-primary-dark/30 dark:text-primary-light font-normal'
                                                : 'text-grey-dark dark:text-neutral-200 font-light hover:bg-grey-light dark:hover:bg-neutral-700 hover:text-grey-dark dark:hover:text-neutral-100',
                                            'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-grey-ultra-light dark:focus-visible:ring-offset-grey-deep'
                                        )} aria-current={selectedTab === item.id ? 'page' : undefined}>
                                    <Icon name={item.icon} size={16} strokeWidth={1}
                                          className="mr-2.5 opacity-90"
                                          aria-hidden="true"/>
                                    <span>{t(item.labelKey)}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-neutral-800 relative">
                        <div
                            className="flex items-center justify-between px-6 py-4 border-b border-grey-light dark:border-neutral-700 flex-shrink-0 h-[60px]">
                            <Dialog.Title
                                className="text-[16px] font-normal text-grey-dark dark:text-neutral-100">{modalTitle}</Dialog.Title>
                            <Dialog.Close asChild>
                                <Button variant="ghost" size="icon" icon="x"
                                        className="text-grey-medium dark:text-neutral-400 hover:bg-grey-light dark:hover:bg-neutral-700 hover:text-grey-dark dark:hover:text-neutral-100 w-7 h-7 -mr-2"
                                        iconProps={{strokeWidth: 1.5, size: 12}} aria-label="Close settings"/>
                            </Dialog.Close>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto styled-scrollbar">{renderContent}</div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
SettingsModal.displayName = 'SettingsModal';
export default SettingsModal;