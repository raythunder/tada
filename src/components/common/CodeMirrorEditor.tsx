// src/components/common/CodeMirrorEditor.tsx
// @ts-expect-error - Explicit React import sometimes needed
import React, { useRef, useEffect, useImperativeHandle, forwardRef, memo } from 'react';
import { EditorState, StateEffect, Annotation } from '@codemirror/state';
import { EditorView, keymap, drawSelection, dropCursor, rectangularSelection, placeholder as viewPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { bracketMatching, indentOnInput, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { cn } from "@/lib/utils"; // Use cn utility

const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13.5px',
        backgroundColor: 'transparent',
        borderRadius: 'inherit',
        color: 'hsl(var(--foreground))', // Ensure text color respects theme
    },
    '.cm-scroller': {
        fontFamily: `var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)`,
        lineHeight: '1.65',
        overflow: 'auto', // Ensure scrolling is enabled
        position: 'relative',
        backgroundColor: 'transparent !important',
        height: '100%',
        outline: 'none',
    },
    '.cm-content': {
        padding: '14px 16px',
        caretColor: 'hsl(var(--primary))',
        backgroundColor: 'transparent !important',
        outline: 'none',
    },
    '.cm-gutters': {
        backgroundColor: 'hsl(var(--secondary) / 0.5)', // Use secondary with opacity
        borderRight: '1px solid hsl(var(--border) / 0.5)',
        color: 'hsl(var(--muted-foreground))',
        paddingLeft: '8px',
        paddingRight: '4px',
        fontSize: '11px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '24px', textAlign: 'right' },
    '.cm-line': { padding: '0 4px' },
    '.cm-activeLine': { backgroundColor: 'hsl(var(--accent) / 0.5)' }, // Use accent
    '.cm-activeLineGutter': { backgroundColor: 'hsl(var(--accent) / 0.7)' },
    '.cm-placeholder': {
        color: 'hsl(var(--muted-foreground))',
        fontStyle: 'italic',
        pointerEvents: 'none',
        padding: '14px 16px',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    '.cm-foldGutter .cm-gutterElement': { padding: '0 4px 0 8px', cursor: 'pointer', textAlign: 'center', },
    '.cm-foldMarker': { display: 'inline-block', color: 'hsl(var(--muted-foreground) / 0.7)', '&:hover': { color: 'hsl(var(--muted-foreground))' }, },
    '.cm-searchMatch': { backgroundColor: 'hsl(48 96% 61% / 0.3)', outline: '1px solid hsl(48 96% 61% / 0.5)', borderRadius: '2px', },
    '.cm-searchMatch-selected': { backgroundColor: 'hsl(48 96% 61% / 0.5)', outline: '1px solid hsl(48 96% 61% / 0.8)' },
    '.cm-selectionBackground, ::selection': { backgroundColor: 'hsl(var(--primary) / 0.3) !important', }, // Use primary with opacity
    '.cm-focused': { outline: 'none !important' }, // Remove Codemirror's outline
});

const externalChangeEvent = Annotation.define<boolean>();

interface CodeMirrorEditorProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
    onBlur?: () => void;
}

export interface CodeMirrorEditorRef {
    focus: () => void;
    getView: () => EditorView | null;
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
    ({
         value,
         onChange,
         className,
         placeholder,
         readOnly = false,
         onBlur,
     }, ref) => {
        const editorRef = useRef<HTMLDivElement>(null);
        const viewRef = useRef<EditorView | null>(null);
        const onChangeRef = useRef(onChange);
        const onBlurRef = useRef(onBlur);
        const prevReadOnlyRef = useRef(readOnly);
        const prevPlaceholderRef = useRef(placeholder);

        useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
        useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);

        useImperativeHandle(ref, () => ({
            focus: () => { viewRef.current?.focus(); },
            getView: () => viewRef.current,
        }), []);

        useEffect(() => {
            if (!editorRef.current) return;

            const createExtensions = (currentPlaceholder?: string, currentReadOnly?: boolean) => [
                history(), drawSelection(), dropCursor(), EditorState.allowMultipleSelections.of(true), indentOnInput(),
                bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), highlightSelectionMatches(),
                keymap.of([ ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...lintKeymap, indentWithTab, ]),
                markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
                EditorView.lineWrapping, EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor content' }),
                EditorView.updateListener.of((update) => {
                    const isExternal = update.transactions.some(tr => tr.annotation(externalChangeEvent));
                    if (update.docChanged && !isExternal) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                    if (update.focusChanged && !update.view.hasFocus) {
                        onBlurRef.current?.();
                    }
                }),
                EditorState.readOnly.of(currentReadOnly ?? false),
                ...(currentPlaceholder ? [viewPlaceholder(currentPlaceholder)] : []),
                editorTheme, // Apply custom theme
                // Ensure Enter key works correctly
                keymap.of(defaultKeymap)
            ];

            const startState = EditorState.create({
                doc: value,
                extensions: createExtensions(placeholder, readOnly)
            });

            const view = new EditorView({
                state: startState,
                parent: editorRef.current,
            });
            viewRef.current = view;
            prevReadOnlyRef.current = readOnly;
            prevPlaceholderRef.current = placeholder;

            return () => {
                view.destroy();
                viewRef.current = null;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useEffect(() => {
            const view = viewRef.current;
            if (view && value !== view.state.doc.toString()) {
                view.dispatch({
                    changes: { from: 0, to: view.state.doc.length, insert: value || '' },
                    annotations: externalChangeEvent.of(true)
                });
            }
        }, [value]);

        useEffect(() => {
            const view = viewRef.current;
            if (!view) return;
            const effects: StateEffect<unknown>[] = [];
            if (readOnly !== prevReadOnlyRef.current) {
                effects.push(StateEffect.reconfigure.of(EditorState.readOnly.of(readOnly)));
                prevReadOnlyRef.current = readOnly;
            }
            if (placeholder !== prevPlaceholderRef.current) {
                effects.push(StateEffect.reconfigure.of(placeholder ? [viewPlaceholder(placeholder)] : []));
                prevPlaceholderRef.current = placeholder;
            }
            if (effects.length > 0) {
                view.dispatch({ effects });
            }
        }, [readOnly, placeholder]);


        return (
            // Container uses cn and provides base structure/styles
            <div
                ref={editorRef}
                className={cn(
                    'cm-editor-container relative h-full w-full overflow-hidden rounded-md', // Layout
                    'bg-background/30 dark:bg-black/10 backdrop-blur-sm', // Background (slightly transparent)
                    'border border-border/50', // Subtle border
                    'focus-within:ring-1 focus-within:ring-ring focus-within:border-border', // Focus ring via parent
                    className // External overrides
                )}
            />
        );
    }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
export default memo(CodeMirrorEditor);