import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import errorImageGeneric from "./error-image-generic.png";
import { imageLoadedEffect, updateImagePlaceholder } from "./types";
import { CSS_CLASSES, TIMING } from "../../core/constants";
import { createElement } from "../../core/utils/dom-utils";

/**
 * A CodeMirror Widget for rendering and managing images within the editor.
 * It handles image loading, error states, and drag-and-drop functionality for repositioning.
 */
export class ImageWidget extends WidgetType {
    private loaded = false;
    private errorSrc: string | null = null;
    private isError = false;
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private clickTimeout: NodeJS.Timeout | null = null;
    private isMouseDownOnImage = false;
    private currentDraggingImg: HTMLImageElement | null = null;

    constructor(
        public alt: string,
        public src: string,
        public from: number,
        public to: number,
        private view: EditorView
    ) {
        super();
    }

    toDOM(): HTMLElement {
        const wrapper = this.createWrapper();
        const imageWrapper = this.createImageWrapper();
        const img = this.createImage();
        const overlay = createElement("div", "cm-image-overlay");
        const altText = this.createAltText();

        imageWrapper.appendChild(img);
        imageWrapper.appendChild(overlay);
        wrapper.appendChild(imageWrapper);
        wrapper.appendChild(altText);

        this.attachEventListeners(wrapper, img, altText);

        return wrapper;
    }

    /**
     * Creates the main wrapper element for the image widget.
     * @returns The main HTMLElement for the widget.
     */
    private createWrapper(): HTMLElement {
        const className = this.isError
            ? `${CSS_CLASSES.IMAGE_WIDGET} ${CSS_CLASSES.IMAGE_ERROR}`
            : CSS_CLASSES.IMAGE_WIDGET;
        return createElement("div", className);
    }

    /**
     * Creates the container for the `<img>` tag.
     * @returns The image container HTMLElement.
     */
    private createImageWrapper(): HTMLElement {
        return createElement("div", "cm-image-wrapper");
    }

    /**
     * Creates the `<img>` element itself.
     * @returns The HTMLImageElement.
     */
    private createImage(): HTMLImageElement {
        const img = document.createElement("img");
        img.src = this.errorSrc || this.src;
        img.alt = this.alt;
        img.style.transform = 'scale(0.9)';
        return img;
    }

    /**
     * Creates the element to display the image's alt text.
     * @returns The alt text HTMLElement.
     */
    private createAltText(): HTMLElement {
        const altText = createElement("div", "cm-image-alt");
        altText.textContent = this.alt;
        return altText;
    }

    /**
     * Attaches event listeners to the widget's elements.
     * @param wrapper The main wrapper element.
     * @param img The `<img>` element.
     * @param altText The alt text element.
     */
    private attachEventListeners(
        wrapper: HTMLElement,
        img: HTMLImageElement,
        altText: HTMLElement
    ): void {
        wrapper.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        if (!this.loaded) {
            img.addEventListener('load', () => this.handleImageLoad(wrapper));
            img.addEventListener('error', () => this.handleImageError(wrapper, img, altText));
        }
    }

    /**
     * Handles the successful loading of the image. Dispatches an effect to inform
     * the editor of the image's height in lines, allowing the layout to adjust.
     * @param wrapper The main widget wrapper element.
     */
    private handleImageLoad(wrapper: HTMLElement): void {
        this.loaded = true;
        const lineHeight = this.view.defaultLineHeight;
        const lines = Math.ceil(wrapper.offsetHeight / lineHeight);

        this.view.dispatch({
            effects: imageLoadedEffect.of({ from: this.from, to: this.to, lines })
        });
    }

    /**
     * Handles image loading errors by replacing the src with a fallback image
     * and applying an error style.
     * @param wrapper The main widget wrapper element.
     * @param img The `<img>` element.
     * @param altText The alt text element.
     */
    private handleImageError(
        wrapper: HTMLElement,
        img: HTMLImageElement,
        altText: HTMLElement
    ): void {
        this.isError = true;
        wrapper.classList.add(CSS_CLASSES.IMAGE_ERROR);
        this.errorSrc = errorImageGeneric;
        img.src = this.errorSrc;
        altText.textContent = this.alt;
    }

