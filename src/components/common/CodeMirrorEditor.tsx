// src/components/common/CodeMirrorEditor.tsx
// @ts-expect-error - Explicit React import sometimes needed
import React, { useRef, useEffect, useImperativeHandle, forwardRef, memo } from 'react';
import { EditorState, StateEffect, Annotation } from '@codemirror/state'; // Import Facet just in case, though not directly used for reading placeholder here
import { EditorView, keymap, drawSelection, dropCursor, rectangularSelection, placeholder as viewPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { bracketMatching, indentOnInput, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { twMerge } from 'tailwind-merge';

// Consistent Editor Theme definition (remains the same)
const editorTheme = EditorView.theme({
    '&': { height: '100%', fontSize: '13.5px', backgroundColor: 'transparent', borderRadius: 'inherit', },
    '.cm-scroller': { fontFamily: `var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)`, lineHeight: '1.65', overflow: 'auto', position: 'relative', backgroundColor: 'transparent !important', height: '100%', outline: 'none', },
    '.cm-content': { padding: '14px 16px', caretColor: 'hsl(var(--primary-h), var(--primary-s), var(--primary-l))', backgroundColor: 'transparent !important', outline: 'none', },
    '.cm-gutters': { backgroundColor: 'hsla(220, 40%, 98%, 0.65)', borderRight: '1px solid hsla(210, 20%, 85%, 0.4)', color: 'hsl(210, 9%, 55%)', paddingLeft: '8px', paddingRight: '4px', fontSize: '11px', userSelect: 'none', WebkitUserSelect: 'none', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '24px', textAlign: 'right' },
    '.cm-line': { padding: '0 4px' },
    '.cm-activeLine': { backgroundColor: 'hsla(var(--primary-h), var(--primary-s), 50%, 0.10)' },
    '.cm-activeLineGutter': { backgroundColor: 'hsla(var(--primary-h), var(--primary-s), 50%, 0.15)' },
    '.cm-placeholder': { color: 'hsl(210, 9%, 60%)', fontStyle: 'italic', pointerEvents: 'none', padding: '14px 16px', position: 'absolute', top: 0, left: 0, },
    '.cm-foldGutter .cm-gutterElement': { padding: '0 4px 0 8px', cursor: 'pointer', textAlign: 'center', },
    '.cm-foldMarker': { display: 'inline-block', color: 'hsl(210, 10%, 70%)', '&:hover': { color: 'hsl(210, 10%, 50%)' }, },
    '.cm-searchMatch': { backgroundColor: 'hsla(50, 100%, 50%, 0.35)', outline: '1px solid hsla(50, 100%, 50%, 0.5)', borderRadius: '2px', },
    '.cm-searchMatch-selected': { backgroundColor: 'hsla(50, 100%, 50%, 0.55)', outline: '1px solid hsla(50, 100%, 40%, 0.8)' },
    '.cm-selectionBackground, ::selection': { backgroundColor: 'hsla(var(--primary-h), var(--primary-s), 50%, 0.25) !important', },
    '.cm-focused': { outline: 'none !important' },
});

// Define an Annotation type for external changes
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

        // --- Refs to store previous prop values for comparison ---
        const prevReadOnlyRef = useRef(readOnly);
        const prevPlaceholderRef = useRef(placeholder);
        // ---

        // Update callback refs
        useEffect(() => {
            onChangeRef.current = onChange;
            onBlurRef.current = onBlur;
        }, [onChange, onBlur]);

        useImperativeHandle(ref, () => ({
            focus: () => { viewRef.current?.focus(); },
            getView: () => viewRef.current,
        }), []);

        // Effect for Setup and Teardown - Runs ONCE on mount
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
                    if (update.docChanged && !isExternal) { onChangeRef.current(update.state.doc.toString()); }
                    if (update.focusChanged && !update.view.hasFocus) { onBlurRef.current?.(); }
                }),
                EditorState.readOnly.of(currentReadOnly ?? false), // Use initial prop
                ...(currentPlaceholder ? [viewPlaceholder(currentPlaceholder)] : []), // Use initial prop
                editorTheme,
            ];

            const startState = EditorState.create({
                doc: value,
                extensions: createExtensions(placeholder, readOnly)
            });
            const view = new EditorView({ state: startState, parent: editorRef.current as Element });
            viewRef.current = view;

            // Update previous prop refs *after* initial setup
            prevReadOnlyRef.current = readOnly;
            prevPlaceholderRef.current = placeholder;

            return () => {
                if (viewRef.current) {
                    viewRef.current.destroy();
                    viewRef.current = null;
                }
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []); // Empty array: Run only once on mount

        // Effect to handle EXTERNAL value changes from props
        useEffect(() => {
            const view = viewRef.current;
            if (view && value !== view.state.doc.toString()) {
                view.dispatch({
                    changes: { from: 0, to: view.state.doc.length, insert: value || '' },
                    annotations: externalChangeEvent.of(true) // Mark as external
                });
            }
        }, [value]);

        // Effect to handle dynamic readOnly and placeholder prop changes AFTER mount
        useEffect(() => {
            const view = viewRef.current;
            if (!view) return;

            const effects: StateEffect<any>[] = [];

            // --- Compare current prop with previous value from ref ---
            if (readOnly !== prevReadOnlyRef.current) {
                // console.log("ReadOnly changed, reconfiguring:", readOnly);
                effects.push(StateEffect.reconfigure.of([EditorState.readOnly.of(readOnly)]));
            }

            // --- Compare current prop with previous value from ref ---
            if (placeholder !== prevPlaceholderRef.current) {
                // console.log("Placeholder changed, reconfiguring:", placeholder);
                // Reconfigure only the placeholder extension part.
                // Pass new extension if placeholder exists, empty array otherwise.
                effects.push(StateEffect.reconfigure.of(placeholder ? [viewPlaceholder(placeholder)] : []));
                // Note: Using Compartments is the more idiomatic CodeMirror way for
                // truly dynamic extension configuration, but reconfigure works here.
            }
            // ---

            // Dispatch effects if any changes were needed
            if (effects.length > 0) {
                view.dispatch({ effects });
            }

            // --- Update refs with current prop values for the next render cycle ---
            prevReadOnlyRef.current = readOnly;
            prevPlaceholderRef.current = placeholder;
            // ---

        }, [readOnly, placeholder]); // Dependencies trigger effect when these props change


        return (
            <div
                ref={editorRef}
                className={twMerge(
                    'cm-editor-container relative h-full w-full overflow-hidden rounded-md',
                    'bg-glass-inset-100 backdrop-blur-lg border border-black/10 shadow-inner',
                    'focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/80',
                    className
                )}
            />
        );
    }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
export default memo(CodeMirrorEditor);