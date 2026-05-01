# 🐱 123Anime API

A high-performance, zero-dependency anime scraping API built with **Node.js** and **Cheerio**. Fetches anime data directly from **123anime.la** — including search, details, direct video streaming, trending, rankings, schedule, and more.

> **No Puppeteer. No headless browsers. Pure AJAX + HTML parsing for blazing-fast responses.**

---

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/mdtahseen7/123anime-api.git
cd 123anime-api

# Install dependencies
npm install

# Start the development server
npm run dev
```

The API will be running at `http://localhost:5000`

---

## 📡 API Endpoints

### 🎬 Direct Video Stream (HLS Proxy)

Stream anime episodes directly through the API — **ad-free, zero server RAM usage**, with full seeking support. Drop this URL into any HLS-compatible player (HLS.js, VLC, mpv, etc.).

**Endpoint:** `GET /play?id={anime-slug}&ep={episode}`
**Example:** `http://localhost:5000/play?id=naruto&ep=1`

**Response:** Returns an `application/vnd.apple.mpegurl` HLS playlist that can be played directly in any video player.

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=854x720
http://localhost:5000/play/proxy?url=...&id=naruto&ep=1
```

| Feature | Detail |
|---------|--------|
| Format | HLS (M3U8 + TS segments) |
| Seeking | ✅ Full HTTP Range support (206 Partial Content) |
| RAM Usage | 0 bytes — zero-copy pipe from CDN to client |
| Ads | ❌ None — bypasses the obfuscated player entirely |
| Caching | M3U8 resolution cached for 10 minutes |

---

### 📺 Streaming Link Metadata

Get the streaming iframe URL, the direct M3U8 CDN link, and required headers for any episode.

**Endpoint:** `GET /episode-stream?id={anime-slug}&ep={episode}`
**Example:** `http://localhost:5000/episode-stream?id=one-piece&ep=1`

**Response:**
```json
{
  "success": true,
  "anime_id": "one-piece",
  "episode": "1",
  "data": {
    "title": "One Piece",
    "episode_number": "1",
    "streaming_link": "https://play2.echovideo.ru/embed-3/UWxwb...",
    "direct_m3u8": "https://hlsx3cdn.burntburst45.store/one-piece/1/master.m3u8",
    "m3u8_headers": {
      "Referer": "https://play2.echovideo.ru/",
      "Origin": "https://play2.echovideo.ru"
    }
  },
  "extraction_time_seconds": 0.924
}
```

> **Tip:** Use `direct_m3u8` with `m3u8_headers` if you want to build your own video player proxy.

---

### 🔍 Search

Search for anime titles by keyword.

**Endpoint:** `GET /search?keyword={query}`
**Example:** `http://localhost:5000/search?keyword=one+piece`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "title": "One Piece",
      "image": "https://123anime.la/imgs/poster/one-piece.jpg",
      "episode": "1100",
      "hasSub": true,
      "hasDub": true,
      "japanese_title": "ワンピース"
    }
  ]
}
```

**Search Suggestions:**
**Endpoint:** `GET /search/suggestions?q={query}`

---

### 📖 Anime Details

Get full metadata for a specific anime series.

**Endpoint:** `GET /anime/:slug`
**Example:** `http://localhost:5000/anime/one-piece`

**Response:**
```json
{
  "title": "One Piece",
  "image": "https://123anime.la/imgs/poster/one-piece.jpg",
  "description": "Gol D. Roger was known as the Pirate King...",
  "type": "TV",
  "country": "Japan",
  "genres": ["Action", "Adventure", "Comedy", "Fantasy"],
  "status": "Ongoing",
  "released": "1999",
  "quality": "HD",
  "rating": {
    "score": 8.9,
    "votes": 145000
  },
  "japanese_lang": "ワンピース",
  "execution_time_sec": "0.456"
}
```

---

### 📋 Episode List

Get all episodes for a given anime.

**Endpoint:** `GET /api/v2/anime/:slug/episodes`
**Example:** `http://localhost:5000/api/v2/anime/naruto/episodes`

**Response:**
```json
{
  "status": 200,
  "data": {
    "totalEpisodes": 220,
    "episodes": [
      {
        "title": "Episode 1",
        "episodeId": "naruto-episode-1",
        "number": 1,
        "isFiller": false
      },
      {
        "title": "Episode 2",
        "episodeId": "naruto-episode-2",
        "number": 2,
        "isFiller": false
      }
    ]
  },
  "cached": false
}
```

---

### 📅 Schedule

Get the live weekly airing schedule for currently broadcasting anime.

**Endpoint:** `GET /schedule`
**Example:** `http://localhost:5000/schedule`

**Response:**
```json
{
  "success": true,
  "data": {
    "Monday": [
      {
        "title": "One Piece",
        "time": "09:30",
        "episode": "Episode 1100"
      }
    ],
    "Tuesday": [ ... ]
  }
}
```

---

### 🏆 Leaderboards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/top10` | Top 10 anime today |
| `GET` | `/monthly10` | Top 10 anime this month |
| `GET` | `/weekly10` | Top 10 anime this week |

**Example Response (`/top10`):**
```json
{
  "success": true,
  "data": {
    "1": {
      "index": 1,
      "rank": 1,
      "title": "Solo Leveling Season 2",
      "japanese": "Ore Dake Level Up Na Ken 2",
      "img": "https://123anime.la/imgs/poster/solo-leveling-2.jpg",
      "sub": ["001", "002", "003"],
      "dub": ["001", "002"]
    }
  }
}
```

---

### 🏠 Homepage & Browse

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/home` | Full homepage data (slider, trending, recently updated, rankings) |
| `GET` | `/slider` | Featured anime carousel |
| `GET` | `/trending` | Daily trending anime |
| `GET` | `/top_airing` | Currently airing anime |
| `GET` | `/ongoing` | Ongoing series |
| `GET` | `/recent_updates` | Recently updated episodes |
| `GET` | `/most_popular` | Most popular anime |
| `GET` | `/most_favorite` | Most favorited anime |
| `GET` | `/underrated` | Underrated anime picks |
| `GET` | `/overrated` | Overrated anime picks |
| `GET` | `/az-all-anime/all/?page=1` | A-Z anime list with pagination |
| `GET` | `/genere/{genre}?page=1` | Filter anime by genre |

---

## 🔧 Query Parameters

| Parameter | Endpoints | Description |
|-----------|-----------|-------------|
| `id` | `/episode-stream`, `/play` | Anime slug ID (e.g. `one-piece`) |
| `ep` | `/episode-stream`, `/play` | Episode number |
| `keyword` | `/search` | Search query string |
| `q` | `/search/suggestions` | Suggestion query string |
| `page` | `/az-all-anime`, `/genere` | Pagination |
| `details=1` | `/home`, `/trending`, `/most_popular`, `/most_favorite`, `/top_airing` | Include extra detail metadata |
| `fresh=1` | `/home`, `/trending` | Force cache refresh |

---

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| HTML Parsing | Cheerio |
| HTTP Client | Axios |
| Caching | In-memory with TTL |
| Edge Deployment | Cloudflare Workers + Hono |
| Video Streaming | Zero-copy HLS proxy |

---

## ☁️ Deployment

### Cloudflare Workers (Serverless Edge)

The API ships with a ready-to-deploy Cloudflare Worker using the Hono framework, including the `/play` streaming proxy.

```bash
cd cloudflare-worker
npm install
npm run deploy
```

**Live URL:** `Host your own worker please, it will be much better for me`

### Docker

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
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
