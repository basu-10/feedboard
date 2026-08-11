// Shared mutable application state.
// Modules import this object and mutate its properties directly.
// No setters or subscribers — every state change is explicitly triggered
// by a user action or a timer, and the responsible module updates the DOM.
export const state = {
  articles: [],
  currentIndex: 0,
  isPaused: false,
  slideIntervalMs: 8000,
  activeCategory: 'WORLD',
  customFeeds: [],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locationQuery: '',
  weatherUnit: 'celsius',
  weatherLocation: null
};
