/**
 * Main entry point for the @tada/core package.
 * It exports the root `App` component, which serves as the primary
 * entry for both the web and desktop applications.
 */
export { default as App } from './App';
export { setImageUploadHandler, type ImageUploadHandler } from './lib/moondown/extensions/image/image-drag-n-drop';
