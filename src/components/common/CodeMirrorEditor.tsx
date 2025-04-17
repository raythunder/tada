// src/components/common/CodeMirrorEditor.tsx
import { useRef, useEffect, useImperativeHandle, forwardRef, memo } from 'react';
import {EditorState, StateEffect} from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, highlightActiveLine, placeholder as viewPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { twMerge } from 'tailwind-merge';

// Minimalist theme adjustments integrated with Tailwind styles applied externally
const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13px', // Consistent editor font size
        backgroundColor: 'transparent',
        borderRadius: 'inherit',
    },
    '.cm-scroller': {
        fontFamily: `var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)`,
        lineHeight: '1.6',
        overflow: 'auto',
        position: 'relative',
    },
    '.cm-content': {
        padding: '10px 12px', // Consistent padding
        caretColor: 'hsl(208, 100%, 50%)', // Primary color caret
    },
    '.cm-gutters': {
        backgroundColor: 'hsla(220, 30%, 96%, 0.5)', // Very light, slightly transparent gutter bg
        borderRight: '1px solid hsl(210, 20%, 90%)', // Subtle border
        color: 'hsl(210, 9%, 65%)', // Muted text color
        paddingLeft: '8px',
        paddingRight: '4px',
        fontSize: '11px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
    },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '20px' },
    '.cm-line': { padding: '0 4px' },
    '.cm-activeLine': { backgroundColor: 'hsla(208, 100%, 50%, 0.05)' }, // Very subtle primary active line
    '.cm-activeLineGutter': { backgroundColor: 'hsla(208, 100%, 50%, 0.08)' },
    '.cm-placeholder': {
        color: 'hsl(210, 9%, 65%)',
        fontStyle: 'italic',
        pointerEvents: 'none',
        padding: '10px 12px', // Match content padding
        position: 'absolute',
        top: 0,
        left: 0,
    },
    '.cm-foldGutter .cm-gutterElement': { padding: '0 4px 0 8px', cursor: 'pointer', textAlign: 'center' },
    '.cm-foldMarker': {
        display: 'inline-block', color: 'hsl(210, 10%, 70%)', '&:hover': { color: 'hsl(210, 10%, 50%)' },
    },
});

interface CodeMirrorEditorProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string; // Class for the container div
    placeholder?: string;
    readOnly?: boolean;
    onBlur?: () => void;
}

export interface CodeMirrorEditorRef {
    focus: () => void;
    getView: () => EditorView | null;
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
    ({ value, onChange, className, placeholder, readOnly = false, onBlur }, ref) => {
        const editorRef = useRef<HTMLDivElement>(null);
        const viewRef = useRef<EditorView | null>(null);
        const stateRef = useRef<EditorState | null>(null);

        useImperativeHandle(ref, () => ({
            focus: () => viewRef.current?.focus(),
            getView: () => viewRef.current,
        }));

        useEffect(() => {
            if (!editorRef.current) return;

            const extensions = [
                lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(),
                foldGutter({
                    markerDOM: (open) => {
                        const marker = document.createElement("span");
                        marker.className = "cm-foldMarker"; marker.textContent = open ? "⌄" : "›"; return marker;
                    }
                }),
                drawSelection(), dropCursor(), EditorState.allowMultipleSelections.of(true), indentOnInput(),
                bracketMatching(), closeBrackets(), autocompletion(), rectangularSelection(), highlightActiveLine(),
                highlightSelectionMatches(),
                keymap.of([
                    ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap,
                    ...foldKeymap, ...completionKeymap, ...lintKeymap, indentWithTab,
                ]),
                markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
                EditorView.lineWrapping,
                EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor' }),
                EditorView.updateListener.of((update) => {
                    if (update.state) stateRef.current = update.state;
                    if (update.docChanged) onChange(update.state.doc.toString());
                    if (update.focusChanged && !update.view.hasFocus && onBlur) onBlur();
                }),
                EditorState.readOnly.of(readOnly),
                ...(placeholder ? [viewPlaceholder(placeholder)] : []),
                editorTheme,
            ];

            if (!stateRef.current) {
                stateRef.current = EditorState.create({ doc: value, extensions });
            }

            const view = new EditorView({ state: stateRef.current, parent: editorRef.current });
            viewRef.current = view;

            return () => {
                view.destroy();
                viewRef.current = null;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [readOnly, placeholder]); // Keep deps minimal

        useEffect(() => {
            const view = viewRef.current;
            const currentState = stateRef.current;
            if (view && currentState && value !== currentState.doc.toString()) {
                if (value !== view.state.doc.toString()) { // Double check
                    view.dispatch({
                        changes: { from: 0, to: view.state.doc.length, insert: value || '' }
                    });
                }
            }
        }, [value]);

        useEffect(() => {
            const view = viewRef.current;
            if (view) {
                view.dispatch({ effects: StateEffect.reconfigure.of(EditorState.readOnly.of(readOnly)) });
            }
        }, [readOnly]);

        return (
            <div
                ref={editorRef}
                className={twMerge(
                    'cm-editor-container relative h-full w-full overflow-hidden',
                    'focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/80 border border-transparent',
                    className // Allow external overrides
                )}
            />
        );
    }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
export default memo(CodeMirrorEditor);