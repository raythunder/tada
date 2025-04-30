// src/components/common/CodeMirrorEditor.tsx
// @ts-expect-error - Explicit React import sometimes needed
import React, {forwardRef, memo, useEffect, useImperativeHandle, useRef} from 'react';
import {Annotation, EditorState, StateEffect} from '@codemirror/state';
import {
    drawSelection,
    dropCursor,
    EditorView,
    keymap,
    placeholder as viewPlaceholder,
    rectangularSelection
} from '@codemirror/view';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {markdown, markdownLanguage} from '@codemirror/lang-markdown';
import {languages} from '@codemirror/language-data';
import {bracketMatching, foldKeymap, indentOnInput} from '@codemirror/language';
import {autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap} from '@codemirror/autocomplete';
import {highlightSelectionMatches, searchKeymap} from '@codemirror/search';
import {lintKeymap} from '@codemirror/lint';
import {twMerge} from 'tailwind-merge';

// Define an Annotation type for external changes
const externalChangeEvent = Annotation.define<boolean>();

interface CodeMirrorEditorProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
    onBlur?: () => void;
    onFocus?: () => void; // Added onFocus prop
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
         onFocus, // Added onFocus
     }, ref) => {
        const editorContainerRef = useRef<HTMLDivElement>(null); // Ref for the outer container
        const viewRef = useRef<EditorView | null>(null);
        const onChangeRef = useRef(onChange);
        const onBlurRef = useRef(onBlur);
        const onFocusRef = useRef(onFocus); // Ref for onFocus

        const prevReadOnlyRef = useRef(readOnly);
        const prevPlaceholderRef = useRef(placeholder);

        // Update callback refs
        useEffect(() => {
            onChangeRef.current = onChange;
        }, [onChange]);
        useEffect(() => {
            onBlurRef.current = onBlur;
        }, [onBlur]);
        useEffect(() => {
            onFocusRef.current = onFocus;
        }, [onFocus]); // Update onFocus ref

        useImperativeHandle(ref, () => ({
            focus: () => {
                viewRef.current?.focus();
            },
            getView: () => viewRef.current,
        }), []);

        // Effect for Editor Setup and Teardown
        useEffect(() => {
            if (!editorContainerRef.current) return;

            const createExtensions = (currentPlaceholder?: string, currentReadOnly?: boolean) => [
                history(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                highlightSelectionMatches(),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap, // Includes Enter key handling for new lines
                    ...searchKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    ...lintKeymap,
                    indentWithTab, // Allow Tab/Shift+Tab for indentation
                ]),
                markdown({base: markdownLanguage, codeLanguages: languages, addKeymap: true}),
                EditorView.lineWrapping, // Ensure lines wrap
                EditorView.contentAttributes.of({'aria-label': 'Markdown editor content', 'role': 'textbox'}),
                EditorView.updateListener.of((update) => {
                    const isExternal = update.transactions.some(tr => tr.annotation(externalChangeEvent));
                    if (update.docChanged && !isExternal) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                    if (update.focusChanged) {
                        if (update.view.hasFocus) {
                            onFocusRef.current?.(); // Call onFocus
                        } else {
                            onBlurRef.current?.(); // Call onBlur
                        }
                    }
                }),
                EditorState.readOnly.of(currentReadOnly ?? false),
                ...(currentPlaceholder ? [viewPlaceholder(currentPlaceholder)] : []),
                // Apply custom theme via class defined in index.css
                EditorView.theme({}, {dark: document.documentElement.classList.contains('dark')}), // Basic theme, rely on index.css for specifics
                EditorView.baseTheme({ // Ensure basic editor structure styles are applied
                    "&": {height: "100%"},
                    ".cm-scroller": {overflow: "auto", height: "100%"}, // Crucial for scrolling
                    ".cm-content": {whiteSpace: "pre-wrap", wordWrap: "break-word"} // Crucial for line breaks/wrapping
                })
            ];

            const startState = EditorState.create({
                doc: value,
                extensions: createExtensions(placeholder, readOnly)
            });

            const view = new EditorView({
                state: startState,
                parent: editorContainerRef.current,
            });
            viewRef.current = view;

            prevReadOnlyRef.current = readOnly;
            prevPlaceholderRef.current = placeholder;

            return () => {
                view.destroy();
                viewRef.current = null;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []); // Mount only

        // Effect to handle EXTERNAL value changes
        useEffect(() => {
            const view = viewRef.current;
            if (view && value !== view.state.doc.toString()) {
                view.dispatch({
                    changes: {from: 0, to: view.state.doc.length, insert: value || ''},
                    annotations: externalChangeEvent.of(true)
                });
            }
        }, [value]);

        // Effect to handle dynamic prop changes
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
                view.dispatch({effects});
            }
        }, [readOnly, placeholder]);


        return (
            // Apply the theme class and other layout classes to the container
            <div
                ref={editorContainerRef}
                className={twMerge(
                    'cm-editor-container cm-theme-custom relative h-full w-full overflow-hidden rounded-md', // Apply theme class
                    'bg-glass-inset-100 dark:bg-neutral-700/30 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-inner', // Base appearance
                    'focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/60', // Focus styling on container
                    className
                )}
            />
        );
    }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
export default memo(CodeMirrorEditor);