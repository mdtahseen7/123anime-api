# 🐱 123Anime API

A high-performance anime scraping API built with Node.js, Express, and Cheerio. Fetches anime data from **123anime.la** — including search, details, streaming links, trending, rankings, schedule, and more. 

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

### 📺 Streaming Links
Get the direct video iframe URL for any specific anime episode.

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
    "streaming_link": "https://play2.echovideo.ru/embed-3/UWxwb..."
  },
  "extraction_time_seconds": 0.924,
  "cached": false
}
```

### 🔍 Search
Search for anime titles and retrieve cover images, titles, sub/dub status, and more.

**Endpoint:** `GET /search?keyword={query}`
**Example:** `http://localhost:5000/search?keyword=one+piece`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "title": "One Piece",
      "image": "https://123anime.la/images/one-piece.jpg",
      "episode": "1100",
      "hasSub": true,
      "hasDub": true,
      "japanese_title": "ワンピース"
    }
  ]
}
```

### 📖 Anime Details
Get full metadata, ratings, synopsis, genres, and Japanese title translations for a specific series.

**Endpoint:** `GET /anime/:slug`
**Example:** `http://localhost:5000/anime/one-piece`

**Response:**
```json
{
  "title": "One Piece",
  "image": "https://123anime.la/images/one-piece.jpg",
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

### 📅 Schedule
Get the live weekly airing schedule for currently broadcasting anime.

**Endpoint:** `GET /schedule`
**Example:** `http://localhost:5000/schedule`

### 🏠 Homepage & Leaderboards
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/home` | Full homepage data (slider, trending, recently updated, rankings) |
| `GET` | `/slider` | Featured anime carousel |
| `GET` | `/trending` | Daily trending anime (Top Anime - Day) |
| `GET` | `/top_airing` | Currently airing anime |
| `GET` | `/recent_updates` | Recently updated episodes with English titles |
| `GET` | `/top10` | Top 10 anime today |

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

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| HTML Parsing | Cheerio |
| HTTP Client | Axios |
| Caching | In-memory with TTL |
| Database | MongoDB / Mongoose (optional, for schedule) |

---

## ☁️ Deployment

### Cloudflare Workers (Serverless Edge)
The API can be instantly deployed to Cloudflare Workers for 0ms cold starts and infinite scaling. 
See the `cloudflare-worker/` directory for a Hono-based wrapper ready for deployment.

```bash
cd cloudflare-worker
npm install
npm run deploy
```

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
