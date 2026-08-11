# Dashboard V2 Implementation Checklist

## Completed Tasks ✅

### 1. Database Layer (`db.js`)
- [x] Added `widgets` object store (key: widget UUID)
- [x] Added `gridLayout` object store (key: 'layout')
- [x] Added `v2Settings` object store (key: 'global')
- [x] Exported: `loadWidgetSettings`, `saveWidgetSettings`, `loadAllWidgetSettings`, `deleteWidgetSettings`
- [x] Exported: `loadGridLayout`, `saveGridLayout`
- [x] Exported: `loadV2Settings`, `saveV2Settings`
- [x] DB_VERSION incremented to 2

### 2. Grid System (`dashboard_v2/grid.js`)
- [x] Load Gridstack JS + CSS from jsDelivr CDN (v10.0.0)
- [x] Initialize Gridstack: 12 columns, cellHeight: 'auto', margin: 10
- [x] dragHandle: '.widget-header', resizeHandles: 'e, se, s, sw, w'
- [x] Load persisted layout on init
- [x] Save layout on `change` event (debounced 300ms)
- [x] Handle widget add/remove via Gridstack API
- [x] Expose `grid` instance via `getGrid()`

### 3. Widget Registry (`dashboard_v2/widgetRegistry.js`)
- [x] Defined 4 widget types with metadata (clock, news, stocks, crypto)
- [x] Factory function `createWidget(type, id, grid, settings)`
- [x] Dynamic import of widget component modules
- [x] `generateWidgetId()` using `crypto.randomUUID()`

### 4. Base Widget Class (`dashboard_v2/widgets/base.js`)
- [x] Abstract `BaseWidget` class
- [x] Constructor: id, grid, element, settings
- [x] `render()`, `destroy()`, `getSettings()`, `setSettings()`
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
- [x] Adapts V1 `news.js` logic (no global DOM assumptions)
- [x] Settings: mode (single/all), category, customFeeds[], rotationSpeed, autoRotate
- [x] Display: headline + snippet, prev/next nav, rotation progress bar
- [x] Reuses: fetchFeed, renderArticle, timeAgo, cleanText, buildRoundRobinQueue

### 7. Stocks Widget (`dashboard_v2/widgets/stocks.js`)
- [x] Settings: symbols[], refreshInterval (min 30s)
- [x] Data: Finnhub `/api/v1/quote?symbol={symbol}&token={API_KEY}`
- [x] Parallel fetch, cache for refreshInterval
- [x] Display: table with symbol, price, change, change%
- [x] Color-code changes (green/red)
- [x] Handle missing API key gracefully

### 8. Crypto Widget (`dashboard_v2/widgets/crypto.js`)
- [x] Settings: coins[], currency (usd/eur/gbp), refreshInterval (min 60s)
- [x] Data: CoinGecko `/api/v3/simple/price?ids={ids}&vs_currencies={currency}&include_24hr_change=true`
- [x] Display: grid of coins with symbol, price, 24h change%
- [x] Color-code 24h change
- [x] Respect rate limits (cache, Retry-After header)

### 9. Widget Settings Modal (`dashboard_v2/widgetSettings.js`)
- [x] Single modal reused for all widgets
- [x] Dynamic form from widget's `settingsSchema`
- [x] Field types: text, number, select, radio, checkbox, array
- [x] "Delete Widget" button (danger style)
- [x] Save → persist to `widgets` store, call `widget.setSettings()`
- [x] Delete → remove from grid, delete from `widgets` store

### 10. Global Settings Modal (`dashboard_v2/globalSettings.js`)
- [x] Separate modal for Finnhub API key
- [x] Accessible from toolbar
- [x] Persists to `v2Settings` store

### 11. V2 Bootstrap (`dashboard_v2/index.js`)
- [x] Initialize Gridstack via `grid.js`
- [x] Load persisted widgets + layout
- [x] Create widgets via registry, render
- [x] Toolbar: title, "Add Widget", "Settings" (global), back link
- [x] "Add Widget" → widget picker modal
- [x] Wire up widget settings buttons

### 12. Widget Picker Modal (`dashboard_v2/widgetPicker.js`)
- [x] Modal showing 4 widget types as cards
- [x] Click → create widget with UUID, add to grid at first available position
- [x] Auto-save layout

### 13. Template (`dashboard_v2.html`)
- [x] Header toolbar, grid container, 3 modals
- [x] Include Gridstack CSS + JS from jsDelivr
- [x] Include `dashboard_v2.css` and `dashboard_v2/index.js` (type=module)
- [x] Pass `rss2json_api_key` to template

### 14. Styles (`dashboard_v2.css`)
- [x] Gridstack CSS variables override
- [x] Widget card base styles
- [x] Toolbar, modal styles
- [x] Per-widget custom styles (clock, news, stocks, crypto)
- [x] Responsive: stack on mobile (< 600px)
- [x] Dark theme consistent with V1 CSS variables

### 15. Flask Route (`app/__init__.py`)
- [x] Added `@app.route("/dashboard/v2")` rendering `dashboard_v2.html`
- [x] Pass `rss2json_api_key` to template

### 16. Landing Page Links (`landing.html`)
- [x] Added V2 link to header nav
- [x] Added V2 link to footer

## Validation Checklist ✅

- [x] `/dashboard` (V1) works unchanged
- [x] `/dashboard/v2` loads with empty grid
- [x] "Add Widget" opens widget picker with 4 widget types
- [x] Each widget type can be added multiple times
- [x] Widgets render data correctly (clock updates, news rotates, stocks/crypto show prices)
- [x] Drag/resize persists after reload
- [x] Widget settings modal works per widget (open, edit, save)
- [x] Widget settings persist after reload
- [x] Delete widget works (from settings modal)
- [x] Global settings modal works (Finnhub API key)
- [x] Responsive on mobile/tablet
- [x] No console errors

## Out of Scope (Future)
- [ ] Twitter/Substack widgets
- [ ] Weather widget in V2
- [ ] Widget marketplace/import
- [ ] Multi-user/auth
- [ ] Server-side caching/proxy
- [ ] Sparkline charts for stocks/crypto
- [ ] WebSocket real-time updates