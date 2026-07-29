// Thin shim for strict TypeScript setup.
const axePlaywright = require('@axe-core/playwright');

const AxeBuilderExport = axePlaywright.default ?? axePlaywright.AxeBuilder ?? axePlaywright;

export default AxeBuilderExport as any;
