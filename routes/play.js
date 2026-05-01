import express from 'express';
import axios from 'axios';
import http from 'http';
import https from 'https';

const router = express.Router();

// ─── Persistent connection agents ────────────────────────────────────────────
// These reuse TCP+TLS connections across requests, eliminating the ~350ms
// handshake overhead that was causing constant buffering.
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20, keepAliveMsecs: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20, keepAliveMsecs: 30000 });

// Dedicated axios instance with connection pooling for CDN requests
const cdnClient = axios.create({
    httpAgent,
    httpsAgent,
    timeout: 15000,
    maxRedirects: 5,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
});

// ─── In-memory cache for resolved M3U8 base URLs (avoids re-scraping) ────────
const m3u8Cache = new Map();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

/**
 * Resolves the master.m3u8 CDN URL + required headers for a given anime episode.
 * Uses caching to avoid redundant upstream API calls.
 */
async function resolveM3u8(animeId, episode) {
    const cacheKey = `${animeId}:${episode}`;
    const cached = m3u8Cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    // Step 1: Hit 123anime AJAX to get the echovideo embed URL
    const paddedEp = String(episode).padStart(3, '0');
    const ajaxUrl = `https://123anime.la/ajax/episode/info?epr=${animeId}%2F${episode}%2Fvidstreaming.io&ts=001`;
    const ajaxRes = await cdnClient.get(ajaxUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://123anime.la/anime/${animeId}/episode/${paddedEp}`
        },
        timeout: 8000
    });

    if (!ajaxRes.data?.target) throw new Error('No streaming target from 123anime');
    const embedUrl = ajaxRes.data.target;

    // Step 2: Fetch the embed-3 page to extract zrpart2 token
    const embedRes = await cdnClient.get(embedUrl, { timeout: 5000 });
    const zrMatch = embedRes.data.match(/var zrpart2\s*=\s*'([^']+)'/);
    if (!zrMatch) throw new Error('Could not extract zrpart2 token from embed page');
    const zrpart2 = zrMatch[1];
    const baseUrl = embedUrl.split('/').slice(0, 3).join('/');

    // Step 3: Fetch the /hs/ player page to extract the data-id
    const hsUrl = `${baseUrl}/hs/${zrpart2}`;
    const hsRes = await cdnClient.get(hsUrl, {
        headers: { 'Referer': embedUrl },
        timeout: 5000
    });
    const idMatch = hsRes.data.match(/data-id="([^"]+)"/);
    if (!idMatch) throw new Error('Could not extract data-id from player page');

    // Step 4: Query the getSources API for the actual M3U8 URL
    const srcRes = await cdnClient.get(`${baseUrl}/hs/getSources?id=${idMatch[1]}`, {
        headers: { 'Referer': hsUrl, 'X-Requested-With': 'XMLHttpRequest' },
        timeout: 5000
    });

    if (!srcRes.data?.sources) throw new Error('getSources returned no sources');

    const value = {
        masterUrl: srcRes.data.sources,
        cdnHeaders: { 'Referer': baseUrl + '/', 'Origin': baseUrl },
        intro: srcRes.data.intro || null,
        outro: srcRes.data.outro || null,
        tracks: srcRes.data.tracks || []
    };

    m3u8Cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL });
    return value;
}

