import {type Extension, Compartment, StateEffect, StateField} from '@codemirror/state';
import { EditorView, keymap, rectangularSelection } from '@codemirror/view';
import { indentOnInput } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { languages } from "@codemirror/language-data";
import { GFM } from "@lezer/markdown";
import type {AIStreamHandler, MoondownTranslations} from "../core";

// Import custom extensions
import { correctList } from "./correct-list";
import { markdownSyntaxHiding } from "./markdown-syntax-hiding";
import { Mark } from "./mark-parser";
import { Underline } from "./underline-parser";
import { Strikethrough } from "./strikethrough-parser";
import { finalNewLine } from "./final-new-line";
import { tableExtension } from "./table";
import { slashCommand } from "./slash-command";
import { imageExtension, imageKeymap } from "./image";
import { fencedCode } from "./fenced-code";
import { blockquote } from "./blockquote";
import { bubbleMenu } from "./bubble-menu";
import { lightTheme } from "../theme/base-theme";

/** A Compartment allows an extension to be dynamically replaced. */

/** Compartment for dynamically switching the editor theme (light/dark). */
export const themeCompartment = new Compartment();

/** Compartment for toggling WYSIWYG features like table and image rendering. */
export const wysiwygCompartment = new Compartment();

/** Compartment for dynamically toggling the editor's read-only state. */
export const readOnlyCompartment = new Compartment();

/** Compartment for dynamically setting the editor's placeholder text. */
export const placeholderCompartment = new Compartment();

/** State field to hold the AI stream handler function. */
export const onAIStreamState = StateField.define<AIStreamHandler | null>({
    create: () => null,
    update: (value, tr) => {
        for (const e of tr.effects) if (e.is(setOnAIStream)) return e.value;
        return value;
    }
});
/** StateEffect to update the AI stream handler. */
export const setOnAIStream = StateEffect.define<AIStreamHandler | null>();

/** State field to hold UI translation strings. */
export const translationsState = StateField.define<MoondownTranslations>({
    create: () => ({}),
    update: (value, tr) => {
        for (const e of tr.effects) if (e.is(setTranslations)) return e.value;
        return value;
    }
});
/** StateEffect to update the UI translations. */
export const setTranslations = StateEffect.define<MoondownTranslations>();


/**
 * Extensions that provide the WYSIWYG experience.
 * These are placed in a compartment to be toggled on/off.
 */
export const wysiwygExtensions: Extension[] = [
    tableExtension(),
    imageExtension(),
    markdownSyntaxHiding(),
];

/**
 * The default set of extensions for the Moondown editor.
 * This includes all core functionality: markdown parsing, syntax highlighting,
 * keymaps, and custom features like the bubble menu and slash commands.
 */
export const defaultExtensions: Extension[] = [
    history(),
    rectangularSelection(),
    indentOnInput(),

    // Custom feature extensions
    slashCommand(),
    correctList(),
    fencedCode(),
    blockquote(),
    bubbleMenu(),

    // State Fields for dynamic configuration
    onAIStreamState,
    translationsState,
    imageKeymap,

    keymap.of([
        indentWithTab,
        ...defaultKeymap,
        ...completionKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap
    ]),

    EditorView.lineWrapping,

    // WYSIWYG extensions, loaded into a compartment to be toggled
    wysiwygCompartment.of(wysiwygExtensions),

    // Markdown language support with GFM and custom syntax
    markdown({
        codeLanguages: languages,
        extensions: [GFM, Mark, Underline, Strikethrough],
        addKeymap: false,
    }),

    // Ensures the document always ends with a newline
    finalNewLine,

    // Default theme (light) loaded into a compartment
    themeCompartment.of(lightTheme)
];