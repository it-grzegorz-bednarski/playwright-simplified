export const waitForPageIdleConfig = {
  usePlaywrightNetworkIdle: true, // true | false
  idleThreshold: 1000, // ms of silence before page is idle
  maxWaitTime: 25000, // max total wait time (ms)
  pollInterval: 250, // check interval for network activity (ms)
} as const;
