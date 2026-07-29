/**
 * Centralized registry of URL intercept patterns used across tests.
 */
export const INTERCEPTS = {
  THE_INTERNET_HOME: '*/the-internet.herokuapp.com/',
  THE_INTERNET_LOGIN: '*/the-internet.herokuapp.com/login',
} as const;
