import { EditorView } from "@codemirror/view";
import { EditorState, type ChangeSpec } from "@codemirror/state";
import {
    getLinesInRange,
    applyChanges,
    getTextWithContext,
    SELECTION
} from "../../core";
import {
    escapeRegExp,
    createHeadingPrefix,
    extractListNumber, isUnorderedListItem
} from "../../core";

/**
 * Functions for manipulating markdown content in the editor.
 * These handle actions triggered by the bubble menu, such as applying
 * inline styles, headings, and lists.
 */

/**
 * Sets or toggles the heading level for the selected lines.
 * @param view - The CodeMirror EditorView instance.
 * @param level - The heading level (1-6).
 * @returns `true` to indicate the action was handled.
 */
export function setHeader(view: EditorView, level: number): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;
    const headerPrefix = createHeadingPrefix(level);
    const lines = getLinesInRange(state, from, to);

    const changes: ChangeSpec[] = lines.map(line => {
        // Toggle off if already this heading level
        if (line.text.startsWith(headerPrefix)) {
            return {
                from: line.from,
                to: line.from + headerPrefix.length,
                insert: ''
            };
        }

        // Replace existing heading with new level
        const existingHeaderMatch = line.text.match(/^#+\s/);
        if (existingHeaderMatch) {
            return {
                from: line.from,
                to: line.from + existingHeaderMatch[0].length,
                insert: headerPrefix
            };
        }

        // Add new heading
        return { from: line.from, insert: headerPrefix };
    });

    applyChanges(view, changes);
    return true;
}

/**
 * Toggles ordered or unordered list formatting for the selected lines.
 * @param view - The CodeMirror EditorView instance.
 * @param ordered - `true` for an ordered list, `false` for an unordered list.
 * @returns `true` to indicate the action was handled.
 */
export function toggleList(view: EditorView, ordered: boolean): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;
    const lines = getLinesInRange(state, from, to);

    // Determine starting number for ordered lists
    let currentNumber = 1;
    const fromLine = state.doc.lineAt(from);
    if (fromLine.number > 1 && ordered) {
        const prevLine = state.doc.line(fromLine.number - 1);
        const prevNumber = extractListNumber(prevLine.text);
        if (prevNumber !== null) {
            currentNumber = prevNumber + 1;
        }
    }

    const changes: ChangeSpec[] = lines.map(line => {
        const lineText = line.text;

        if (ordered) {
            const existingNumber = extractListNumber(lineText);
            if (existingNumber !== null) {
                // Remove ordered list marker
                const match = lineText.match(/^(\d+)\.\s/);
                return {
                    from: line.from,
                    to: line.from + match![0].length,
                    insert: ''
                };
            }
            // Add ordered list marker
            const insert = `${currentNumber}. `;
            currentNumber++;
            return { from: line.from, insert };
        } else {
            if (isUnorderedListItem(lineText)) {
                // Remove unordered list marker
                return { from: line.from, to: line.from + 2, insert: '' };
            }
            // Add unordered list marker
            return { from: line.from, insert: '- ' };
        }
    });

    applyChanges(view, changes);
    return true;
}

/**
 * Toggles an inline markdown style (e.g., bold, italic) around the current selection.
 * @param view - The CodeMirror EditorView instance.
 * @param mark - The markdown marker to toggle (e.g., "**", "*").
 * @returns `true` to indicate the action was handled.
 */
