/**
 * Define webhook keys and their corresponding environment variable names.
 * Example: 'generalChannel' corresponds to TEAMS_WEBHOOK_GENERAL_CHANNEL env var
 */
export const teamsWebhookKeys = {
  failureChannel: 'TEAMS_WEBHOOK_FAILURE_CHANNEL',
  successChannel: 'TEAMS_WEBHOOK_SUCCESS_CHANNEL',
} as const;

export const teamsReporterConfig = {
  enabled: true,
  debug: 'on-failure' as 'always' | 'on-failure' | 'off',
  // Reference webhook keys by name (not full URLs - those go in .env)
  onSuccessWebhookKeys: ['successChannel'],
  onFailureWebhookKeys: ['failureChannel'],
  showFailuresDetails: true,
} as const;
