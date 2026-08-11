// System Configurations
const FETCH_INTERVAL_MS = 10 * 60 * 1000; // Background fetch every 10 minutes
const RSS2JSON_ENDPOINT = 'https://api.rss2json.com/v1/api.json?rss_url=';

const TOPIC_FEEDS = {
  WORLD: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  TECHNOLOGY: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
  BUSINESS: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  SCIENCE: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
  SPORTS: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en'
};
