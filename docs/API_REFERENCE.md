# API Reference for Feedboard

## External APIs Used

### 1. News (server-side RSS proxy + rss2json fallback)
**Primary source**: The Flask `/api/rss?rss_url=` endpoint fetches the source RSS
feed server-side and returns JSON — no browser CORS issue, no third-party dependency.
**Fallback**: `https://api.rss2json.com/v1/api.json?rss_url={encoded_rss_url}&api_key={key}`
(used only when the proxy fails).
**Used by**: V1 News, V2 News Widget
**Authentication**: Optional API key (rss2json fallback only)
**Rate Limits**: rss2json free tier is generous but rate-limited
**V1 Config**: `RSS_PROXY_ENDPOINT` / `RSS2JSON_ENDPOINT` in `config.js`
**API Key**: Loaded from `~/feedboard-data/configs/.env` as `RSS2JSON_API_KEY`

**Built-in Feed URLs** (from `config.js`):
- WORLD: `https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en`
- TECHNOLOGY: `https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en`
- BUSINESS: `https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en`
- SCIENCE: `https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en`
- SPORTS: `https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en`

### 2. Finnhub.io (Stock Prices)
**Purpose**: Real-time stock quotes
**Used by**: V2 Stocks Widget
**Authentication**: Required API key (free tier: 60 req/min)
**Endpoint**: `https://finnhub.io/api/v1/quote?symbol={SYMBOL}&token={API_KEY}`
**Response**:
```json
{
  "c": 150.25,    // Current price
  "h": 152.00,    // High price of the day
  "l": 149.00,    // Low price of the day
  "o": 151.00,    // Open price of the day
  "pc": 149.50,   // Previous close price
  "t": 1699723200 // Timestamp
}
```
**API Key**: Entered via V2 Global Settings modal, stored in IndexedDB (`v2Settings` store)

### 3. CoinGecko API (Crypto Prices)
**Purpose**: Cryptocurrency prices and 24h changes
**Used by**: V2 Crypto Widget
**Authentication**: None required
**Rate Limits**: 10-30 requests/minute (respect `Retry-After` header)
**Endpoint**: `https://api.coingecko.com/api/v3/simple/price?ids={comma_separated_ids}&vs_currencies={currency}&include_24hr_change=true`
**Example**: `ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`
**Response**:
```json
{
  "bitcoin": {
    "usd": 43250.50,
    "usd_24h_change": 2.34
  },
  "ethereum": {
    "usd": 2340.75,
    "usd_24h_change": -1.12
  }
}
```
**Supported Coins** (defaults in widgetRegistry.js):
- bitcoin (BTC)
- ethereum (ETH)
- solana (SOL)
- cardano (ADA)
- chainlink (LINK)

### 4. Open-Meteo (Weather)
**Purpose**: Geocoding and weather forecast
**Used by**: V1 Weather (top bar), V2 Weather widget
**Authentication**: None required
**Endpoints**:
- Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json`
- Forecast: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weather_code&temperature_unit={celsius|fahrenheit}`
**Weather Codes**: Mapped in `config.js` (`WEATHER_CODES`)

## Internal API (Flask Routes)

| Route | Method | Description | Template |
|-------|--------|-------------|----------|
| `/` | GET | Landing page | `landing.html` |
| `/dashboard` | GET | V1 Dashboard | `dashboard.html` |
| `/dashboard/v2` | GET | V2 Dashboard | `dashboard_v2.html` |

All routes pass `rss2json_api_key` to templates (may be `null`/`undefined`).

## Client-Side Storage (IndexedDB)

### Database: `feedboard` (Version 2)

| Store | Key | Value |
|-------|-----|-------|
| `settings` | `app` | V1 settings object |
| `widgets` | `<uuid>` | `{ id, type, ...widgetSettings }` |
| `gridLayout` | `layout` | Ordered array of `{ id, w, h }` (column/row spans) |
| `v2Settings` | `global` | `{ finnhubApiKey }` |

### V1 Settings Object Structure
```javascript
{
  selectedTopics: ['WORLD'],
  allMode: false,
  customFeeds: [{ id, url }],
  slideIntervalSec: 8,
  timezone: 'America/New_York',
  locationQuery: 'New York',
  weatherUnit: 'celsius'
}
```

### V2 Widget Settings Structure (per widget)
```javascript
// Clock
{ type: 'clock', timezone: '...', format: '24h', showSeconds: true, showDate: true }

// News
{ type: 'news', mode: 'single', category: 'WORLD', customFeeds: [], rotationSpeed: 8, autoRotate: true, refreshInterval: 600 }

// Stocks
{ type: 'stocks', symbols: ['AAPL', 'GOOGL'], displayMode: 'table', chartMetric: 'price', refreshInterval: 60 }

// Crypto
{ type: 'crypto', coins: ['bitcoin', 'ethereum'], currency: 'usd', displayMode: 'table', chartMetric: 'price', refreshInterval: 60 }

// Weather
{ type: 'weather', location: 'London, UK', unit: 'celsius', showForecast: true, refreshInterval: 600 }
```

### V2 Grid Layout Structure (ordered spans)
```javascript
[
  { id: 'uuid', w: 3, h: 2 },
  { id: 'uuid', w: 6, h: 4 }
]
```
Each entry is one widget in display order; `w`/`h` are column/row spans on the
12-column CSS grid. There is no `x`/`y` — position follows array order via CSS grid
auto-flow.

## Error Handling Patterns

### API Fetch Errors
- Network errors: Caught, logged, user sees error message in widget
- HTTP errors: Status checked, appropriate error shown
- Rate limits (CoinGecko 429): Parse `Retry-After` header, wait before retry
- Missing API key (Finnhub): Show setup prompt with link to settings

### IndexedDB Errors
- All DB operations wrapped in try/catch
- Failures logged to console, non-blocking
- Graceful degradation if storage unavailable

## CORS / Proxy
- News is fetched **server-side** by the Flask `/api/rss` endpoint (no browser CORS
  concern). The optional rss2json.com fallback is used only when the proxy fails.
- Stocks (Finnhub), Crypto (CoinGecko), and Weather (Open-Meteo) are fetched
  directly from the browser; these services send CORS headers.