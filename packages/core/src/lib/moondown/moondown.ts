import { EditorState } from '@codemirror/state';
import {EditorView, placeholder as viewPlaceholder, ViewUpdate} from '@codemirror/view';
import {
    defaultExtensions,
    placeholderCompartment,
    readOnlyCompartment,
    setOnAIStream,
    setTranslations,
    themeCompartment,
    wysiwygCompartment,
    wysiwygExtensions
} from "./extensions/default-extensions";
import { darkTheme, lightTheme } from "./theme/base-theme";
import type { EditorConfig, Theme, AIStreamHandler, MoondownTranslations } from "./core";

/**
 * Moondown - A modern, feature-rich markdown editor built on CodeMirror 6.
 * It provides a WYSIWYG-like experience with features such as a bubble menu,
 * slash commands, AI text continuation, and interactive table editing.
 */
class Moondown {
    public view: EditorView;

    /**
     * Creates a new Moondown editor instance.
     * @param element The HTML element to mount the editor into.
     * @param initialDoc The initial markdown content of the editor.
     * @param config Optional configuration for the editor.
     */
    constructor(element: HTMLElement, initialDoc: string = '', config?: EditorConfig) {
        const extensions = [
            ...defaultExtensions,
            readOnlyCompartment.of(EditorState.readOnly.of(config?.readOnly ?? false)),
            placeholderCompartment.of(config?.placeholder ? viewPlaceholder(config.placeholder) : []),
            EditorView.updateListener.of((update: ViewUpdate) => {
                config?.onChange?.(update);
                if (update.focusChanged) {
                    if (update.view.hasFocus) {
                        config?.onFocus?.();
                    } else {
                        config?.onBlur?.();
                    }
                }
            })
        ];

        const state = EditorState.create({
            doc: initialDoc,
            extensions: extensions
        });

        this.view = new EditorView({
            state,
            parent: element,
        });

        // Apply initial configuration
        if (config?.theme) {
            this.setTheme(config.theme);
        }
        if (config?.onAIStream) {
            this.setAIStreamHandler(config.onAIStream);
        }
        if (config?.translations) {
            this.setTranslations(config.translations);
        }

        this.toggleSyntaxHiding(config?.syntaxHiding === undefined ? true : config.syntaxHiding);
    }

    /** Gets the current document content as a string. */
    getValue(): string { return this.view.state.doc.toString(); }

    /** Replaces the entire document content with a new string. */
    setValue(value: string): void {
        this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: value } });
    }

    /** Toggles the WYSIWYG features (syntax hiding, interactive widgets). */
    toggleSyntaxHiding(enabled: boolean): void {
        this.view.dispatch({ effects: wysiwygCompartment.reconfigure(enabled ? wysiwygExtensions : []) });
    }

    /** Sets the editor theme. */
    setTheme(theme: Theme): void {
        this.view.dispatch({ effects: themeCompartment.reconfigure(theme === 'dark' ? darkTheme : lightTheme) });
    }

    /** Sets the editor's read-only state. */
    setReadOnly(enabled: boolean): void {
        this.view.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(enabled)) });
    }

    /** Sets the editor's placeholder text. */
    setPlaceholder(text: string): void {
        this.view.dispatch({ effects: placeholderCompartment.reconfigure(text ? viewPlaceholder(text) : []) });
    }

    /** Sets the handler function for AI stream requests. */
    setAIStreamHandler(handler: AIStreamHandler): void {
        this.view.dispatch({ effects: setOnAIStream.of(handler) });
    }

    /** Sets the translation strings for the editor UI components. */
    setTranslations(translations: MoondownTranslations): void {
        this.view.dispatch({ effects: setTranslations.of(translations) });
    }

    /** Gets the underlying CodeMirror EditorView instance. */
    getView(): EditorView { return this.view; }

    /** Focuses the editor. */
    focus(): void { this.view.focus(); }

    /** Destroys the editor instance and cleans up associated resources. */
    destroy(): void { this.view.destroy(); }
}

export default Moondown;