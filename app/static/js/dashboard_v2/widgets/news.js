import { BaseWidget } from './base.js';
import { buildRssProxyUrl, buildRss2JsonUrl, TOPIC_FEEDS, TOPIC_LABELS } from '../../config.js';

const DEFAULT_REFRESH_INTERVAL = (() => {
  const env = window.V2_REFRESH_INTERVAL_SECONDS;
  return Number.isFinite(env) && env > 0 ? env : 600;
})();

export class NewsWidget extends BaseWidget {
  static widgetType = 'news';
  static widgetName = 'News';

  constructor(id, grid, settings = {}, openSettingsCallback) {
    super(id, grid, settings, openSettingsCallback);
    this.articles = [];
    this.currentIndex = 0;
    this.rotationTimer = null;
    this.progressTimer = null;
    this.refreshTimer = null;
    this.progressStartTime = 0;
    this.isPaused = false;
  }

  static getDefaultSettings() {
    return {
      mode: 'single',
      category: 'WORLD',
      customFeeds: [],
      rotationSpeed: 8,
      autoRotate: true,
      refreshInterval: DEFAULT_REFRESH_INTERVAL,
    };
  }

  async onRender() {
    this.showLoading();
    await this.fetchNews();
    this.renderArticle();
    if (this.settings.autoRotate) {
      this.startRotation();
    }
    this.startAutoRefresh();
  }

  startAutoRefresh() {
    this.refreshTimer = setInterval(() => {
      this.fetchNews({ isRefresh: true });
    }, this.settings.refreshInterval * 1000);
    this.timers.push(this.refreshTimer);
  }

  getActiveFeeds() {
    const { mode, category, customFeeds } = this.settings;
    const feeds = [];

    if (mode === 'all') {
      for (const [topic, url] of Object.entries(TOPIC_FEEDS)) {
        feeds.push({ topic, url });
      }
    } else if (category && TOPIC_FEEDS[category]) {
      feeds.push({ topic: category, url: TOPIC_FEEDS[category] });
    }

    for (const feed of customFeeds) {
      if (feed.url) {
        feeds.push({ topic: `CUSTOM:${feed.id}`, url: feed.url });
      }
    }

    return feeds;
  }

  async fetchNews({ isRefresh = false } = {}) {
    const feeds = this.getActiveFeeds();
    if (!feeds.length) {
      this.showError('No feeds selected. Open settings to configure.');
      return;
    }

    if (!isRefresh) {
      this.showLoading('Loading feed content...');
    }

    try {
      const results = await Promise.all(feeds.map(feed => this.fetchFeed(feed)));

      let queue;
      if (this.settings.mode === 'all') {
        const perTopic = results.map(items => this.sortByDateDesc(items));
        queue = this.buildRoundRobinQueue(perTopic);
      } else {
        const all = results.flat();
        queue = this.sortByDateDesc(this.buildRoundRobinQueue([all]));
      }

      if (queue.length === 0) {
        if (!isRefresh) {
          this.showError('No articles found for the selected feeds.');
        }
        return;
      }

      if (isRefresh && this.articles.length) {
        const current = this.articles[this.currentIndex];
        const fresh = this.dedupeAgainst(this.articles, queue);
        if (fresh.length === 0) return;
        this.articles = [...fresh, ...this.articles];
        const idx = this.articles.findIndex(i => i.link === current?.link);
        this.currentIndex = idx >= 0 ? idx : 0;
      } else {
        this.articles = queue;
        this.currentIndex = 0;
      }

      this.renderArticle();
    } catch (error) {
      console.error('Fetch Error:', error);
      if (!isRefresh) {
        this.showError('Error fetching news data.');
      }
    }
  }

  async fetchFeed(feed) {
    try {
      return await this.fetchViaProxy(feed);
    } catch (proxyError) {
      console.warn(`[Proxy failed, trying rss2json] ${feed.topic} :: ${feed.url}`, proxyError);
      try {
        return await this.fetchViaRss2Json(feed);
      } catch (error) {
        console.error(`[Feed fetch failed] ${feed.topic} :: ${feed.url}`, error);
        throw error;
      }
    }
  }

