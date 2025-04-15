// src/components/common/CodeMirrorEditor.tsx
import React, { useRef, useEffect } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, placeholder as viewPlaceholder} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
// import { oneDark } from '@codemirror/theme-one-dark'; // Example theme
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { twMerge } from 'tailwind-merge';
// import { clsx } from 'clsx';

interface CodeMirrorEditorProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
    onBlur?: () => void;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
                                                               value,
                                                               onChange,
                                                               className,
                                                               placeholder,
                                                               readOnly = false,
                                                               onBlur,
                                                           }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        const extensions = [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...lintKeymap,
                indentWithTab, // Use Tab key for indentation
            ]),
            markdown({
                base: markdownLanguage,
                codeLanguages: languages, // Support syntax highlighting in code blocks
            }),
            // oneDark, // Add a theme if desired
            EditorView.lineWrapping, // Enable line wrapping
            EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor' }),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChange(update.state.doc.toString());
                }
            }),
            EditorState.readOnly.of(readOnly),
            ...(placeholder ? [viewPlaceholder(placeholder)] : [])
        ];

        const startState = EditorState.create({
            doc: value,
            extensions: extensions,
        });

        const view = new EditorView({
            state: startState,
            parent: editorRef.current,
        });
        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // IMPORTANT: Only re-initialize if readOnly or placeholder changes.
        // Value changes are handled by the dispatch effect below.
    }, [onChange, readOnly, placeholder]);

    // Effect to update the editor content when the `value` prop changes from outside
    useEffect(() => {
        if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: value || '' },
            });
        }
    }, [value]);

    return <div
        ref={editorRef}
        className={twMerge('cm-editor-container h-full', className)}
        onBlur={onBlur}
    ></div>;
};

export default CodeMirrorEditor;