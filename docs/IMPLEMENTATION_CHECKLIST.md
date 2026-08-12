# Dashboard V2 Implementation Checklist

## Completed Tasks ✅

### 1. Database Layer (`db.js`)
- [x] Added `widgets` object store (key: widget UUID)
- [x] Added `gridLayout` object store (key: `layout`)
- [x] Added `v2Settings` object store (key: `global`)
- [x] Exported: `loadWidgetSettings`, `saveWidgetSettings`, `loadAllWidgetSettings`, `deleteWidgetSettings`
- [x] Exported: `loadGridLayout`, `saveGridLayout`
- [x] Exported: `loadV2Settings`, `saveV2Settings`
- [x] DB_VERSION incremented to 2

### 2. Grid System (`dashboard_v2/grid.js`)
- [x] Initialize 12-column CSS grid (`#grid`, `.css-grid`) — no third-party grid library
- [x] Compute column/row spans (`grid-column: span w` / `grid-row: span h`)
- [x] Attach resize handles (`e`, `s`, `se`) via `attachResizeHandles`
- [x] Load persisted `gridLayout` on init (ordered `{ id, w, h }`)
- [x] Persist layout **immediately** on add / remove / resize (no debounce)
- [x] Handle widget add/remove via the custom `addWidget` / `removeWidget` API
- [x] Expose `grid` instance via `getGrid()`

### 3. Widget Registry (`dashboard_v2/widgetRegistry.js`)
- [x] Defined 5 widget types with metadata (clock, news, stocks, crypto, weather)
- [x] Factory function `createWidget(type, id, grid, settings)`
- [x] Dynamic import of widget component modules
- [x] `generateWidgetId()` using `crypto.randomUUID()`

### 4. Base Widget Class (`dashboard_v2/widgets/base.js`)
- [x] Abstract `BaseWidget` class
- [x] Constructor: id, grid, settings, openSettingsCallback
- [x] `buildElement()`, `render()`, `destroy()`, `getSettings()`, `setSettings()`
- [x] `getDefaultSettings()` static method
- [x] `openSettings()` triggers settings modal
- [x] Timer management (`startTimer`, `stopAllTimers`)
- [x] Event listener management
- [x] Error/loading state helpers

### 5. Clock Widget (`dashboard_v2/widgets/clock.js`)
- [x] Reuses V1 formatting logic
- [x] Settings: timezone (select), format (12h/24h), showSeconds, showDate
- [x] Real-time update via setInterval(1000)

### 6. News Widget (`dashboard_v2/widgets/news.js`)
- [x] Fetches via server `/api/rss` proxy (rss2json fallback)
- [x] Settings: mode (single/all), category, customFeeds[], rotationSpeed, autoRotate, refreshInterval
- [x] Display: headline + snippet, prev/next nav, rotation progress bar
- [x] Reuses: fetchFeed, renderArticle, timeAgo, cleanText, buildRoundRobinQueue

### 7. Stocks Widget (`dashboard_v2/widgets/stocks.js`)
- [x] Settings: symbols[], displayMode (table/chart), chartMetric, refreshInterval (min 30s)
- [x] Data: Finnhub `/api/v1/quote?symbol={symbol}&token={API_KEY}`
- [x] Parallel fetch, cache for refreshInterval
- [x] Display: table with symbol, price, change, change%
- [x] Color-code changes (green/red)
- [x] Handle missing API key gracefully

### 8. Crypto Widget (`dashboard_v2/widgets/crypto.js`)
- [x] Settings: coins[], currency (usd/eur/gbp), displayMode, chartMetric, refreshInterval (min 60s)
- [x] Data: CoinGecko `/api/v3/simple/price?ids={ids}&vs_currencies={currency}&include_24hr_change=true`
- [x] Display: grid of coins with symbol, price, 24h change%
- [x] Color-code 24h change
- [x] Respect rate limits (cache, Retry-After header)

### 9. Weather Widget (`dashboard_v2/widgets/weather.js`)
- [x] Settings: location (text), unit (celsius/fahrenheit), showForecast, refreshInterval
- [x] Geocode + forecast via Open-Meteo
- [x] Verify location before saving (settings modal)
- [x] Display: current conditions + optional 5-day forecast

