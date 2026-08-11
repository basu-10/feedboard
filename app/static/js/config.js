// System Configurations
export const FETCH_INTERVAL_MS = 5 * 60 * 1000; // Background refresh every 5 minutes
export const RSS2JSON_ENDPOINT = 'https://api.rss2json.com/v1/api.json?rss_url=';

export function buildRss2JsonUrl(feedUrl) {
  const apiKey = typeof window !== 'undefined' ? window.RSS2JSON_API_KEY : '';
  const url = `${RSS2JSON_ENDPOINT}${encodeURIComponent(feedUrl)}`;
  if (apiKey) {
    return `${url}&api_key=${apiKey}`;
  }
  return url;
}

export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export const TOPIC_FEEDS = {
  WORLD: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  TECHNOLOGY: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
  BUSINESS: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  SCIENCE: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
  SPORTS: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en'
};

export const WEATHER_CODES = {
  0:  { icon: '☀️', desc: 'Clear sky' },
  1:  { icon: '🌤️', desc: 'Mainly clear' },
  2:  { icon: '⛅', desc: 'Partly cloudy' },
  3:  { icon: '☁️', desc: 'Overcast' },
  45: { icon: '🌫️', desc: 'Fog' },
  48: { icon: '🌫️', desc: 'Rime fog' },
  51: { icon: '🌦️', desc: 'Light drizzle' },
  53: { icon: '🌦️', desc: 'Drizzle' },
  55: { icon: '🌦️', desc: 'Dense drizzle' },
  61: { icon: '🌧️', desc: 'Light rain' },
  63: { icon: '🌧️', desc: 'Rain' },
  65: { icon: '🌧️', desc: 'Heavy rain' },
  71: { icon: '🌨️', desc: 'Light snow' },
  73: { icon: '🌨️', desc: 'Snow' },
  75: { icon: '❄️', desc: 'Heavy snow' },
  80: { icon: '🌦️', desc: 'Rain showers' },
  81: { icon: '🌧️', desc: 'Rain showers' },
  82: { icon: '⛈️', desc: 'Violent showers' },
  95: { icon: '⛈️', desc: 'Thunderstorm' },
  96: { icon: '⛈️', desc: 'Thunderstorm with hail' },
  99: { icon: '⛈️', desc: 'Thunderstorm with hail' }
};

// Human-readable labels for each built-in feed category
export const TOPIC_LABELS = {
  WORLD: 'World News',
  TECHNOLOGY: 'Technology',
  BUSINESS: 'Business',
  SCIENCE: 'Science',
  SPORTS: 'Sports',
  ALL: 'All'
};
