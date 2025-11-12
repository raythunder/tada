import {EditorSelection, type Extension} from "@codemirror/state";
import {EditorView, ViewUpdate} from "@codemirror/view";
import {imageSizeField, placeholderField} from "./fields.ts";
import {imageWidgetPlugin} from "./image-renderer.ts";
import {imageDragAndDropPlugin} from "./image-drag-n-drop.ts";

/**
 * Returns a CodeMirror extension that provides comprehensive image handling.
 * This includes rendering markdown images as interactive widgets, handling
 * drag-and-drop/paste of image files, and managing selection styles.
 */
export function imageExtension(): Extension {
    return [
        imageSizeField,
        placeholderField,
        imageWidgetPlugin,
        imageDragAndDropPlugin,
        // Update listener to add a 'selected' class to image widgets when they are part of the selection.
        EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.selectionSet || update.viewportChanged) {
                const {from, to} = update.state.selection.main
                update.view.dom.querySelectorAll(".cm-image-widget").forEach((el: Element) => {
                    const pos = update.view.posAtDOM(el as HTMLElement)
                    if (pos !== null && pos >= from && pos < to) {
                        el.classList.add("selected")
                    } else {
                        el.classList.remove("selected")
                    }
                })
            }
        }),
        // Input handler to allow typing on a new line *before* an image widget.
        EditorView.inputHandler.of((view, from, _to, text) => {
            const doc = view.state.doc;
            const line = doc.lineAt(from);
            const lineContent = line.text;
            let isImageLine = false;

            const imageReg = /^!\[([^\]]*)\]\(([^)]+)\)$/;
            if (imageReg.test(lineContent.trim())) {
                isImageLine = true;
            }

            // If typing at the very beginning of a line that only contains an image.
            if (from === line.from && isImageLine) {
                // Insert a new line before the image.
                view.dispatch({
                    changes: [{from: line.from, insert: '\n'}],
                    selection: EditorSelection.cursor(line.from),
                    scrollIntoView: true
                });

                // Then, insert the typed text on the newly created line.
                view.dispatch({
                    changes: [{from: line.from, insert: text}],
                    selection: EditorSelection.cursor(line.from + text.length),
                    scrollIntoView: true
                });

                return true; // Indicate we have handled this input.
            }

            return false; // Let CodeMirror handle other cases.
        })
    ]
}