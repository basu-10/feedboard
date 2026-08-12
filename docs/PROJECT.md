# Feedboard - Live News & Information Dashboard

## Project Overview

Feedboard is a Flask-based web application with two dashboard experiences:
- **Dashboard V1** (`/dashboard`) - Full-screen auto-rotating news slideshow with clock, weather, and category pills.
- **Dashboard V2** (`/dashboard/v2`) - A customizable widget dashboard on a 12-column CSS grid (no third-party grid library). Widgets can be added, removed, and resized; their settings and layout persist to the browser.

## Tech Stack

- **Backend**: Flask 3.0+ (Python)
- **Frontend**: Vanilla JS + ES Modules (no build step)
- **Grid System**: Custom 12-column CSS Grid (`.css-grid` / `#grid`), with manual resize handles. No Gridstack / no CDN grid dependency.
- **Storage**: IndexedDB (client-side only)
- **APIs**:
  - News: server-side `/api/rss` proxy (Google News RSS feeds), with optional rss2json.com fallback
  - Stocks: Finnhub.io (requires API key)
  - Crypto: CoinGecko API (free, rate limited)
  - Weather: Open-Meteo (geocoding + forecast)

## Directory Structure

```
feedboard/
├── app.py                    # Flask entry point (port 5000)
├── wsgi.py                   # WSGI entry point for production (PythonAnywhere)
├── requirements.txt          # Flask>=3.0
├── setup_and_run.sh          # Bootstrap venv + data dir, then run
├── app/
│   ├── __init__.py           # Flask app factory, routes, /api/rss proxy
│   ├── templates/
│   │   ├── landing.html      # Landing/marketing page with links to both dashboards
│   │   ├── dashboard.html    # V1 dashboard template
│   │   └── dashboard_v2.html # V2 dashboard template
│   └── static/
│       ├── css/
│       │   ├── styles.css    # Shared styles (theme variables, base)
│       │   ├── landing.css   # Landing page styles
│       │   └── dashboard_v2.css # V2-specific styles
│       └── js/
│           ├── app.js              # V1 bootstrap
│           ├── store.js            # V1 shared state
│           ├── config.js           # Feed endpoints, topic presets, weather codes
│           ├── clock.js            # V1 clock formatting
│           ├── news.js             # V1 news fetching/rendering
│           ├── weather.js          # V1 weather
│           ├── slideshow.js        # V1 rotation timer
│           ├── settings.js         # V1 settings modal
│           ├── db.js               # IndexedDB wrapper (V1 + V2 stores)
│           ├── landing.js          # Landing page demo
│           ├── vendor/chart.umd.js # Chart.js (used by some widgets)
│           └── dashboard_v2/       # V2 modules
│               ├── index.js        # V2 bootstrap
│               ├── grid.js         # Custom CSS-grid init + layout persistence
│               ├── widgetRegistry.js # Widget definitions + factory
│               ├── widgetSettings.js # Per-widget settings modal
│               ├── globalSettings.js # Global V2 settings (Finnhub key)
│               ├── widgetPicker.js # Widget picker modal
│               ├── layoutManager.js # Import/export + apply layout
│               ├── layoutModal.js  # Layout manager modal
│               ├── builtinLayouts.js # Preset layouts
│               └── widgets/
│                   ├── base.js     # BaseWidget class
│                   ├── clock.js    # Clock widget
│                   ├── news.js     # News widget
│                   ├── stocks.js   # Stock prices widget
│                   ├── crypto.js   # Crypto prices widget
│                   └── weather.js  # Weather widget
feedboard-venv/              # virtual environment (created by setup_and_run.sh)
feedboard-data/
├── configs/
│   └── .env                  # RSS2JSON_API_KEY (optional), V2_REFRESH_INTERVAL_SECONDS (required)
├── logs/
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with links to both dashboards |
| `/dashboard` | V1 - News slideshow dashboard |
| `/dashboard/v2` | V2 - Widget-based dashboard |
| `/api/rss` | Server-side RSS proxy (`?rss_url=`) used by the news widget |

## Configuration

Runtime config lives in `feedboard-data/configs/.env` (resolved from
`$FEEDBOARD_DATA_DIR`, then `<repo>/../feedboard-data`, then `~/feedboard-data`):

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `RSS2JSON_API_KEY` | No | _(empty)_ | Optional key for the rss2json.com news fallback. |
| `V2_REFRESH_INTERVAL_SECONDS` | **Yes** | `60` | Positive integer. Default refresh interval (s) for V2 data widgets; overridable per widget. App refuses to start if missing/invalid. |

## IndexedDB Schema (DB_VERSION = 2)

Database name: `feedboard`. Four object stores:

### Store: `settings` (V1)
- Key: `app` - V1 settings object

### Store: `widgets` (V2)
- Key: widget UUID - Widget config: `{ id, type, ...settings }`

### Store: `gridLayout` (V2)
- Key: `layout` - Ordered array of `{ id, w, h }` (one entry per widget, in display order). `w`/`h` are column/row spans on the 12-column CSS grid.

### Store: `v2Settings` (V2)
- Key: `global` - Global V2 settings: `{ finnhubApiKey }`

## V2 Widget Types

| Type | Name | Default Size | Min Size | Data Source |
|------|------|-------------|----------|-------------|
| `clock` | Clock | 3×2 | 2×2 | Local time |
| `news` | News | 6×4 | 4×3 | `/api/rss` proxy (+ rss2json fallback) |
| `stocks` | Stock Prices | 4×4 | 3×3 | Finnhub API |
| `crypto` | Crypto Prices | 4×4 | 3×3 | CoinGecko API |
| `weather` | Weather | 4×3 | 3×3 | Open-Meteo (geocoding + forecast) |

## V2 Architecture

```
User visits /dashboard/v2
    → Flask renders dashboard_v2.html
    → index.js loads
    → grid.js initializes the 12-column CSS grid (#grid)
    → grid.js loads the saved layout from IndexedDB (gridLayout store: ordered [{id, w, h}])
    → For each entry:
        → widgetRegistry.createWidget(type, id, grid, settings)
        → widget loads its settings from IndexedDB (widgets store)
        → widget.buildElement() + render()
        → Widget starts its data-fetch timers
    → User interactions:
        → Add widget  → widgetPicker → saveWidgetSettings() → grid.addWidget() → persistLayout() (immediate)
        → Remove widget → settings modal → grid.removeWidget() → persistLayout() (immediate)
        → Resize → drag handles → grid.startResize() → persistLayout() (immediate)
        → Settings click → widgetSettings.js → saveWidgetSettings() (widgets store)
        → Built-in layout → layoutManager.applyLayout() (replaces widgets + gridLayout stores)
        → Global settings → globalSettings.js → saveV2Settings() (v2Settings store)
        → Import/Export → layoutManager.exportLayout()/importLayout()
```

On refresh, the saved `gridLayout` array drives restore: each `{ id, w, h }` is
matched to its settings in the `widgets` store and rebuilt. Widget settings are
written the instant a widget is created or edited, and the grid layout is written
immediately on every add/remove/resize — so state is never lost on reload.

## Key Implementation Details

### Grid Configuration (custom CSS grid)
- 12 columns, `display: grid`, `grid-auto-flow: row dense`.
- Each widget spans `grid-column: span w` / `grid-row: span h`.
- Resize handles: `e`, `s`, `se` (attached in `grid.js` `attachResizeHandles`).
- No drag-and-drop reordering; order follows the DOM / saved layout array.

### Widget Lifecycle
1. `constructor(id, grid, settings, openSettingsCallback)`
2. `buildElement()` - creates the card DOM, sets `dataset.widgetId` / `dataset.widgetType`
3. `render()` / `onRender()` - widget-specific mount + data fetch
4. `setSettings(newSettings)` - merges, persists (widgets store), re-renders
5. `destroy()` - clears timers, listeners, removes DOM

### Settings Modal
- Single modal reused for all widget types.
- Dynamic form generated from each widget's `settingsSchema` (in `widgetRegistry`).
- Field types: text, number, select, radio, checkbox, array.
- "Delete Widget" button removes the widget and its stored settings.

### Global Settings
- Separate modal for the Finnhub API key (required for the stocks widget).
- Persists to the `v2Settings` store.

### Built-in Layouts
- Defined in `builtinLayouts.js`: `simple`, `essentials`, `flagship`.
- Applied via `layoutManager.applyLayout()`, which clears both stores and re-seeds.

## API Keys

### RSS2JSON (News, optional)
- Loaded from `feedboard-data/configs/.env` as `RSS2JSON_API_KEY`.
- Passed to templates as `window.RSS2JSON_API_KEY`; used only as a fallback when `/api/rss` fails.

### V2 Auto-Fetch Interval (required)
- Loaded from `feedboard-data/configs/.env` as `V2_REFRESH_INTERVAL_SECONDS` (positive integer, seconds).
- The app raises a `RuntimeError` on startup if missing, non-integer, or not positive.
- Sets the default refresh interval for V2 data widgets; overridable per-widget.
- Passed to the V2 template as `window.V2_REFRESH_INTERVAL_SECONDS`.

### Finnhub (Stocks)
- Required for the Stock Prices widget.
- Entered via the Global Settings modal in V2.
- Stored in IndexedDB (`v2Settings` store).

### CoinGecko (Crypto)
- No API key required; rate limited (cache responses, respect `Retry-After`).

### Open-Meteo (Weather)
- No API key required; geocoding + current-conditions forecast.

## Running the Project

```bash
# Install dependencies
pip install -r requirements.txt

# (Optional) prepare data dir + .env
mkdir -p ~/feedboard-data/configs
echo "RSS2JSON_API_KEY=your_key_here" > ~/feedboard-data/configs/.env
echo "V2_REFRESH_INTERVAL_SECONDS=60" >> ~/feedboard-data/configs/.env

# Run
python app.py
# or bootstrap everything via:
./setup_and_run.sh
```

Server runs on `http://localhost:5000`.

## Development Notes

### Adding a New Widget Type
1. Create `app/static/js/dashboard_v2/widgets/newwidget.js` extending `BaseWidget`.
2. Add an entry to `WIDGET_REGISTRY` in `widgetRegistry.js` (with `settingsSchema`, `defaultSize`, `minSize`).
3. The widget auto-appears in the picker.

### V1 vs V2
- V1: single full-screen article card, auto-rotating, category pills in the top bar.
- V2: multiple widgets in a grid, resize, per-widget settings, persistent layout + import/export.

### Shared Code
- `db.js` - Used by both V1 and V2 (different stores).
- `config.js` - V1 config; the V2 news widget reuses `TOPIC_FEEDS`, `TOPIC_LABELS`, `buildRssProxyUrl`, `buildRss2JsonUrl`.
- `styles.css` - Shared CSS variables and base styles.

## Known Issues / Future Improvements
- [ ] Drag-and-drop reordering of widgets on the grid
- [ ] Sparkline charts for stocks/crypto
- [ ] WebSocket real-time updates
- [ ] Multi-user/auth support
- [ ] Server-side caching for API rate limits
- [ ] Widget marketplace / richer import-export

## File Reference for Common Tasks

| Task | Files to Modify |
|------|----------------|
| Add new V2 widget | `widgetRegistry.js`, `widgets/newwidget.js` |
| Change grid columns | `dashboard_v2.css` (`.css-grid`) |
| Modify V1 news sources | `config.js` (`TOPIC_FEEDS`) |
| Add global V2 setting | `globalSettings.js`, `db.js` (`v2Settings` store) |
| Change widget default size | `widgetRegistry.js` (`defaultSize`) |
| Modify V2 styles | `dashboard_v2.css` |
| Add new Flask route | `app/__init__.py` |
