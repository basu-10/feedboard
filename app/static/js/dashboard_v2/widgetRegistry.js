const WIDGET_REGISTRY = {
  clock: {
    name: 'Clock',
    component: './widgets/clock.js',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    settingsSchema: {
      timezone: {
        type: 'select',
        label: 'Timezone',
        options: [],
        default: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      format: {
        type: 'radio',
        label: 'Format',
        options: ['12h', '24h'],
        default: '24h',
      },
      showSeconds: {
        type: 'checkbox',
        label: 'Show seconds',
        default: true,
      },
      showDate: {
        type: 'checkbox',
        label: 'Show date',
        default: true,
      },
    },
  },
  news: {
    name: 'News',
    component: './widgets/news.js',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    settingsSchema: {
      mode: {
        type: 'radio',
        label: 'Display Mode',
        options: ['single', 'all'],
        default: 'single',
      },
      category: {
        type: 'select',
        label: 'Category',
        options: ['WORLD', 'TECHNOLOGY', 'SCIENCE', 'SPORTS', 'BUSINESS'],
        default: 'WORLD',
      },
      customFeeds: {
        type: 'array',
        label: 'Custom Feeds',
        itemType: 'object',
        itemProperties: {
          id: { type: 'text', label: 'Feed ID' },
          url: { type: 'url', label: 'Feed URL' },
        },
        default: [],
      },
      rotationSpeed: {
        type: 'number',
        label: 'Rotation Speed (seconds)',
        min: 3,
        max: 60,
        default: 8,
      },
      autoRotate: {
        type: 'checkbox',
        label: 'Auto Rotate',
        default: true,
      },
    },
  },
  stocks: {
    name: 'Stock Prices',
    component: './widgets/stocks.js',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    settingsSchema: {
      symbols: {
        type: 'array',
        label: 'Stock Symbols',
        itemType: 'text',
        default: ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'NVDA'],
      },
      refreshInterval: {
        type: 'number',
        label: 'Refresh Interval (seconds)',
        min: 30,
        max: 300,
        default: 60,
      },
    },
  },
  crypto: {
    name: 'Crypto Prices',
    component: './widgets/crypto.js',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    settingsSchema: {
      coins: {
        type: 'array',
        label: 'Coins',
        itemType: 'text',
        default: ['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink'],
      },
      currency: {
        type: 'select',
        label: 'Currency',
        options: ['usd', 'eur', 'gbp'],
        default: 'usd',
      },
      refreshInterval: {
        type: 'number',
        label: 'Refresh Interval (seconds)',
        min: 60,
        max: 300,
        default: 60,
      },
    },
  },
};

export function getWidgetRegistry() {
  return WIDGET_REGISTRY;
}

export function getWidgetTypes() {
  return Object.keys(WIDGET_REGISTRY);
}

export function getWidgetDefinition(type) {
  return WIDGET_REGISTRY[type];
}

export async function createWidget(type, id, grid, settings, openSettingsCallback) {
  const definition = WIDGET_REGISTRY[type];
  if (!definition) {
    throw new Error(`Unknown widget type: ${type}`);
  }

  const module = await import(definition.component);
  const WidgetClass = module.default || module[Object.keys(module).find(k => k.endsWith('Widget'))];

  if (!WidgetClass) {
    throw new Error(`Widget class not found in ${definition.component}`);
  }

  const widget = new WidgetClass(id, grid, settings, openSettingsCallback);
  return widget;
}

export function generateWidgetId() {
  return crypto.randomUUID();
}