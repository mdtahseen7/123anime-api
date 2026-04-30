import express from 'express';
import { scrapeSingleEpisode } from '../scrapeanime/SingleEpisode/scrapeSingleEpisode.js';

const router = express.Router();

router.get('/episode-stream', async (req, res) => {
    try {
        const animeId = req.query.id;
        const episodeNumber = req.query.ep;

        if (!animeId || !episodeNumber) {
            return res.status(400).json({
                error: 'Both id and ep parameters are required',
                example: 'http://localhost:5000/episode-stream?id=sentai-daishikkaku-2nd-season-dub&ep=1'
            });
        }

        if (isNaN(episodeNumber) || episodeNumber < 1) {
            return res.status(400).json({
                error: 'Episode number must be a positive integer',
                example: 'http://localhost:5000/episode-stream?id=anime-name&ep=1'
            });
        }

        // Pad episode number to 3 digits (e.g., 1 -> 001)
        const paddedEp = String(episodeNumber).padStart(3, '0');
        const episodeUrl = `https://123anime.la/anime/${animeId}/episode/${paddedEp}`;

        console.log(`🎯 Fetching streaming link for: ${animeId} Episode ${episodeNumber}`);

        const startTime = Date.now();
        const result = await scrapeSingleEpisode(episodeUrl);
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        if (result.success) {
            console.log(`✅ Found streaming link in ${duration.toFixed(2)} seconds`);
            res.json({
                success: true,
                anime_id: animeId,
                episode: episodeNumber,
                data: result.data,
                extraction_time_seconds: duration
            });
        } else {
            console.log(`❌ Failed to find streaming link: ${result.error}`);
            res.status(404).json({
                success: false,
                error: result.error,
                anime_id: animeId,
                episode: episodeNumber,
                extraction_time_seconds: duration
            });
        }

    } catch (error) {
        console.error('❌ Error fetching episode stream:', error.message);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
