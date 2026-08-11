# Live News and information dashboard

A self-contained, single-file web app that turns any RSS feed into a full-screen, auto-rotating news slideshow. No build step, no dependencies — just open `dash.html` in a browser.

## Features

- **Auto-rotating slideshow** of news articles with smooth fade transitions and a live progress bar.
- **Topic presets**: World, Technology, Business, Science, and Sports (powered by Google News RSS).
- **Custom RSS feeds**: paste any RSS URL and the billboard will display it.
- **Adjustable rotation speed** (3–60 seconds per article).
- **Navigation controls**: Previous / Pause / Next, plus keyboard shortcuts.
- **Keyboard support**: `←` / `→` to change articles, `Space` to pause/resume.
- **Responsive layout** that adapts for smaller screens.
- **Background refresh** every 10 minutes to keep the feed current.

## Usage

1. Open `dash.html` in any modern web browser.
2. Click **⚙️ Settings** (top-right) to:
   - Choose a news topic or a custom RSS URL.
   - Set the article rotation speed in seconds.
   - Click **Save Changes** to apply and reload the feed.
3. Use the bottom bar or keyboard to browse:
   - **◀ Prev** / **▶ Next** to navigate manually.
   - **⏸ Pause** / **▶ Play** to stop or resume auto-rotation.

## How it works

`dash.html` is fully self-contained — HTML, CSS, and JavaScript live in one file.

- News is fetched through the [rss2json](https://rss2json.com) API, which converts RSS feeds into easy-to-consume JSON.
- Articles are rendered into a card with the source, publish time, headline, snippet, and a link to the original article.
- Images are pulled from the feed's `thumbnail`, `enclosure`, or the first `<img>` found in the description, falling back to a text-only layout when none is available.
- A `requestAnimationFrame` loop drives the progress bar, while `setInterval` handles article rotation and periodic re-fetching.

## Configuration

The following constants can be tweaked directly in the `<script>` block:

| Constant | Default | Description |
| --- | --- | --- |
| `FETCH_INTERVAL_MS` | `10 * 60 * 1000` | How often the feed refreshes in the background. |
| `RSS2JSON_ENDPOINT` | rss2json v1 API | The RSS-to-JSON proxy endpoint. |
| `TOPIC_FEEDS` | Google News RSS URLs | Mapping of topic presets to feed URLs. |

## Notes

- Requires an internet connection for fetching feeds and remote images.
- The rss2json free tier may rate-limit high-traffic usage; supply your own API key in `RSS2JSON_ENDPOINT` if needed.
