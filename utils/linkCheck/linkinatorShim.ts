// Thin shim to keep strict TypeScript setup happy when using linkinator.
// linkinator itself is loaded at runtime from node_modules.
const linkinator = require('linkinator');

export const LinkChecker = linkinator.LinkChecker as any;