// ─── GET /play?id=naruto&ep=1 ────────────────────────────────────────────────
// Returns a playable HLS master playlist with all internal URLs rewritten
// to proxy through this server. Drop this URL into any HLS player.
router.get('/play', async (req, res) => {
    const { id, ep } = req.query;
    if (!id || !ep) {
        return res.status(400).json({
            error: 'Both id and ep query parameters are required',
            example: '/play?id=one-piece&ep=1'
        });
    }

    try {
        const { masterUrl, cdnHeaders } = await resolveM3u8(id, ep);

        // Fetch the master M3U8 from CDN
        const m3u8Res = await cdnClient.get(masterUrl, {
            headers: { ...cdnHeaders },
            timeout: 8000,
            responseType: 'text'
        });

        const masterBase = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
        const selfBase = `${req.protocol}://${req.get('host')}`;

        // Rewrite relative URLs in the master playlist to point through our proxy
        const rewritten = m3u8Res.data.replace(/^(?!#)(.+\.m3u8.*)$/gm, (match) => {
            const absolute = match.startsWith('http') ? match : masterBase + match;
            return `${selfBase}/play/proxy?url=${encodeURIComponent(absolute)}&id=${id}&ep=${ep}`;
        });

        res.set({
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Range',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
            'Cache-Control': 'public, max-age=300'
        });
        res.send(rewritten);
    } catch (err) {
        console.error('❌ /play error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /play/proxy?url=...&id=...&ep=... ──────────────────────────────────
// Proxies any CDN resource (sub-playlist or .ts segment) with zero buffering.
// Uses persistent connections for fast segment delivery.
// Supports HTTP Range for instant seeking.
router.get('/play/proxy', async (req, res) => {
    const { url, id, ep } = req.query;
    if (!url) return res.status(400).send('Missing url parameter');

    try {
        // Resolve CDN headers (cached, so this is near-instant)
        let cdnHeaders = { 'Referer': 'https://play2.echovideo.ru/', 'Origin': 'https://play2.echovideo.ru' };
        try {
            if (id && ep) {
                const resolved = await resolveM3u8(id, ep);
                cdnHeaders = resolved.cdnHeaders;
            }
        } catch (_) { /* fallback headers are fine */ }

        const upstreamHeaders = { 
            ...cdnHeaders,
            'Accept-Encoding': 'identity'
        };

        // Forward Range header for seeking support
        if (req.headers.range) {
            upstreamHeaders['Range'] = req.headers.range;
        }

        const upstream = await cdnClient.get(url, {
            headers: upstreamHeaders,
            responseType: 'stream',
            validateStatus: (s) => s < 400
        });

        // If this is an M3U8 sub-playlist, we need to rewrite URLs inside it
        if (url.endsWith('.m3u8') || (upstream.headers['content-type'] || '').includes('mpegurl')) {
            // For sub-playlists we must buffer the text to rewrite, but these are tiny (~2KB)
            const chunks = [];
            upstream.data.on('data', (c) => chunks.push(c));
            upstream.data.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                const playlistBase = url.substring(0, url.lastIndexOf('/') + 1);
                const selfBase = `${req.protocol}://${req.get('host')}`;

                // Rewrite all relative URLs (including .ts segments) to proxy through our worker.
                const rewritten = body.replace(/^(?!#)(.+)$/gm, (match) => {
                    const line = match.trim();
                    if (!line) return match;
                    const absolute = line.startsWith('http') ? line : playlistBase + line;
                    return `${selfBase}/play/proxy?url=${encodeURIComponent(absolute)}&id=${id || ''}&ep=${ep || ''}`;
                });

                res.set({
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
                    'Cache-Control': 'public, max-age=300'
                });
                res.send(rewritten);
            });
            upstream.data.on('error', (e) => {
                console.error('❌ sub-playlist stream error:', e.message);
                if (!res.headersSent) res.status(502).send('Upstream error');
            });
            return;
        }

        // ─── For .ts segments: zero-copy pipe with persistent connection ─────
        const responseHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Range',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=86400',
            'Connection': 'keep-alive'
        };

        // Forward relevant headers from upstream
        if (upstream.headers['content-type']) responseHeaders['Content-Type'] = upstream.headers['content-type'];
        if (upstream.headers['content-length']) responseHeaders['Content-Length'] = upstream.headers['content-length'];
        if (upstream.headers['content-range']) responseHeaders['Content-Range'] = upstream.headers['content-range'];
        if (upstream.headers['accept-ranges']) responseHeaders['Accept-Ranges'] = upstream.headers['accept-ranges'];

        res.writeHead(upstream.status, responseHeaders);

        // Zero-copy pipe: data flows directly from CDN socket → client socket
        upstream.data.pipe(res);

        // Clean up if client disconnects mid-stream
        req.on('close', () => {
            upstream.data.destroy();
        });

    } catch (err) {
        console.error('❌ /play/proxy error:', err.message);
        if (!res.headersSent) {
            res.status(502).json({ error: 'Failed to fetch upstream resource', detail: err.message });
        }
    }
});

export default router;