  async fetchViaProxy(feed) {
    const url = `${buildRssProxyUrl(feed.url)}&_=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
      return data.items.map(item => ({ ...item, sourceTopic: feed.topic }));
    }
    return [];
  }

  async fetchViaRss2Json(feed) {
    const url = `${buildRss2JsonUrl(feed.url)}&_=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.status === 'ok' && data.items.length > 0) {
      return data.items.map(item => ({ ...item, sourceTopic: feed.topic }));
    }
    return [];
  }

  buildRoundRobinQueue(feedsItems) {
    const buckets = feedsItems.map(items => this.shuffle([...items]));
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

  sortByDateDesc(items) {
    return [...items].sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  dedupeAgainst(existing, incoming) {
    const seen = new Set(existing.map(i => i.link));
    return incoming.filter(i => i.link && !seen.has(i.link));
  }

  renderArticle() {
    if (!this.articles.length || !this.contentEl) return;

    const item = this.articles[this.currentIndex];

    this.contentEl.classList.add('fade');

    setTimeout(() => {
      let imageUrl = item.thumbnail || item.enclosure?.link || this.extractImgFromHTML(item.description);

      let imageHtml = '';
      if (imageUrl) {
        imageHtml = `<img class="news-image" src="${imageUrl}" alt="">`;
      }

      const sourceLabel = item.author || TOPIC_LABELS[item.sourceTopic] || item.sourceTopic;

      this.contentEl.innerHTML = `
        <div class="news-article">
          ${imageHtml}
          <div class="news-content">
            <div class="news-meta">
              <span class="news-source">${sourceLabel}</span>
              <span class="news-date">${this.timeAgo(item.pubDate)}</span>
            </div>
            <h2 class="news-title">${item.title}</h2>
            <p class="news-snippet">${this.cleanText(item.description || item.content)}</p>
            <a href="${item.link}" target="_blank" class="news-read-more">Read original article ↗</a>
          </div>
        </div>
        <div class="news-nav">
          <button class="news-nav-btn" data-action="prev" aria-label="Previous article">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="15" y1="18" x2="9" y2="12"></line>
              <line x1="15" y1="6" x2="9" y2="12"></line>
            </svg>
          </button>
          <span class="news-counter">${this.currentIndex + 1} / ${this.articles.length}</span>
          <button class="news-nav-btn" data-action="next" aria-label="Next article">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="9" y1="6" x2="15" y2="12"></line>
              <line x1="9" y1="18" x2="15" y2="12"></line>
            </svg>
          </button>
          <button class="news-nav-btn" data-action="pause" aria-label="${this.isPaused ? 'Play' : 'Pause'}">
            ${this.isPaused
              ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21"></polygon></svg>`
              : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
            }
          </button>
        </div>
        <div class="news-progress-container">
          <div class="news-progress-bar" id="newsProgressBar"></div>
        </div>
      `;

      this.bindArticleEvents();
      this.contentEl.classList.remove('fade');
      this.restartProgressBar();
    }, 300);
  }

  bindArticleEvents() {
    const prevBtn = this.contentEl.querySelector('[data-action="prev"]');
    const nextBtn = this.contentEl.querySelector('[data-action="next"]');
    const pauseBtn = this.contentEl.querySelector('[data-action="pause"]');

    if (prevBtn) {
      const handler = () => this.prevArticle();
      prevBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: prevBtn, event: 'click', handler });
    }

    if (nextBtn) {
      const handler = () => this.nextArticle();
      nextBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: nextBtn, event: 'click', handler });
    }

    if (pauseBtn) {
      const handler = () => this.togglePause();
      pauseBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: pauseBtn, event: 'click', handler });
    }
  }

  nextArticle() {
    if (!this.articles.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.articles.length;
    this.renderArticle();
    this.restartProgressBar();
  }

  prevArticle() {
    if (!this.articles.length) return;
    this.currentIndex = (this.currentIndex - 1 + this.articles.length) % this.articles.length;
    this.renderArticle();
    this.restartProgressBar();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      clearInterval(this.rotationTimer);
      cancelAnimationFrame(this.progressTimer);
    } else if (this.settings.autoRotate) {
      this.startRotation();
    }
    this.renderArticle();
  }

  startRotation() {
    clearInterval(this.rotationTimer);
    this.rotationTimer = setInterval(() => {
      if (!this.isPaused) {
        this.nextArticle();
      }
    }, this.settings.rotationSpeed * 1000);
    this.timers.push(this.rotationTimer);
  }

  restartProgressBar() {
    const progressBar = this.contentEl?.querySelector('.news-progress-bar');
    if (!progressBar) return;

    cancelAnimationFrame(this.progressTimer);
    progressBar.style.width = '0%';

    if (this.isPaused || !this.settings.autoRotate) return;

    this.progressStartTime = performance.now();
    this.updateProgressBar();
  }

  updateProgressBar() {
    const progressBar = this.contentEl?.querySelector('.news-progress-bar');
    if (!progressBar || this.isPaused) return;

    const elapsed = performance.now() - this.progressStartTime;
    const progress = Math.min((elapsed / (this.settings.rotationSpeed * 1000)) * 100, 100);
    progressBar.style.width = `${progress}%`;

    if (progress < 100) {
      this.progressTimer = requestAnimationFrame(() => this.updateProgressBar());
    }
  }

  extractImgFromHTML(html) {
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : null;
  }

  timeAgo(pubDate) {
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

  cleanText(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let text = doc.body.textContent || "";
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  }

  async setSettings(newSettings) {
    const oldAutoRotate = this.settings.autoRotate;
    const oldRotationSpeed = this.settings.rotationSpeed;
    const oldRefreshInterval = this.settings.refreshInterval;
    await super.setSettings(newSettings);

    if (newSettings.mode !== undefined || newSettings.category !== undefined || newSettings.customFeeds !== undefined) {
      await this.fetchNews();
    }

    if (newSettings.autoRotate !== undefined) {
      if (newSettings.autoRotate && !oldAutoRotate) {
        this.startRotation();
      } else if (!newSettings.autoRotate && oldAutoRotate) {
        clearInterval(this.rotationTimer);
        cancelAnimationFrame(this.progressTimer);
      }
    }

    if (newSettings.rotationSpeed !== undefined && newSettings.rotationSpeed !== oldRotationSpeed) {
      if (this.settings.autoRotate && !this.isPaused) {
        this.startRotation();
      }
    }

    if (newSettings.refreshInterval !== undefined && newSettings.refreshInterval !== oldRefreshInterval) {
      clearInterval(this.refreshTimer);
      this.startAutoRefresh();
    }
  }

  destroy() {
    clearInterval(this.rotationTimer);
    clearInterval(this.refreshTimer);
    cancelAnimationFrame(this.progressTimer);
    super.destroy();
  }
}