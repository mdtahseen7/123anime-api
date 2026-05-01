import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { scrapeTop10 } from '../../scrapeanime/Leaderboard/Top/scrapeTop10.js';
import { scrapeMonthlyTop10 } from '../../scrapeanime/Leaderboard/Monthly/scrapeMonthlyTop10.js';
import { scrapeWeeklyTop10 } from '../../scrapeanime/Leaderboard/Weekly/scrapeWeeklyTop10.js';
import scrapeSchedule from '../../scrapeanime/Schedule/schedule.js';
import { scrapeAnimeDetails } from '../../scrapeanime/AnimeDetails/animedetails.js';
import { scrapeSingleEpisode } from '../../scrapeanime/SingleEpisode/scrapeSingleEpisode.js';
import { scrapeAnimeSearch } from '../../scrapeanime/Browse/Search/search.js';

const app = new Hono();

app.use('*', cors());

// ─── M3U8 resolution cache ──────────────────────────────────────────────────
const m3u8Cache = new Map();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

/**
 * Resolves the master.m3u8 CDN URL + required headers for a given anime episode.
 * Uses global fetch (available in Cloudflare Workers natively).
 */
async function resolveM3u8(animeId, episode) {
    const cacheKey = `${animeId}:${episode}`;
    const cached = m3u8Cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const paddedEp = String(episode).padStart(3, '0');
    const ajaxUrl = `https://123anime.la/ajax/episode/info?epr=${animeId}%2F${episode}%2Fvidstreaming.io&ts=001`;

    const ajaxRes = await fetch(ajaxUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://123anime.la/anime/${animeId}/episode/${paddedEp}`
        }
    });
    const ajaxData = await ajaxRes.json();
    if (!ajaxData?.target) throw new Error('No streaming target from 123anime');
    const embedUrl = ajaxData.target;

    const embedRes = await fetch(embedUrl);
    const embedHtml = await embedRes.text();
    const zrMatch = embedHtml.match(/var zrpart2\s*=\s*'([^']+)'/);
    if (!zrMatch) throw new Error('Could not extract zrpart2 token');
    const zrpart2 = zrMatch[1];
    const baseUrl = embedUrl.split('/').slice(0, 3).join('/');

    const hsUrl = `${baseUrl}/hs/${zrpart2}`;
    const hsRes = await fetch(hsUrl, { headers: { 'Referer': embedUrl } });
    const hsHtml = await hsRes.text();
    const idMatch = hsHtml.match(/data-id="([^"]+)"/);
    if (!idMatch) throw new Error('Could not extract data-id');

    const srcRes = await fetch(`${baseUrl}/hs/getSources?id=${idMatch[1]}`, {
        headers: { 'Referer': hsUrl, 'X-Requested-With': 'XMLHttpRequest' }
    });
    const srcData = await srcRes.json();
    if (!srcData?.sources) throw new Error('getSources returned no sources');

    const value = {
        masterUrl: srcData.sources,
        cdnHeaders: { 'Referer': baseUrl + '/', 'Origin': baseUrl },
        intro: srcData.intro || null,
        outro: srcData.outro || null,
        tracks: srcData.tracks || []
    };

    m3u8Cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL });
    return value;
}

// ─── Root ────────────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({
    message: '🐱 123Anime API (Cloudflare Worker Edition)',
    status: 'Online',
    endpoints: {
        play: '/play?id=naruto&ep=1  (direct HLS video stream)',
        episode_stream: '/episode-stream?id=one-piece&ep=1',
        search: '/search?query=naruto',
        anime_details: '/anime-details?id=one-piece',
        top10: '/top10',
        monthly_top10: '/monthly-top10',
        weekly_top10: '/weekly-top10',
        schedule: '/schedule'
    }
}));

// ─── Leaderboard ─────────────────────────────────────────────────────────────
app.get('/top10', async (c) => {
    const data = await scrapeTop10();
    return c.json(data);
});

app.get('/monthly-top10', async (c) => {
    const data = await scrapeMonthlyTop10();
    return c.json(data);
});

app.get('/weekly-top10', async (c) => {
    const data = await scrapeWeeklyTop10();
    return c.json(data);
});

// ─── Schedule ────────────────────────────────────────────────────────────────
app.get('/schedule', async (c) => {
    const data = await scrapeSchedule();
    return c.json(data);
});

// ─── Search ──────────────────────────────────────────────────────────────────
app.get('/search', async (c) => {
    const query = c.req.query('query') || c.req.query('keyword');
    const page = c.req.query('page') || 1;
    if (!query) return c.json({ success: false, error: 'Missing query parameter' }, 400);
    const data = await scrapeAnimeSearch(query, page);
    return c.json(data);
});

