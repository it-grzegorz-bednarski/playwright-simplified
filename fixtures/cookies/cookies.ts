// const baseDomain = (process.env.BASE_URL || '')
//   .replace(/^https?:\/\//, '')
//   .replace(/\/.*$/, '');
// Use baseDomain variable to set the domain dynamically, e.g.:
// domain: `.${baseDomain}`,
export const COOKIES = {
  TEST_COOKIE_A: {
    name: 'cookie_a',
    value: 'true',
    domain: '.the-internet.herokuapp.com',
    path: '/',
    httpOnly: false,
    secure: false,
  },
  TEST_COOKIE_B: {
    name: 'cookie_b',
    value: 'true',
    domain: '.the-internet.herokuapp.com',
    path: '/',
    httpOnly: false,
    secure: false,
  },
  COOKIE_BANNER_ACCEPTED: {
    name: 'cookie_banner_accepted',
    value: 'true',
    domain: '.the-internet.herokuapp.com',
    path: '/',
    httpOnly: false,
    secure: false,
  },
};

export const COOKIE_SCENARIOS: Record<string, Array<keyof typeof COOKIES>> = {
  // Add your cookies scenarios here, e.g.:
  // privacyMinimal: ['COOKIE_BANNER_ACCEPTED'],
  // fullTracking: ['COOKIE_BANNER_ACCEPTED', 'TEST_COOKIE_A', 'TEST_COOKIE_B'],
};
