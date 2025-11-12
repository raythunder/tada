import {EditorView, Decoration} from "@codemirror/view"
import {StateField, RangeSetBuilder, EditorState} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {fencedCodeDecoration} from "./decorations.ts";

/**
 * A StateField that applies line decorations to fenced code blocks,
 * giving them a distinct background and styling.
 */
export const fencedCodeBackgroundPlugin = StateField.define({
    create(_state: EditorState) {
        return Decoration.none;
    },
    update(_decorations, transaction) {
        const state = transaction.state
        const ranges: { from: number, to: number, decoration: Decoration }[] = []

        syntaxTree(state).iterate({
            enter: (node) => {
                if (node.type.name === "FencedCode") {
                    const start = node.from
                    const end = node.to

                    const startLine = state.doc.lineAt(start)
                    const endLine = state.doc.lineAt(end)

                    // Only add background color for all lines
                    let pos = startLine.from
                    while (pos <= endLine.from) {
                        const line = state.doc.lineAt(pos)
                        ranges.push({
                            from: line.from,
                            to: line.from,
                            decoration: fencedCodeDecoration
                        })
                        pos = line.to + 1
                    }
                }
            }
        })

        ranges.sort((a, b) => a.from - b.from)

        const builder = new RangeSetBuilder<Decoration>()
        for (const {from, to, decoration} of ranges) {
            builder.add(from, to, decoration)
        }

        return builder.finish()
    },
    provide: (f) => EditorView.decorations.from(f),
})

/**
 * An input handler that automatically creates a complete code block
 * when the user types three backticks (```).
 */
export const codeBlockInputHandler = EditorView.inputHandler.of((view, _from, _to, text) => {
    if (text === "`") {
        const state = view.state
        const selection = state.selection.main
        const beforeCursor = state.doc.sliceString(Math.max(0, selection.from - 2), selection.from)

        // Check if previous two characters are also backticks, forming three backticks
        if (beforeCursor === "``") {
            // Insert a newline, empty line and closing ```
            const insertText = "\n\n```"
            // Calculate new cursor position, after first ```
            const cursorPos = selection.from + 1

            // Execute replacement
            view.dispatch({
                changes: {from: selection.from - 2, to: selection.from, insert: "```" + insertText},
                selection: {anchor: cursorPos}
            })

            // Prevent default input handling
            return true
        }
    }

    // Use default input handler
    return false
})