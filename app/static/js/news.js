// Feed fetching, round-robin queue, article rendering
import { RSS2JSON_ENDPOINT, TOPIC_FEEDS, TOPIC_LABELS } from './config.js';
import { state } from './store.js';

// DOM Elements
const card = document.getElementById('articleCard');
const titleEl = document.getElementById('articleTitle');
const snippetEl = document.getElementById('articleSnippet');
const sourceEl = document.getElementById('articleSource');
const dateEl = document.getElementById('articleDate');
const imgEl = document.getElementById('articleImg');
const imgContainer = document.getElementById('imageContainer');
const linkEl = document.getElementById('articleLink');
const counterEl = document.getElementById('articleCounter');

// Keep the relative timestamp of the current article accurate while it's shown
setInterval(() => {
  if (state.articles.length && state.articles[state.currentIndex]) {
    dateEl.innerText = timeAgo(state.articles[state.currentIndex].pubDate);
  }
}, 60000);

// Build the list of active feeds (built-in + custom) for fetching
export function getActiveFeeds() {
  const feeds = [];
  if (state.activeCategory && TOPIC_FEEDS[state.activeCategory]) {
    feeds.push({ topic: state.activeCategory, url: TOPIC_FEEDS[state.activeCategory] });
  }
  for (const feed of state.customFeeds) {
    if (feed.url) feeds.push({ topic: `CUSTOM:${feed.id}`, url: feed.url });
  }
  return feeds;
}

// Fisher-Yates shuffle for variety within a single category
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Fetch a single feed and return its items tagged with the source topic
async function fetchFeed(feed) {
  const cacheBust = `_=${Date.now()}`;
  const response = await fetch(
    `${RSS2JSON_ENDPOINT}${encodeURIComponent(feed.url)}&${cacheBust}`,
    { cache: 'no-store' }
  );
  const data = await response.json();
  if (data.status === 'ok' && data.items.length > 0) {
    return data.items.map(item => ({ ...item, sourceTopic: feed.topic }));
  }
  return [];
}

// Interleave items from each feed round-robin (1 from each, then repeat)
export function buildRoundRobinQueue(feedsItems) {
  const buckets = feedsItems.map(items => shuffle([...items]));
  const queue = [];
  let added = true;

  while (added) {
    added = false;
    for (const bucket of buckets) {
      const item = bucket.shift();
      if (item) {
        queue.push(item);
        added = true;
      }
    }
  }
  return queue;
}

// Sort items newest-first so genuinely fresh articles surface at the top
function sortByDateDesc(items) {
  return [...items].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}

// Drop items we already have (matched by link) so the queue stays fresh
function dedupeAgainst(existing, incoming) {
  const seen = new Set(existing.map(i => i.link));
  return incoming.filter(i => i.link && !seen.has(i.link));
}

// Fetch News Data from all selected Endpoints
// On a background refresh we preserve the current article and slot any
// genuinely new items in front of it, instead of resetting to index 0.
export async function fetchNews({ isRefresh = false } = {}) {
  const feeds = getActiveFeeds();
  if (!feeds.length) {
    titleEl.innerText = "No feeds selected. Select a category or add a custom feed.";
    return;
  }

  if (!isRefresh) titleEl.innerText = "Loading feed content...";

  try {
    const results = await Promise.all(feeds.map(fetchFeed));
    const all = results.flat();
    const queue = sortByDateDesc(buildRoundRobinQueue([all]));

    if (queue.length === 0) {
      if (!isRefresh) titleEl.innerText = "No articles found for the selected feeds.";
      return;
    }

    if (isRefresh && state.articles.length) {
      const current = state.articles[state.currentIndex];
      const fresh = dedupeAgainst(state.articles, queue);
      if (fresh.length === 0) return; // nothing new; keep current view
      state.articles = [...fresh, ...state.articles];
      // Keep the article the user is currently viewing in place
      const idx = state.articles.findIndex(i => i.link === current?.link);
      state.currentIndex = idx >= 0 ? idx : 0;
      renderArticle();
    } else {
      state.articles = queue;
      state.currentIndex = 0;
      renderArticle();
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    if (!isRefresh) titleEl.innerText = "Error fetching news data.";
  }
}

export function renderArticle() {
  if (!state.articles.length) return;

  const item = state.articles[state.currentIndex];

  // Fade transition out
  card.classList.add('fade');

  setTimeout(() => {
    // Extract Image Link
    let imageUrl = item.thumbnail || item.enclosure?.link || extractImgFromHTML(item.description);

    if (imageUrl) {
      imgEl.src = imageUrl;
      imgContainer.style.display = 'block';
      card.classList.remove('no-image');
    } else {
      imgContainer.style.display = 'none';
      card.classList.add('no-image');
    }

    // Set Text Fields
    titleEl.innerText = item.title;
    snippetEl.innerText = cleanText(item.description || item.content);
    sourceEl.innerText = item.author || TOPIC_LABELS[item.sourceTopic] || item.sourceTopic;
    dateEl.innerText = timeAgo(item.pubDate);
    linkEl.href = item.link;
    counterEl.innerText = `${state.currentIndex + 1} / ${state.articles.length}`;

    // Fade transition in
    card.classList.remove('fade');
  }, 300);
}

// Helper: Extract First Image Tag from RSS Description HTML
export function extractImgFromHTML(html) {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
}

// Helper: Format a publish date as "X minutes/hours ago"
export function timeAgo(pubDate) {
  const then = new Date(pubDate).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Helper: Strip HTML tags and clean up string snippet
export function cleanText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let text = doc.body.textContent || "";
  return text.length > 200 ? text.substring(0, 200) + '...' : text;
}