export function toggleInlineStyle(view: EditorView, mark: string): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // Get text with some context around the selection to find surrounding markers.
    const contextLength = mark.length * SELECTION.MARKER_CONTEXT_LENGTH;
    const { text: textToCheck, start } = getTextWithContext(
        state,
        from,
        to,
        contextLength
    );

    const escapedMark = escapeRegExp(mark);
    const regex = new RegExp(`(${escapedMark}+)([\\s\\S]*?)\\1`, 'g');

    const markerLength = mark.length;
    const changes: ChangeSpec[] = [];
    let match;
    let found = false;

    // Check for special case of bold to italic or bold-italic to bold conversion
    if (mark === '*') {
        const boldOrBoldItalicRegex = /(\*{2,3})([^*]+)\1/g;
        while ((match = boldOrBoldItalicRegex.exec(textToCheck)) !== null) {
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;
            if (matchStart <= from && to <= matchEnd) {
                const existingMarkers = match[1];
                if (existingMarkers === '**') {
                    // Convert bold to bold-italic
                    changes.push(
                        {from: matchStart, to: matchStart + 2, insert: '***'},
                        {from: matchEnd - 2, to: matchEnd, insert: '***'}
                    );
                } else if (existingMarkers === '***') {
                    // Convert bold-italic to bold
                    changes.push(
                        {from: matchStart, to: matchStart + 3, insert: '**'},
                        {from: matchEnd - 3, to: matchEnd, insert: '**'}
                    );
                }
                found = true;
                break;
            }
        }
    }

    if (!found) {
        while ((match = regex.exec(textToCheck)) !== null) {
            const fullMarkerLength = match[1].length;
            if (fullMarkerLength % markerLength !== 0) {
                continue;
            }
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;

            if (matchStart <= from && to <= matchEnd) {
                // Remove one layer of markers
                const removeStart = matchStart;
                const removeEnd = matchEnd;

                changes.push(
                    {from: removeStart, to: removeStart + markerLength, insert: ''},
                    {from: removeEnd - markerLength, to: removeEnd, insert: ''}
                );
                found = true;
                break;
            }
        }
    }

    // If no existing style was found to remove, add the new style.
    if (!found) {
        // Check for combined styles
        const combinedRegex = /(\*{1,3}|_{1,3}|~~|==)([^*_~=]+)\1/g;
        while ((match = combinedRegex.exec(textToCheck)) !== null) {
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;

            if (matchStart <= from && to <= matchEnd) {
                const existingMarkers = match[1];
                if (existingMarkers.includes(mark)) {
                    // Remove the mark from existing markers
                    const newMarkers = existingMarkers.replace(mark, '');
                    changes.push(
                        {from: matchStart, to: matchStart + existingMarkers.length, insert: newMarkers},
                        {from: matchEnd - existingMarkers.length, to: matchEnd, insert: newMarkers}
                    );
                } else {
                    // Add the mark to existing markers
                    changes.push(
                        {from: matchStart, to: matchStart + existingMarkers.length, insert: existingMarkers + mark},
                        {from: matchEnd - existingMarkers.length, to: matchEnd, insert: mark + existingMarkers}
                    );
                }
                found = true;
                break;
            }
        }
    }

    if (!found) {
        // Add markers
        changes.push(
            {from, insert: mark},
            {from: to, insert: mark}
        );
    }

    applyChanges(view, changes);
    return true;
}

/**
 * Checks if a specific heading level is active at the cursor's current line.
 * @param state - The editor state.
 * @param level - The heading level to check (1-6).
 * @returns `true` if the heading level is active.
 */
export function isHeaderActive(state: EditorState, level: number): boolean {
    const { from } = state.selection.main;
    const line = state.doc.lineAt(from);
    const headerPrefix = createHeadingPrefix(level);
    return line.text.startsWith(headerPrefix);
}

/**
 * Checks if an inline style is active within the current selection.
 * @param state - The editor state.
 * @param marker - The markdown marker to check for.
 * @returns `true` if the style is active.
 */
export function isInlineStyleActive(state: EditorState, marker: string): boolean {
    const { from, to } = state.selection.main;

    const contextLength = marker.length * SELECTION.MARKER_CONTEXT_LENGTH;
    const { text: textToCheck, start } = getTextWithContext(
        state,
        from,
        to,
        contextLength
    );

    const escapedMarker = escapeRegExp(marker);
    // Regex to find a valid markdown style block.
    const regex = new RegExp(`(?<!\\${marker[0]})${escapedMarker}([^${escapedMarker}]+)${escapedMarker}(?!\\${marker[0]})`, 'g');

    let match;
    while ((match = regex.exec(textToCheck)) !== null) {
        const matchStart = start + match.index;
        const matchEnd = matchStart + match[0].length;

        if (matchStart <= from && to <= matchEnd) {
            return true;
        }
    }

    // Special handling for combined bold/italic styles
    if (marker === '**' || marker === '*') {
        const boldItalicRegex = /\*{3}([^*]+)\*{3}/g;
        while ((match = boldItalicRegex.exec(textToCheck)) !== null) {
            const matchStart = start + match.index;
            const matchEnd = matchStart + match[0].length;

            if (matchStart <= from && to <= matchEnd) {
                return true;
            }
        }
    }

    return false;
}


/**
 * Checks if a list style is active at the cursor's current line.
 * @param state - The editor state.
 * @param ordered - `true` to check for an ordered list, `false` for unordered.
 * @returns `true` if the specified list style is active.
 */
export function isListActive(state: EditorState, ordered: boolean): boolean {
    const { from } = state.selection.main;
    const line = state.doc.lineAt(from);

    if (ordered) {
        return extractListNumber(line.text) !== null;
    } else {
        return isUnorderedListItem(line.text);
    }
}