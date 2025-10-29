// src/components/common/CodeMirrorEditor.tsx
import React, {forwardRef, memo, useEffect, useImperativeHandle, useRef, useMemo} from 'react';
import {twMerge} from 'tailwind-merge';
import Moondown from '@/moondown/moondown';
import {useAtomValue} from 'jotai';
import {appearanceSettingsAtom} from '@/store/atoms';
import {EditorView} from '@codemirror/view';

interface CodeMirrorEditorProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
    onBlur?: () => void;
    onFocus?: () => void;
}

export interface CodeMirrorEditorRef {
    focus: () => void;
    getView: () => EditorView | null;
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
    ({value, onChange, className, placeholder, readOnly = false, onBlur, onFocus}, ref) => {
        const editorContainerRef = useRef<HTMLDivElement>(null);
        const moondownInstanceRef = useRef<Moondown | null>(null);
        const appearance = useAtomValue(appearanceSettingsAtom);

        const theme = useMemo(() => {
            const darkMode = appearance?.darkMode ?? 'system';
            if (darkMode === 'system') {
                return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            return darkMode;
        }, [appearance?.darkMode]);

        useImperativeHandle(ref, () => ({
            focus: () => moondownInstanceRef.current?.focus(),
            getView: () => moondownInstanceRef.current?.getView() ?? null,
        }), []);

        useEffect(() => {
            let instance: Moondown | null = null;
            if (editorContainerRef.current) {
                instance = new Moondown(editorContainerRef.current, value, {
                    theme,
                    readOnly,
                    placeholder,
                    onChange: (update) => {
                        if (update.docChanged) {
                            onChange(update.state.doc.toString());
                        }
                    },
                    onFocus,
                    onBlur,
                });
                moondownInstanceRef.current = instance;
            }

            return () => {
                instance?.destroy();
                moondownInstanceRef.current = null;
            };
        }, []); // Empty dependency array ensures this runs only once on mount

        useEffect(() => {
            moondownInstanceRef.current?.setTheme(theme);
        }, [theme]);

        const containerClasses = twMerge(
            'cm-editor-container relative h-full w-full overflow-hidden rounded-base',
            readOnly && 'bg-grey-ultra-light/50 dark:bg-neutral-700/30',
            className
        );

        return <div ref={editorContainerRef} className={containerClasses}/>;
    }
);
CodeMirrorEditor.displayName = 'CodeMirrorEditor';

export default memo(CodeMirrorEditor);