    /**
     * Handles the mouse down event on the widget.
     * It initiates a timer to distinguish between a click (for selection) and a drag.
     */
    private handleMouseDown = (event: MouseEvent): void => {
        event.preventDefault();
        this.isMouseDownOnImage = true;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.currentDraggingImg = event.target as HTMLImageElement;

        this.clickTimeout = setTimeout(() => {
            this.isDragging = true;
            document.body.style.cursor = 'move';
        }, TIMING.CLICK_TIMEOUT);
    }

    /**
     * Handles the mouse move event during a drag operation.
     */
    private handleMouseMove = (event: MouseEvent): void => {
        if (!this.isDragging) return;

        this.updatePlaceholder(event);
        this.updateDragVisuals(event);
    }

    /**
     * Updates the position of the drop placeholder decoration in the editor.
     * @param event The MouseEvent.
     */
    private updatePlaceholder(event: MouseEvent): void {
        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });

        if (pos !== null) {
            const line = this.view.state.doc.lineAt(pos);
            this.view.dispatch({
                effects: updateImagePlaceholder.of({ pos: line.to })
            });
        }
    }

    /**
     * Updates the visual style of the image element being dragged.
     * @param event The MouseEvent.
     */
    private updateDragVisuals(event: MouseEvent): void {
        if (!this.currentDraggingImg) return;

        const deltaX = event.clientX - this.dragStartX;
        const deltaY = event.clientY - this.dragStartY;
        this.currentDraggingImg.style.transform = `scale(0.8) translate(${deltaX}px, ${deltaY}px)`;
        this.currentDraggingImg.style.opacity = '0.7';
    }

    /**
     * Handles the mouse up event, completing either a selection or a drag operation.
     */
    private handleMouseUp = (event: MouseEvent): void => {
        this.clearClickTimeout();

        if (!this.isDragging && this.isMouseDownOnImage) {
            this.selectImage();
        } else if (this.isDragging) {
            this.completeDrag(event);
        }

        this.isMouseDownOnImage = false;
    }

    /**
     * Clears the timeout used to detect a drag gesture.
     */
    private clearClickTimeout(): void {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
    }

    /**
     * Selects the underlying markdown text for the image.
     */
    private selectImage(): void {
        this.view.dispatch({
            selection: EditorSelection.single(this.from, this.to),
            scrollIntoView: true
        });
    }

    /**
     * Finalizes the drag operation by moving the image markdown to the new position.
     * @param event The MouseEvent.
     */
    private completeDrag(event: MouseEvent): void {
        this.isDragging = false;
        document.body.style.cursor = 'default';

        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
            this.moveTo(pos);
        }

        this.view.dispatch({
            effects: updateImagePlaceholder.of(null)
        });

        this.resetDragVisuals();
    }

    /**
     * Resets the visual styles of the dragged image element.
     */
    private resetDragVisuals(): void {
        if (this.currentDraggingImg) {
            this.currentDraggingImg.style.transform = '';
            this.currentDraggingImg.style.opacity = '1';
            this.currentDraggingImg = null;
        }
    }

    /**
     * Dispatches a transaction to move the image's markdown text to a new position.
     * @param pos The target position in the document.
     */
    private moveTo(pos: number): void {
        const doc = this.view.state.doc;
        const line = doc.lineAt(pos);
        let from = line.to;
        let insert = `\n![${this.alt}](${this.src})`;

        if (line.length === 0) {
            from = line.from;
            insert = insert.slice(1);
        }

        this.view.dispatch({
            changes: [
                { from: this.from, to: this.to, insert: '' },
                { from, insert }
            ]
        });
    }

    /**
     * Updates the widget's internal `from` and `to` positions.
     * This is called by the renderer when the document changes.
     */
    updatePosition(from: number, to: number): void {
        this.from = from;
        this.to = to;
    }

    ignoreEvent(): boolean {
        return false;
    }

    eq(other: ImageWidget): boolean {
        return (
            other.alt === this.alt &&
            other.src === this.src &&
            other.from === this.from &&
            other.to === this.to
        );
    }

    destroy(): void {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
}