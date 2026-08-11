# Live News and information dashboard

A full-screen, auto-rotating news slideshow powered by RSS feeds. The frontend is plain HTML/CSS/JS served by a small Flask backend. No build step required.

## Features

- **Auto-rotating slideshow** of news articles with smooth fade transitions and a live progress bar.
- **Multiple categories**: select several built-in topics (World, Technology, Business, Science, Sports) shown round-robin — one article per category, then repeating.
- **Custom RSS feeds**: add and remove as many custom feed URLs as you like, grouped separately from the built-ins.
- **Settings persistence**: selected topics, custom feeds, and rotation speed are saved to the browser's IndexedDB — no backend storage needed.
- **Adjustable rotation speed** (3–60 seconds per article).
- **Import / Export**: download all settings as JSON to migrate to another machine, or import a saved file.
- **Navigation controls**: Previous / Pause / Next, plus keyboard shortcuts.
- **Keyboard support**: `←` / `→` to change articles, `Space` to pause/resume.
- **Responsive layout** that adapts for smaller screens.
- **Background refresh** every 10 minutes to keep the feed current.

## Project structure

```
feedboard/
├── app.py              # Entry point: launches the Flask app
├── requirements.txt    # Python dependencies
├── README.md
└── app/
    ├── __init__.py     # Flask app factory (routes)
    ├── templates/
    │   └── index.html  # Frontend markup (uses url_for for assets)
    └── static/
        ├── css/
        │   └── styles.css
        └── js/
            ├── config.js   # Feed endpoints and constants
            ├── db.js       # IndexedDB persistence wrapper
            └── app.js      # Frontend logic (fetch, render, settings)
```

## Running locally

1. (Optional) Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   python3 app.py
   ```
4. Open http://localhost:5000 in your browser.

## Usage

1. Click **⚙️ Settings** (top-right).
2. On the **General** tab:
   - Tick any built-in news topics (round-robin playback).
   - Add custom RSS feeds with **+ Add Custom Feed**; remove with the **−** button.
   - Set the article rotation speed in seconds.
   - Click **Save Changes** to apply and reload the feed.
3. On the **Import / Export** tab, download your settings or import a previously saved JSON file.
4. Use the bottom bar or keyboard to browse:
   - **◀ Prev** / **▶ Next** to navigate manually.
   - **⏸ Pause** / **▶ Play** to stop or resume auto-rotation.

## How it works

- The Flask server serves `index.html` and the static assets; all data fetching and rendering happens client-side.
- News is fetched through the [rss2json](https://rss2json.com) API, which converts RSS feeds into JSON.
- Articles are interleaved round-robin across the selected feeds, then rendered into a card with source, publish time, headline, snippet, and link.
- User settings (topics, custom feeds, rotation speed) are persisted in the browser via IndexedDB.

## Configuration

Frontend constants can be tweaked in `app/static/js/config.js`:

| Constant | Default | Description |
| --- | --- | --- |
| `FETCH_INTERVAL_MS` | `10 * 60 * 1000` | How often the feed refreshes in the background. |
| `RSS2JSON_ENDPOINT` | rss2json v1 API | The RSS-to-JSON proxy endpoint. |
| `TOPIC_FEEDS` | Google News RSS URLs | Mapping of topic presets to feed URLs. |

## Notes

- Requires an internet connection for fetching feeds and remote images.
- The rss2json free tier may rate-limit high-traffic usage; supply your own API key in `RSS2JSON_ENDPOINT` if needed.
