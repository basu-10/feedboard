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

// Fetch News Data from all selected Endpoints
export async function fetchNews() {
  const feeds = getActiveFeeds();
  if (!feeds.length) {
    titleEl.innerText = "No feeds selected. Select a category or add a custom feed.";
    return;
  }

  titleEl.innerText = "Loading feed content...";

  try {
    const results = await Promise.all(feeds.map(fetchFeed));
    const queue = buildRoundRobinQueue(results);

    if (queue.length > 0) {
      state.articles = queue;
      state.currentIndex = 0;
      renderArticle();
    } else {
      titleEl.innerText = "No articles found for the selected feeds.";
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    titleEl.innerText = "Error fetching news data.";
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
    dateEl.innerText = new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

// Helper: Strip HTML tags and clean up string snippet
export function cleanText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let text = doc.body.textContent || "";
  return text.length > 200 ? text.substring(0, 200) + '...' : text;
}
