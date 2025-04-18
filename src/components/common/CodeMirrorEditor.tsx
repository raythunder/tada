// src/components/common/CodeMirrorEditor.tsx
// @ts-expect-error - Explicit React import
import React, { useRef, useEffect, useImperativeHandle, forwardRef, memo } from 'react';
import { EditorState, StateEffect } from '@codemirror/state';
import { EditorView, keymap, drawSelection, dropCursor, rectangularSelection, placeholder as viewPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { bracketMatching, indentOnInput, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'; // Added highlightSelectionMatches
import { lintKeymap } from '@codemirror/lint';
import { twMerge } from 'tailwind-merge';

// Enhanced theme with mandatory glass effect integration
const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13.5px',
        backgroundColor: 'transparent', // CM background must be transparent for glass
        borderRadius: 'inherit',
    },
    '.cm-scroller': {
        fontFamily: `var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)`,
        lineHeight: '1.65',
        overflow: 'auto',
        position: 'relative',
        backgroundColor: 'transparent !important', // Ensure scroller is transparent
    },
    '.cm-content': {
        padding: '12px 14px',
        caretColor: 'hsl(208, 100%, 50%)',
        backgroundColor: 'transparent !important', // Ensure content area is transparent
    },
    // Gutters styled for stronger glassmorphism
    '.cm-gutters': {
        backgroundColor: 'hsla(220, 40%, 98%, 0.6)', // Match alt glass more closely
        borderRight: '1px solid hsla(210, 20%, 85%, 0.4)', // Softer, semi-transparent border
        color: 'hsl(210, 9%, 55%)',
        paddingLeft: '8px',
        paddingRight: '4px',
        fontSize: '11px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(8px)', // Apply blur to gutters
        WebkitBackdropFilter: 'blur(8px)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '22px',
    },
    '.cm-line': {
        padding: '0 4px',
    },
    '.cm-activeLine': {
        backgroundColor: 'hsla(208, 100%, 50%, 0.08)', // Slightly more visible active line on glass
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'hsla(208, 100%, 50%, 0.12)', // Slightly more visible gutter highlight on glass
    },
    '.cm-placeholder': {
        color: 'hsl(210, 9%, 60%)',
        fontStyle: 'italic',
        pointerEvents: 'none',
        padding: '12px 14px',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px 0 8px',
        cursor: 'pointer',
        textAlign: 'center',
    },
    '.cm-foldMarker': {
        display: 'inline-block',
        color: 'hsl(210, 10%, 70%)',
        '&:hover': {
            color: 'hsl(210, 10%, 50%)',
        },
    },
    // Search match highlighting
    '.cm-searchMatch': {
        backgroundColor: 'hsla(50, 100%, 50%, 0.3)', // Yellowish highlight
        outline: '1px solid hsla(50, 100%, 50%, 0.5)'
    },
    '.cm-searchMatch-selected': {
        backgroundColor: 'hsla(50, 100%, 50%, 0.5)', // Darker selected match
        outline: '1px solid hsla(50, 100%, 40%, 0.8)'
    },

});

interface CodeMirrorEditorProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
    onBlur?: () => void;
    // useGlassEffect is now implied / always on
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
        const stateRef = useRef<EditorState | null>(null);

        useImperativeHandle(ref, () => ({
            focus: () => { viewRef.current?.focus(); },
            getView: () => viewRef.current,
        }), []);

        useEffect(() => {
            if (!editorRef.current) return;

            const createExtensions = () => [
                history(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                highlightSelectionMatches(), // Add search match highlighting
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...searchKeymap, // Include search keys (like Ctrl/Cmd+F)
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    ...lintKeymap,
                    indentWithTab,
                ]),
                markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
                EditorView.lineWrapping,
                EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor' }),
                EditorView.updateListener.of((update) => {
                    if (update.state) { stateRef.current = update.state; }
                    if (update.docChanged) { onChange(update.state.doc.toString()); }
                    if (update.focusChanged && !update.view.hasFocus && onBlur) { onBlur(); }
                }),
                EditorState.readOnly.of(readOnly),
                ...(placeholder ? [viewPlaceholder(placeholder)] : []),
                editorTheme,
            ];

            let view = viewRef.current;

            if (view) {
                view.dispatch({ effects: StateEffect.reconfigure.of(createExtensions()) });
                stateRef.current = view.state;
            } else {
                const startState = EditorState.create({ doc: value, extensions: createExtensions() });
                stateRef.current = startState;
                view = new EditorView({ state: startState, parent: editorRef.current as Element });
                viewRef.current = view;
            }

            return () => {
                if (viewRef.current) {
                    viewRef.current.destroy();
                    viewRef.current = null;
                }
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [readOnly, placeholder, onChange, onBlur]);

        useEffect(() => {
            const view = viewRef.current;
            const currentState = stateRef.current;
            if (view && currentState && value !== currentState.doc.toString()) {
                if (value !== view.state.doc.toString()){ // Double check
                    view.dispatch({
                        changes: { from: 0, to: view.state.doc.length, insert: value || '' },
                        selection: view.state.selection,
                        userEvent: "external"
                    });
                }
            }
        }, [value]);

        return (
            <div
                ref={editorRef}
                className={twMerge(
                    // Container div now defines the glass background and blur
                    'cm-editor-container relative h-full w-full overflow-hidden rounded-md', // Base structure
                    'bg-glass-inset-100 backdrop-blur-md border border-black/10 shadow-inner', // Default glass effect
                    'focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/80', // Focus state on container
                    className // Allow overrides
                )}
            />
        );
    }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
export default memo(CodeMirrorEditor);