### 10. Widget Settings Modal (`dashboard_v2/widgetSettings.js`)
- [x] Single modal reused for all widgets
- [x] Dynamic form from widget's `settingsSchema`
- [x] Field types: text, number, select, radio, checkbox, array
- [x] "Delete Widget" button (danger style)
- [x] Save → persist to `widgets` store, call `widget.setSettings()`
- [x] Delete → remove from grid, delete from `widgets` store

### 11. Global Settings Modal (`dashboard_v2/globalSettings.js`)
- [x] Separate modal for Finnhub API key
- [x] Accessible from toolbar
- [x] Persists to `v2Settings` store

### 12. V2 Bootstrap (`dashboard_v2/index.js`)
- [x] Initialize grid via `grid.js`
- [x] Load persisted widgets + layout from IndexedDB
- [x] Create widgets via registry, render
- [x] Toolbar: title, "Add Widget", "Layout" menu, "Settings" (global), back link
- [x] "Add Widget" → widget picker modal
- [x] Wire up widget settings buttons

### 13. Widget Picker Modal (`dashboard_v2/widgetPicker.js`)
- [x] Modal showing 5 widget types as cards
- [x] Click → create widget with UUID, save settings, add to grid
- [x] Auto-save layout (immediate)

### 14. Layout Manager (`dashboard_v2/layoutManager.js` + `layoutModal.js`)
- [x] Export current layout as JSON (download)
- [x] Import layout from JSON file and apply
- [x] Built-in presets in `builtinLayouts.js`: simple, essentials, flagship
- [x] Apply clears both stores and re-seeds widgets + grid layout

### 15. Template (`dashboard_v2.html`)
- [x] Header toolbar, grid container, modals (widget settings, picker, layout, global)
- [x] Include `dashboard_v2.css` and `dashboard_v2/index.js` (type=module)
- [x] Include Chart.js vendor bundle
- [x] Pass `rss2json_api_key` and `v2_refresh_interval_seconds` to template

### 16. Styles (`dashboard_v2.css`)
- [x] CSS-grid styles for the 12-column `.css-grid`
- [x] Widget card base styles
- [x] Toolbar, modal, resize-handle styles
- [x] Per-widget custom styles (clock, news, stocks, crypto, weather)
- [x] Responsive: stack on mobile
- [x] Dark theme consistent with V1 CSS variables

### 17. Flask Route (`app/__init__.py`)
- [x] Added `@app.route("/dashboard/v2")` rendering `dashboard_v2.html`
- [x] Pass `rss2json_api_key` and `v2_refresh_interval_seconds` to template
- [x] Added server-side `GET /api/rss` proxy for news

### 18. Landing Page (`landing.html`)
- [x] Hero + features describe the widget dashboard and persistence
- [x] Header/footer links to both `/dashboard` and `/dashboard/v2`

## Validation Checklist ✅

- [x] `/dashboard` (V1) works unchanged
- [x] `/dashboard/v2` loads with the default (flagship) layout
- [x] "Add Widget" opens picker with 5 widget types
- [x] Each widget type can be added multiple times
- [x] Widgets render data correctly (clock updates, news rotates, stocks/crypto show prices, weather shows forecast)
- [x] Add / remove / resize persists immediately and survives reload
- [x] Widget settings modal works per widget (open, edit, save)
- [x] Widget settings persist after reload
- [x] Delete widget works (from settings modal)
- [x] Global settings modal works (Finnhub API key)
- [x] Built-in layouts apply correctly
- [x] Import / export layout works
- [x] Responsive on mobile/tablet
- [x] No console errors

## Out of Scope (Future)
- [ ] Drag-and-drop reordering of widgets
- [ ] Twitter/Substack widgets
- [ ] Widget marketplace/richer import-export
- [ ] Multi-user/auth
- [ ] Server-side caching/proxy for rate limits
- [ ] Sparkline charts for stocks/crypto
- [ ] WebSocket real-time updates
