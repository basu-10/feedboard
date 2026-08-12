# Feedboard - Live News Dashboard

## Project Overview

Feedboard is a Flask-based web application with two dashboard versions:
- **Dashboard V1** (`/dashboard`) - Full-screen auto-rotating news slideshow with clock, weather, and category pills
- **Dashboard V2** (`/dashboard/v2`) - Widget-based drag-and-drop dashboard using Gridstack.js

## Tech Stack

- **Backend**: Flask 3.0+ (Python)
- **Frontend**: Vanilla JS + ES Modules (no build step)
- **Grid System**: Gridstack.js v10.0.0 (via jsDelivr CDN)
- **Storage**: IndexedDB (client-side only)
- **APIs**:
  - News: rss2json.com (Google News RSS feeds)
  - Stocks: Finnhub.io (requires API key)
  - Crypto: CoinGecko API (free, rate limited)
  - Weather: Open-Meteo (geocoding + forecast)

## Directory Structure

```
feedboard/
├── app.py                    # Flask entry point
├── wsgi.py                   # WSGI entry point for production
├── requirements.txt          # Flask>=3.0
├── setup_and_run.sh          # Setup script
├── app/
│   ├── __init__.py           # Flask app factory, routes
│   ├── templates/
│   │   ├── landing.html      # Landing page with links to both dashboards
│   │   ├── dashboard.html    # V1 dashboard template
│   │   └── dashboard_v2.html # V2 dashboard template
│   └── static/
│       ├── css/
│       │   ├── styles.css    # Shared styles (V1 + V2)
│       │   ├── landing.css   # Landing page styles
│       │   └── dashboard_v2.css # V2-specific styles
│       └── js/
│           ├── app.js              # V1 bootstrap
│           ├── store.js            # V1 shared state
│           ├── config.js           # V1 config (RSS feeds, weather codes)
│           ├── clock.js            # V1 clock formatting
│           ├── news.js             # V1 news fetching/rendering
│           ├── weather.js          # V1 weather
│           ├── slideshow.js        # V1 rotation timer
│           ├── settings.js         # V1 settings modal
│           ├── db.js               # IndexedDB wrapper (V1 + V2 stores)
│           ├── landing.js          # Landing page demo
│           └── dashboard_v2/       # V2 modules
│               ├── index.js        # V2 bootstrap
│               ├── grid.js         # Gridstack init + layout persistence
│               ├── widgetRegistry.js # Widget definitions + factory
│               ├── widgetSettings.js # Per-widget settings modal
│               ├── globalSettings.js # Global V2 settings (Finnhub key)
│               ├── widgetPicker.js # Widget picker modal
│               └── widgets/
│                   ├── base.js     # BaseWidget class
│                   ├── clock.js    # Clock widget
│                   ├── news.js     # News widget
│                   ├── stocks.js   # Stock prices widget
│                   └── crypto.js   # Crypto prices widget
feedboard-venv/
feedboard-data/
├── configs/
│   └── dashboard_v2.html
├── logs/
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with links to both dashboards |
| `/dashboard` | V1 - News slideshow dashboard |
| `/dashboard/v2` | V2 - Widget-based drag-and-drop dashboard |

## IndexedDB Schema (DB_VERSION = 2)

### Store: `settings` (V1)
- Key: `app` - V1 settings object

### Store: `widgets` (V2)
- Key: widget UUID - Widget config: `{ id, type, ...settings }`

### Store: `gridLayout` (V2)
- Key: `layout` - Gridstack layout array

### Store: `v2Settings` (V2)
- Key: `global` - Global V2 settings: `{ finnhubApiKey }`

## V2 Widget Types

| Type | Name | Default Size | Min Size | Data Source |
|------|------|-------------|----------|-------------|
| `clock` | Clock | 3×2 | 2×2 | Local |
| `news` | News | 6×4 | 4×3 | rss2json.com |
| `stocks` | Stock Prices | 4×4 | 3×3 | Finnhub API |
| `crypto` | Crypto Prices | 4×4 | 3×3 | CoinGecko API |

## V2 Architecture

```
User visits /dashboard/v2
    → Flask renders dashboard_v2.html
    → index.js loads
    → grid.js loads Gridstack from CDN, initializes 12-col grid
    → grid.js loads layout from IndexedDB (gridLayout store)
    → For each widget in layout:
        → widgetRegistry.createWidget(type, id, grid, settings)
        → widget loads settings from IndexedDB (widgets store)
        → widget.render() called
        → Widget starts data fetching timers
    → User interactions:
        → Drag/resize → grid.js saves layout (debounced 300ms)
        → Settings click → widgetSettings.js opens modal → saves to widgets store
        → Add widget → widgetPicker → grid.js adds widget → saves layout
        → Global settings → globalSettings.js → saves to v2Settings store
