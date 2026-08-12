const FLAGSHIP_LAYOUT = {
  version: 1,
  name: 'Dashboard Layout',
  exportedAt: '2026-08-12T20:28:45.228Z',
  widgets: [
    {
      type: 'clock',
      w: 6,
      h: 2,
      settings: {
        timezone: 'Asia/Calcutta',
        format: '12h',
        showSeconds: 0,
        showDate: 1,
      },
    },
    {
      type: 'clock',
      w: 6,
      h: 2,
      settings: {
        timezone: 'America/New_York',
        format: '12h',
        showSeconds: 0,
        showDate: 1,
      },
    },
    {
      type: 'weather',
      w: 6,
      h: 4,
      settings: {
        location: 'kolkata, india ',
        unit: 'celsius',
        showForecast: 1,
        refreshInterval: 3600,
      },
    },
    {
      type: 'weather',
      w: 6,
      h: 4,
      settings: {
        location: 'Bengaluru, Karnataka',
        unit: 'celsius',
        showForecast: 1,
        refreshInterval: 3600,
      },
    },
    {
      type: 'news',
      w: 12,
      h: 5,
      settings: {
        mode: 'all',
        category: 'WORLD',
        customFeeds: [],
        rotationSpeed: 20,
        autoRotate: 1,
      },
    },
    {
      type: 'stocks',
      w: 12,
      h: 4,
      settings: {
        symbols: ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'NVDA', 'AMZN'],
        refreshInterval: 3600,
        displayMode: 'chart',
        chartMetric: 'changePct',
      },
    },
    {
      type: 'crypto',
      w: 3,
      h: 5,
      settings: {
        coins: ['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink', 'tether'],
        currency: 'usd',
        refreshInterval: 3600,
        displayMode: 'table',
        chartMetric: 'price',
      },
    },
    {
      type: 'crypto',
      w: 3,
      h: 5,
      settings: {
        coins: ['tron', 'dogecoin', 'pepe'],
        currency: 'usd',
        displayMode: 'table',
        chartMetric: 'price',
        refreshInterval: 3600,
      },
    },
  ],
};

const SIMPLE_LAYOUT = {
  version: 1,
  name: 'Simple',
  widgets: [
    {
      type: 'clock',
      w: 6,
      h: 2,
      settings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        format: '12h',
        showSeconds: 0,
        showDate: 1,
      },
    },
  ],
};

const ESSENTIALS_LAYOUT = {
  version: 1,
  name: 'Essentials',
  widgets: [
    {
      type: 'clock',
      w: 6,
      h: 2,
      settings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        format: '12h',
        showSeconds: 0,
        showDate: 1,
      },
    },
    {
      type: 'weather',
      w: 6,
      h: 4,
      settings: {
        location: '',
        unit: 'celsius',
        showForecast: 1,
        refreshInterval: 3600,
      },
    },
  ],
};

export const BUILTIN_LAYOUTS = [
  { id: 'simple', label: 'Simple (Clock only)', layout: SIMPLE_LAYOUT },
  { id: 'essentials', label: 'Essentials (Clock + Weather)', layout: ESSENTIALS_LAYOUT },
  { id: 'flagship', label: 'Full Showcase', layout: FLAGSHIP_LAYOUT },
];

export const DEFAULT_LAYOUT = FLAGSHIP_LAYOUT;
