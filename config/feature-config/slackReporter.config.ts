export const slackReporterConfig = {
  enabled: true,
  debug: 'on-failure' as 'always' | 'on-failure' | 'off',
  onSuccessChannels: [
    // Slack channel: myProject-dev-team-channel
    'C0BJQFW3A77',
    // John Doe (Developer) - Member ID
    // 'U0BJRMVA8NS',
  ] as string[],
  onFailureChannels: [
    // Slack channel: myProject-dev-team-channel
    'C0BJQFW3A77',
    // John Doe (Developer) - Member ID
    'U0BJRMVA8NS',
    // Jane Doe (QA) - Member ID
    'U0BJMD8M3J7',
  ] as string[],
  showInThread: true,
  disableUnfurl: false,
  maxNumberOfFailuresToShow: 9999,
} as const;
