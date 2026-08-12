# Feedboard — Live News & Information Dashboard

A full-screen, browser-based dashboard for news and live data, served by a small
Flask backend with no front-end build step. It ships in two flavours from a single
codebase:

- **Dashboard V1** (`/dashboard`) — an auto-rotating, full-screen news slideshow
  with a live clock, weather, and category pills.
- **Dashboard V2** (`/dashboard/v2`) — a customizable widget dashboard on a 12-column
  grid. Add/remove widgets, resize them, tweak per-widget settings, pick a built-in
  layout, and import/export the whole arrangement. Everything persists in the
  browser, so a refresh (or a return visit) restores your widgets, their settings,
  and their positions exactly as you left them.

The front-end is plain HTML/CSS/ES-module JS; all data fetching and rendering happens
client-side (with a small server-side RSS proxy). No bundler, no transpile step.

## Features

### Dashboard V2 (widget grid)
- **Widgets**: Clock, News, Stock Prices, Crypto Prices, and Weather.
- **Composable grid**: 12-column CSS grid; widgets span multiple cells and can be
  resized from their edges/corners.
- **Add / remove anytime**: open the widget picker, drop a widget in, delete it from
  its settings panel.
- **Per-widget settings**: timezone, news categories/custom feeds, stock symbols,
  crypto coins, weather location, refresh intervals, and more.
- **Persistence**: each widget's settings and the grid layout are saved to
  IndexedDB the moment they change. Refresh or revisit and the dashboard is rebuilt
  automatically.
- **Built-in layouts**: apply "Simple" (clock), "Essentials" (clock + weather), or
  "Full Showcase" presets in one click.
- **Import / Export**: download the current layout as JSON or upload one to migrate
  or share dashboards.

### Dashboard V1 (slideshow)
- Auto-rotating news slideshow with smooth fade transitions and a live progress bar.
- Multiple categories (World, Technology, Business, Science, Sports) shown round-robin.
- Custom RSS feeds, adjustable rotation speed (3–60s), keyboard navigation.
- Settings (topics, custom feeds, speed, timezone, weather) persist to IndexedDB.

### Shared
- **Responsive** layouts that adapt to smaller screens.
- **No backend storage**: user state lives entirely in the browser via IndexedDB.
- **RSS proxy**: the server fetches feeds server-side (`/api/rss`) to avoid CORS,
  with an optional rss2json.com fallback.

## Project structure

```
feedboard/
├── app.py                 # Flask entry point (runs on http://localhost:5000)
├── wsgi.py                # WSGI entry point for PythonAnywhere
├── requirements.txt       # Python dependencies (Flask)
├── setup_and_run.sh       # Bootstrap venv + data dir, then run the app
├── README.md
├── docs/                  # PROJECT.md, API_REFERENCE.md, IMPLEMENTATION_CHECKLIST.md
└── app/
    ├── __init__.py        # Flask app factory + routes + /api/rss proxy
    ├── templates/
    │   ├── landing.html       # Marketing/landing page (links to both dashboards)
    │   ├── dashboard.html     # V1 slideshow template
    │   └── dashboard_v2.html  # V2 widget dashboard template
    └── static/
        ├── css/
        │   ├── styles.css       # Shared base + theme variables
        │   ├── landing.css      # Landing page styles
        │   └── dashboard_v2.css # V2-specific styles
        └── js/
            ├── app.js, store.js, config.js, clock.js, news.js,
            │   weather.js, slideshow.js, settings.js   # V1 modules
            ├── db.js            # IndexedDB wrapper (V1 + V2 stores)
            ├── landing.js       # Landing page demo
            ├── vendor/chart.umd.js
            └── dashboard_v2/    # V2 modules
                ├── index.js          # Bootstrap
                ├── grid.js           # CSS-grid init + layout persistence
                ├── widgetRegistry.js # Widget definitions + factory
                ├── widgetSettings.js # Per-widget settings modal
                ├── globalSettings.js # Global V2 settings (Finnhub key)
                ├── widgetPicker.js   # Add-widget modal
                ├── layoutManager.js  # Import/export + apply layout
                ├── layoutModal.js    # Layout manager modal
                ├── builtinLayouts.js # Preset layouts
                └── widgets/
                    ├── base.js     # BaseWidget class
                    ├── clock.js
                    ├── news.js
                    ├── stocks.js
                    ├── crypto.js
                    └── weather.js
```

## Running locally