```

## Key Implementation Details

### Gridstack Configuration
- 12 columns
- `cellHeight: 'auto'`
- `margin: 10`
- `dragHandle: '.widget-header'`
- `resizeHandles: 'e, se, s, sw, w'`

### Widget Lifecycle
1. `constructor(id, grid, settings, openSettingsCallback)`
2. `render()` - mounts HTML, binds events
3. `onRender()` - widget-specific initialization
4. `setSettings(newSettings)` - merges, persists, re-renders
5. `destroy()` - cleans up timers, listeners, DOM

### Settings Modal
- Single modal reused for all widget types
- Dynamic form generation from `settingsSchema` in widgetRegistry
- Supports: text, number, select, radio, checkbox, array (for lists)
- "Delete Widget" button in footer

### Global Settings
- Separate modal for Finnhub API key (required for stocks widget)
- Persists to `v2Settings` store

## API Keys

### RSS2JSON (News)
- Optional, loaded from `~/feedboard-data/configs/.env` as `RSS2JSON_API_KEY`
- Passed to templates via `rss2json_api_key` variable

### V2 Auto-Fetch Interval
- **REQUIRED** — loaded from `~/feedboard-data/configs/.env` as `V2_REFRESH_INTERVAL_SECONDS` (positive integer, seconds)
- The app raises a `RuntimeError` on startup if this key is missing, not an integer, or not positive
- Sets the default refresh interval for V2 widgets (stocks, crypto); overridable per-widget via the widget settings modal
- Passed to the V2 template as `window.V2_REFRESH_INTERVAL_SECONDS`

### Finnhub (Stocks)
- Required for Stock Prices widget
- Entered via Global Settings modal in V2
- Stored in IndexedDB (`v2Settings` store)

### CoinGecko (Crypto)
- No API key required
- Rate limited: 10-30 requests/minute
- Cache responses, respect `Retry-After` header

## Running the Project

```bash
# Install dependencies
pip install -r requirements.txt

# Set up data directory (optional, for RSS2JSON key)
mkdir -p ~/feedboard-data/configs
echo "RSS2JSON_API_KEY=your_key_here" > ~/feedboard-data/configs/.env

# Run development server
python app.py
# or
./setup_and_run.sh
```

Server runs on `http://0.0.0.0:7887`

## Development Notes

### Adding a New Widget Type
1. Create `app/static/js/dashboard_v2/widgets/newwidget.js` extending `BaseWidget`
2. Add entry to `WIDGET_REGISTRY` in `widgetRegistry.js`
3. Define `settingsSchema` with form field definitions
4. Widget auto-appears in widget picker

### V1 vs V2 Differences
- V1: Single full-screen article card, auto-rotating, category pills in top bar
- V2: Multiple widgets in grid, drag-and-drop, per-widget settings, persistent layout

### Shared Code
- `db.js` - Used by both V1 and V2 (different stores)
- `config.js` - V1 config, V2 news widget reuses `TOPIC_FEEDS`, `TOPIC_LABELS`, `buildRss2JsonUrl`
- `styles.css` - Shared CSS variables and base styles

## Known Issues / Future Improvements

- [ ] Weather widget in V2 (currently only in V1 top bar)
- [ ] Sparkline charts for stocks/crypto
- [ ] WebSocket real-time updates
- [ ] Multi-user/auth support
- [ ] Server-side caching/proxy for API rate limits
- [ ] Widget marketplace/import-export
- [ ] Twitter/Substack widgets

## File Reference for Common Tasks

| Task | Files to Modify |
|------|----------------|
| Add new V2 widget | `widgetRegistry.js`, `widgets/newwidget.js` |
| Change grid columns | `grid.js` (Gridstack init options) |
| Modify V1 news sources | `config.js` (`TOPIC_FEEDS`) |
| Add global V2 setting | `globalSettings.js`, `db.js` (v2Settings store) |
| Change widget default size | `widgetRegistry.js` (defaultSize) |
| Modify V2 styles | `dashboard_v2.css` |
| Add new Flask route | `app/__init__.py` |