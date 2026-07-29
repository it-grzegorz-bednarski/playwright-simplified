const lighthousePkg = require('lighthouse');

const lighthouse = lighthousePkg.default ?? lighthousePkg;

export default lighthouse as any;
