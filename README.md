# 🐱 123Anime API

A high-performance anime scraping API built with Node.js, Express, Cheerio, and Puppeteer. Fetches anime data from **123anime.la** — including search, details, streaming links, trending, rankings, schedule, and more.

---

## ⚡ Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd nekozu-anime-api

# Install dependencies
npm install

# Start the development server
npm run dev
```

The API will be running at `http://localhost:5000`

---

## 📡 API Endpoints

### Root

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info & endpoint listing |

### 🏠 Homepage Sections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/home` | Full homepage data (slider, trending, recently updated, rankings) |
| `GET` | `/slider` | Featured anime carousel |
| `GET` | `/trending` | Daily trending anime (Top Anime - Day) |
| `GET` | `/top_airing` | Currently airing anime |
| `GET` | `/most_popular` | Most popular this week |
| `GET` | `/most_favorite` | Most favorited this month |
| `GET` | `/recent_updates` | Recently updated episodes with English titles |
| `GET` | `/ongoing` | Currently ongoing series |
| `GET` | `/underrated` | Underrated anime picks (via Kitsu + Jikan) |
| `GET` | `/overrated` | Highly-rated anime comparison |

### 🏆 Leaderboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/top10` | Top 10 anime today |
| `GET` | `/weekly10` | Top 10 anime this week |
| `GET` | `/monthly10` | Top 10 anime this month |

### 🔍 Search & Browse

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?keyword=one+piece` | Search anime by keyword |
| `GET` | `/search/suggestions?q=demon+slayer` | Search suggestions |
| `GET` | `/az-all-anime/all/?page=1` | Browse A-Z anime list |
| `GET` | `/genere/Action?page=2` | Browse anime by genre |

### 📺 Anime Details & Streaming

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/anime/:slug` | Full anime details (synopsis, rating, episodes, genres) |
| `GET` | `/api/v2/anime/:animeId/episodes` | Get episode list for an anime |
| `GET` | `/episode-stream?id=one-piece&ep=1` | Get streaming URL for a specific episode |

### 📅 Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/schedule` | Live weekly airing schedule |
| `GET` | `/db-schedule` | Schedule from database |

---

## 🔧 Query Parameters

Some endpoints support optional query parameters:

| Parameter | Endpoints | Description |
|-----------|-----------|-------------|
| `details=1` | `/home`, `/trending`, `/most_popular`, `/most_favorite`, `/top_airing` | Include extra detail metadata |
| `fresh=1` | `/home`, `/trending` | Force cache refresh |
| `keyword` | `/search` | Search query string |
| `q` | `/search/suggestions` | Suggestion query string |
| `page` | `/az-all-anime`, `/genere` | Pagination |
| `id` | `/episode-stream` | Anime slug ID |
| `ep` | `/episode-stream` | Episode number |

---

## 📦 Response Format

All endpoints return JSON in this structure:

```json
{
  "success": true,
  "data": [ ... ],
  "extraction_time_seconds": 1.234,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error description",
  "extraction_time_seconds": 0.5
}
```

---

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| HTML Parsing | Cheerio |
| Browser Automation | Puppeteer (for schedule & streaming) |
| HTTP Client | Axios |
| Caching | In-memory with TTL |
| Database | MongoDB / Mongoose (optional, for schedule) |

---

## 📁 Project Structure

```
├── index.js                    # Entry point & route registration
├── routes/                     # Express route handlers
│   ├── home.js
│   ├── slider.js
│   ├── trending.js
│   ├── top10.js
│   ├── weekly.js
│   ├── monthly.js
│   ├── search.js
│   ├── watch.js
│   └── ...
├── scrapeanime/               # Scraper modules
│   ├── homepage/
│   │   ├── scrapeservice.js   # Main homepage aggregator
│   │   ├── slider/
│   │   ├── trending/
│   │   ├── top_airing/
│   │   ├── most_popular/
│   │   ├── most_favorite/
│   │   ├── recently_updated/
│   │   ├── Ongoing/
│   │   ├── Underrated/
│   │   └── Overrated/
│   ├── Leaderboard/
│   │   ├── Top/scrapeTop10.js
│   │   ├── Weekly/scrapeWeeklyTop10.js
│   │   └── Monthly/scrapeMonthlyTop10.js
│   ├── Browse/Search/
│   ├── AnimeDetails/
│   ├── SingleEpisode/
│   └── Schedule/
├── service/
│   ├── scraperService.js      # Shared fetch & load utility
│   └── simpleCache.js         # In-memory caching
└── util/                      # Utility functions
```

---

## ☁️ Deployment

### Local
```bash
npm start
```

### Cloudflare Workers
See the `cloudflare-worker/` directory for a Cloudflare-deployable version that wraps the API.

### Docker (optional)
```dockerfile
FROM node:18-slim
RUN apt-get update && apt-get install -y chromium
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 5000
CMD ["node", "index.js"]
```

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `MONGODB_URI` | — | MongoDB connection string (optional, for schedule DB) |
| `HOME_CACHE_TTL_MS` | `60000` | Homepage cache TTL in milliseconds |

---

## 📄 License

ISC
