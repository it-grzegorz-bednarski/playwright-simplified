const chromeLauncherPkg = require('chrome-launcher');

const launch = chromeLauncherPkg.launch ?? chromeLauncherPkg.default?.launch;

export { launch as launchChrome };