// ─── Anime Details ───────────────────────────────────────────────────────────
app.get('/anime-details', async (c) => {
    const id = c.req.query('id');
    if (!id) return c.json({ success: false, error: 'Missing id parameter' }, 400);
    const data = await scrapeAnimeDetails(`https://123anime.la/anime/${id}`);
    return c.json(data);
});

// ─── Episode Stream Metadata ─────────────────────────────────────────────────
app.get('/episode-stream', async (c) => {
    const id = c.req.query('id');
    const ep = c.req.query('ep');
    if (!id || !ep) return c.json({ success: false, error: 'Missing id or ep parameter' }, 400);
    const paddedEp = String(ep).padStart(3, '0');
    const url = `https://123anime.la/anime/${id}/episode/${paddedEp}`;
    const data = await scrapeSingleEpisode(url);
    return c.json(data);
});

// ─── /play — Direct HLS Video Stream ────────────────────────────────────────
app.get('/play', async (c) => {
    const id = c.req.query('id');
    const ep = c.req.query('ep');
    if (!id || !ep) {
        return c.json({ error: 'Both id and ep query parameters are required', example: '/play?id=one-piece&ep=1' }, 400);
    }

    try {
        const { masterUrl, cdnHeaders } = await resolveM3u8(id, ep);

        const m3u8Res = await fetch(masterUrl, {
            headers: { ...cdnHeaders, 'User-Agent': 'Mozilla/5.0' }
        });
        const m3u8Text = await m3u8Res.text();

        const selfBase = new URL(c.req.url).origin;
        const masterBase = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);

        const rewritten = m3u8Text.replace(/^(?!#)(.+\.m3u8.*)$/gm, (match) => {
            const absolute = match.startsWith('http') ? match : masterBase + match;
            return `${selfBase}/play/proxy?url=${encodeURIComponent(absolute)}&id=${id}&ep=${ep}`;
        });

        return new Response(rewritten, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
                'Cache-Control': 'public, max-age=300'
            }
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ─── /play/proxy — Zero-copy CDN proxy for HLS segments & sub-playlists ─────
app.get('/play/proxy', async (c) => {
    const url = c.req.query('url');
    const id = c.req.query('id');
    const ep = c.req.query('ep');
    if (!url) return c.text('Missing url parameter', 400);

    try {
        let cdnHeaders = { 'Referer': 'https://play2.echovideo.ru/', 'Origin': 'https://play2.echovideo.ru' };
        try {
            if (id && ep) {
                const resolved = await resolveM3u8(id, ep);
                cdnHeaders = resolved.cdnHeaders;
            }
        } catch (_) { /* fallback headers */ }

        const upstreamHeaders = {
            ...cdnHeaders,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        // Forward Range header for seeking
        const rangeHeader = c.req.header('Range');
        if (rangeHeader) {
            upstreamHeaders['Range'] = rangeHeader;
        }

        const upstream = await fetch(url, { headers: upstreamHeaders });

        // If this is an M3U8 sub-playlist, rewrite URLs
        const contentType = upstream.headers.get('content-type') || '';
        if (url.endsWith('.m3u8') || contentType.includes('mpegurl')) {
            const body = await upstream.text();
            const playlistBase = url.substring(0, url.lastIndexOf('/') + 1);
            const selfBase = new URL(c.req.url).origin;

            const rewritten = body.replace(/^(?!#)(.+)$/gm, (match) => {
                const line = match.trim();
                if (!line) return match;
                const absolute = line.startsWith('http') ? line : playlistBase + line;
                return `${selfBase}/play/proxy?url=${encodeURIComponent(absolute)}&id=${id || ''}&ep=${ep || ''}`;
            });

            return new Response(rewritten, {
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
                    'Cache-Control': 'public, max-age=300'
                }
            });
        }

        // For .ts segments — stream the body directly (zero-copy in Workers)
        const responseHeaders = new Headers({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Range',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=86400'
        });

        if (upstream.headers.has('content-type')) responseHeaders.set('Content-Type', upstream.headers.get('content-type'));
        if (upstream.headers.has('content-length')) responseHeaders.set('Content-Length', upstream.headers.get('content-length'));
        if (upstream.headers.has('content-range')) responseHeaders.set('Content-Range', upstream.headers.get('content-range'));

        return new Response(upstream.body, {
            status: upstream.status,
            headers: responseHeaders
        });

    } catch (err) {
        return c.json({ error: 'Failed to fetch upstream resource', detail: err.message }, 502);
    }
});

export default app;
