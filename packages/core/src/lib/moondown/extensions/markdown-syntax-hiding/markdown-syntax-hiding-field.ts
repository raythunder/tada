import { StateField, EditorState, StateEffect } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import {
    type DecorationItem,
    type HandlerContext,
    handleFencedCode,
    handleBlockquote,
    handleHorizontalRule,
    handleListItem,
    handleEmphasis,
    handleInlineCode,
    handleHeading,
    handleLink,
    handleStrikethrough,
    handleMark,
    handleUnderline,
    handleImage,
    handleLinkDefinition,
    handleFootnoteDefinition
} from "./node-handlers";

/**
 * StateEffect to toggle the syntax hiding feature.
 */
export const toggleSyntaxHidingEffect = StateEffect.define<boolean>();

/**
 * StateField to hold the current enabled/disabled state of syntax hiding.
 */
export const syntaxHidingState = StateField.define<boolean>({
    create: () => true, // Enabled by default
    update(value, tr) {
        for (const e of tr.effects) {
            if (e.is(toggleSyntaxHidingEffect)) {
                return e.value;
            }
        }
        return value;
    },
});

/**
 * Mapping of Lezer syntax node names to their corresponding decoration handlers.
 */
type NodeHandler = (ctx: HandlerContext, node?: any) => DecorationItem[];
const NODE_HANDLERS: Record<string, NodeHandler> = {
    'FencedCode': handleFencedCode,
    'Blockquote': handleBlockquote,
    'HorizontalRule': handleHorizontalRule,
    'ListItem': handleListItem,
    'Emphasis': (ctx) => handleEmphasis(ctx, false),
    'StrongEmphasis': (ctx) => handleEmphasis(ctx, true),
    'InlineCode': handleInlineCode,
    'Link': handleLink,
    'Strikethrough': handleStrikethrough,
    'Mark': handleMark,
    'Underline': handleUnderline,
    'Image': handleImage,
    'LinkReference': handleLink,
};

/**
 * Special handler for ATX heading nodes (e.g., ATXHeading1, ATXHeading2).
 */
function handleATXHeading(ctx: HandlerContext, nodeName: string): DecorationItem[] {
    const headerLevel = parseInt(nodeName.slice(-1));
    return handleHeading(ctx, headerLevel);
}

/**
 * The main StateField that computes and provides the decorations for hiding markdown syntax.
 */
export const markdownSyntaxHidingField = StateField.define<DecorationSet>({
    create(_: EditorState) {
        return Decoration.none;
    },

    update(_oldDecorations, transaction) {
        const decorations: DecorationItem[] = [];
        const { state } = transaction;
        const selection = state.selection.main;
        const isHidingEnabled = state.field(syntaxHidingState);

        const processedBlockquotes = new Set<string>();
        const processedDefinitionLines = new Set<number>();

        // First pass: Process all footnote and link definitions by scanning all lines.
        // This ensures definitions are handled correctly even if they are not directly
        // visited by the syntax tree iteration in complex documents.
        for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
            const line = state.doc.line(lineNum);
            const lineText = line.text;

            // Check for footnote definition first (higher priority)
            if (/^\[\^([^\]]+)\]:\s*/.test(lineText)) {
                processedDefinitionLines.add(lineNum);
                const ctx: HandlerContext = {
                    state,
                    selection,
                    isHidingEnabled,
                    isSelected: selection.from <= line.to && selection.to >= line.from,
                    start: line.from,
                    end: line.to
                };
                decorations.push(...handleFootnoteDefinition(ctx));
            }
            // Check for link definition
            else if (/^\[([^\]]+)\]:\s*\S+/.test(lineText)) {
                processedDefinitionLines.add(lineNum);
                const ctx: HandlerContext = {
                    state,
                    selection,
                    isHidingEnabled,
                    isSelected: selection.from <= line.to && selection.to >= line.from,
                    start: line.from,
                    end: line.to
                };
                decorations.push(...handleLinkDefinition(ctx));
            }
        }

        // Second pass: Process syntax tree nodes, skipping lines already handled.
        syntaxTree(state).iterate({
            enter: (node) => {
                const start = node.from;
                const end = node.to;
                const isSelected = selection.from <= end && selection.to >= start;

                const startLine = state.doc.lineAt(start);
                if (processedDefinitionLines.has(startLine.number)) {
                    return false; // Skip this node and its children
                }

                const ctx: HandlerContext = { state, selection, isHidingEnabled, isSelected, start, end };

                if (node.type.name.startsWith('ATXHeading')) {
                    decorations.push(...handleATXHeading(ctx, node.type.name));
                    return;
                }

                if (node.type.name === 'Blockquote') {
                    const key = `${start}-${end}`;
                    if (!processedBlockquotes.has(key)) {
                        processedBlockquotes.add(key);
                        decorations.push(...handleBlockquote(ctx));
                    }
                    return;
                }

                const handler = NODE_HANDLERS[node.type.name];
                if (handler) {
                    decorations.push(...handler(ctx, node));
                }
            },
        });

        decorations.sort((a, b) => {
            if (a.from !== b.from) return a.from - b.from;
            if (a.to !== b.to) return a.to - b.to;

            const aStartSide = a.decoration.spec.startSide ?? 0;
            const bStartSide = b.decoration.spec.startSide ?? 0;
            return aStartSide - bStartSide;
        });

        return Decoration.set(
            decorations.map(({ from, to, decoration }) => decoration.range(from, to))
        );
    },

    provide: (f) => EditorView.decorations.from(f),
});