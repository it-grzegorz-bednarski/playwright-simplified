// Thin shim to keep strict TypeScript setup happy when using html-validate.
// html-validate is loaded at runtime from node_modules.
const htmlValidate = require('html-validate');

export const HtmlValidate = htmlValidate.HtmlValidate as any;
