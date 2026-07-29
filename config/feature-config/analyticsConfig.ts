export const analyticsConfig = {
  // ---------------------------------------------------------------------------
  // Debug logging
  // ---------------------------------------------------------------------------

  debugAnalytics: 'ifFail' as 'always' | 'ifFail' | 'never',

  // ---------------------------------------------------------------------------
  // Debug filtering
  // ---------------------------------------------------------------------------

  // Filter for logging analytics events in debug output.
  // Can be:
  // - []                -> no filtering, all events are logged
  // - ['key']           -> event contains property 'key' with any value OR any value equals 'key'
  // - ['value']         -> any property in the event has value 'value'
  // - ['key:value']     -> event contains property 'key' with value 'value'
  // - ['key1', 'key2:value2', 'value3']  -> ALL conditions in the list must be satisfied (logical AND)
  filterKey: [],
} as const;
