import * as icons from "lucide";
import {EditorView} from "@codemirror/view";
import {EditorState} from "@codemirror/state";

/**
 * Defines the structure for a top-level item in the bubble menu.
 */
export interface BubbleMenuItem {
    name: string;
    icon: keyof typeof icons;
    action?: (view: EditorView) => boolean;
    isActive?: (state: EditorState) => boolean;
    subItems?: BubbleMenuSubItem[];
    type?: 'dropdown' | 'button';
}

/**
 * Defines the structure for an item within a dropdown in the bubble menu.
 */
export interface BubbleMenuSubItem {
    name: string;
    icon?: keyof typeof icons;
    action: (view: EditorView) => Promise<boolean> | boolean;
    isActive?: (state: EditorState) => boolean;
}