1. (Optional) Create and activate a virtual environment:
   ```bash
   python3 -m venv ../feedboard-venv
   source ../feedboard-venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server (either directly, or via the helper script which also prepares
   the data directory and `.env`):
   ```bash
   python app.py
   # or
   ./setup_and_run.sh
   ```
4. Open the dashboards in your browser:
   - Landing page: http://localhost:5000/
   - V1 slideshow: http://localhost:5000/dashboard
   - V2 widget dashboard: http://localhost:5000/dashboard/v2

## Configuration

Runtime configuration lives in a `.env` file **outside the repo**, at
`feedboard-data/configs/.env` (next to the repo). Its location is resolved as:

1. `$FEEDBOARD_DATA_DIR/configs/.env` if `FEEDBOARD_DATA_DIR` is set,
2. otherwise `<repo>/../feedboard-data/configs/.env`,
3. otherwise `~/feedboard-data/configs/.env`.

| Key | Required | Default | Description |
| --- | --- | --- | --- |
| `RSS2JSON_API_KEY` | No | _(empty)_ | Optional key for the rss2json.com fallback news source. |
| `V2_REFRESH_INTERVAL_SECONDS` | **Yes** | `60` | Positive integer. Default refresh interval (seconds) for V2 data widgets (news/stocks/crypto); overridable per widget. The app refuses to start if missing or invalid. |

`setup_and_run.sh` writes a placeholder `.env` with `V2_REFRESH_INTERVAL_SECONDS=60`
the first time it runs.

Front-end constants (feed endpoints, topic presets, weather-code maps) live in
`app/static/js/config.js` and can be tweaked without touching the backend.

## Persistence (IndexedDB)

All user state is stored client-side in an IndexedDB database named `feedboard`
(version 2). Four object stores are used:

| Store | Key | Value |
| --- | --- | --- |
| `settings` | `app` | V1 slideshow settings object |
| `widgets` | widget UUID | `{ id, type, ...widgetSettings }` |
| `gridLayout` | `layout` | Ordered array of `{ id, w, h }` |
| `v2Settings` | `global` | `{ finnhubApiKey }` |

**How restore-on-refresh works:** on load, V2 reads the `gridLayout` array (the list
of widget ids in order, with their width/height spans). For each entry it loads that
widget's settings from the `widgets` store and rebuilds the widget. Widget settings
are written to `widgets` the instant a widget is created or its settings are saved,
and the grid layout is written (immediately) whenever a widget is added, removed, or
resized — so nothing is lost on reload.

## V2 widget types

| Type | Name | Default size | Min size | Data source |
|------|------|-------------|----------|-------------|
| `clock` | Clock | 3×2 | 2×2 | Local time |
| `news` | News | 6×4 | 4×3 | Server RSS proxy (+ rss2json fallback) |
| `stocks` | Stock Prices | 4×4 | 3×3 | Finnhub API (key required) |
| `crypto` | Crypto Prices | 4×4 | 3×3 | CoinGecko API |
| `weather` | Weather | 4×3 | 3×3 | Open-Meteo (geocoding + forecast) |

## Data sources / APIs

- **News** — fetched server-side by `/api/rss` (no CORS issues), falling back to
  rss2json.com when an API key is configured.
- **Stocks** — Finnhub `/api/v1/quote`. Requires a free API key, entered in V2 Global
  Settings and stored in IndexedDB (`v2Settings`).
- **Crypto** — CoinGecko `/api/v3/simple/price` (no key; rate-limited, responses cached).
- **Weather** — Open-Meteo geocoding + forecast (no key).

## How it works

- The Flask server renders `landing.html`, `dashboard.html`, and `dashboard_v2.html`
  and serves the static assets. It also exposes `GET /api/rss` to proxy RSS feeds.
- V1 does all fetching/rendering client-side and rotates a single article card.
- V2 boots `dashboard_v2/index.js`, which initializes the grid, restores the saved
  layout from IndexedDB, instantiates each widget from the registry, and starts its
  data timers. User interactions (add, remove, resize, settings, layout presets,
  import/export) persist to IndexedDB.

## Notes

- Requires an internet connection for live feeds, prices, and weather.
- The Finnhub free tier is rate-limited; the Crypto free tier is too — widgets cache
  and respect `Retry-After`.
- See `docs/PROJECT.md` for architecture detail, `docs/API_REFERENCE.md` for the data
  contracts, and `docs/IMPLEMENTATION_CHECKLIST.md` for the build breakdown.
