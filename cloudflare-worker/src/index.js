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

app.get('/', (c) => c.json({
    message: 'Welcome to 123Anime API (Cloudflare Worker Edition)',
    status: 'Online',
    endpoints: {
        top10: '/top10',
        monthly_top10: '/monthly-top10',
        weekly_top10: '/weekly-top10',
        schedule: '/schedule',
        search: '/search?query=naruto',
        anime_details: '/anime-details?id=one-piece',
        episode_stream: '/episode-stream?id=one-piece&ep=1'
    }
}));

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

app.get('/schedule', async (c) => {
    const data = await scrapeSchedule();
    return c.json(data);
});

app.get('/search', async (c) => {
    const query = c.req.query('query') || c.req.query('keyword');
    const page = c.req.query('page') || 1;
    if (!query) return c.json({ success: false, error: 'Missing query parameter' }, 400);
    const data = await scrapeAnimeSearch(query, page);
    return c.json(data);
});

app.get('/anime-details', async (c) => {
    const id = c.req.query('id');
    if (!id) return c.json({ success: false, error: 'Missing id parameter' }, 400);
    const data = await scrapeAnimeDetails(`https://123anime.la/anime/${id}`);
    return c.json(data);
});

app.get('/episode-stream', async (c) => {
    const id = c.req.query('id');
    const ep = c.req.query('ep');
    if (!id || !ep) return c.json({ success: false, error: 'Missing id or ep parameter' }, 400);
    const paddedEp = String(ep).padStart(3, '0');
    // The internal scrapeSingleEpisode will parse this URL down anyway
    const url = `https://123anime.la/anime/${id}/episode/${paddedEp}`;
    const data = await scrapeSingleEpisode(url);
    return c.json(data);
});

export default app;
