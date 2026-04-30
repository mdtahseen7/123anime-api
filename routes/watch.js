import express from 'express';
import axios from 'axios';
import { load } from 'cheerio';
import simpleCache from '../service/simpleCache.js';

const router = express.Router();
const watchCache = simpleCache.createNamespace('watch', 1000 * 60 * 30);

// Base URLs - now using 123anime.la
const ANIME_BASE_URL = 'https://123anime.la';

router.get('/api/v2/anime/:animeId/episodes', async (req, res) => {
  const start = Date.now();
  
  try {
    const { animeId } = req.params;

    if (!animeId || animeId.trim() === '') {
      return res.status(400).json({
        status: 400,
        success: false,
        error: 'Anime ID parameter is required'
      });
    }

    // Check cache first
    const cached = watchCache.get(animeId);
    if (cached) {
      console.log(`📦 Cache hit for ${animeId}`);
      return res.json({
        status: 200,
        data: cached,
        extraction_time_seconds: (Date.now() - start) / 1000,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Scrape the anime page from 123anime.la to get episode list
    const animeUrl = `${ANIME_BASE_URL}/anime/${animeId}`;
    const { data: html } = await axios.get(animeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = load(html);

    // Extract episodes from 123anime's episode list structure
    const episodes = [];

    // 123anime uses .episode-list or similar structure
    // Try multiple selectors
    const episodeSelectors = [
      '.episodes a',
      '.episode-list a',
      '.ep-list a',
      'ul.episodes li a',
      '.episodelist a',
      'a[href*="/episode/"]'
    ];

    let found = false;
    for (const sel of episodeSelectors) {
      const elements = $(sel);
      if (elements.length > 0) {
        elements.each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          const epMatch = href.match(/episode\/(\d+)/i);
          const epNum = epMatch ? parseInt(epMatch[1], 10) : null;
          const title = $el.attr('title')?.trim() || $el.text()?.trim() || null;
          
          if (epNum !== null) {
            episodes.push({
              title: title || `Episode ${epNum}`,
              episodeId: `${animeId}-episode-${epNum}`,
              number: epNum,
              isFiller: false
            });
          }
        });
        found = true;
        break;
      }
    }

    // Deduplicate by episode number
    const seen = new Set();
    const uniqueEpisodes = episodes.filter(ep => {
      if (seen.has(ep.number)) return false;
      seen.add(ep.number);
      return true;
    }).sort((a, b) => a.number - b.number);

    const result = {
      totalEpisodes: uniqueEpisodes.length,
      episodes: uniqueEpisodes
    };

    // Cache the result
    watchCache.set(animeId, result);
    
    const duration = (Date.now() - start) / 1000;

    res.json({
      status: 200,
      data: result,
      extraction_time_seconds: duration,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    console.error('Watch error:', error.message);
    
    // Handle specific error cases
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.response) {
      statusCode = error.response.status;
      errorMessage = `Failed to fetch episodes: ${error.response.statusText}`;
    }
    
    res.status(statusCode).json({
      status: statusCode,
      success: false,
      error: errorMessage,
      extraction_time_seconds: duration,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /watch/:animetitle (Legacy endpoint - kept for backward compatibility)
 */
router.get('/:animetitle', async (req, res) => {
  const start = Date.now();
  
  try {
    const { animetitle } = req.params;

    if (!animetitle || animetitle.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Anime title parameter is required'
      });
    }

    // Redirect to new endpoint with deprecation notice
    return res.status(301).json({
      success: false,
      message: 'This endpoint is deprecated. Please use /api/v2/anime/:animeId/episodes instead',
      new_endpoint: `/api/v2/anime/${animetitle}/episodes`,
      example: '/api/v2/anime/one-piece/episodes'
    });

  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    console.error('Watch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      extraction_time_seconds: duration,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;