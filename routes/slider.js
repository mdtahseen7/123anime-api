import express from 'express';
import scrapeSlider from '../scrapeanime/homepage/slider/slider.js';
import { fetchAndLoad, resolveUrlFactory } from '../service/scraperService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const start = Date.now();
  try {
    const $ = await fetchAndLoad('https://123anime.la/home');
    const resolveUrl = resolveUrlFactory('https://123anime.la');
    const sliderItems = scrapeSlider($, resolveUrl, '123anime');
    
    const duration = (Date.now() - start) / 1000;
    
    res.json({
      success: true,
      data: sliderItems || [],
      extraction_time_seconds: parseFloat(duration.toFixed(3)),
      cache: {
        last_updated: Date.now(),
        age_ms: 0,
        include_details: false,
        rate_limited: false
      }
    });
    
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    console.error('Slider scraping error:', error);
    
    res.status(502).json({
      success: false,
      error: String(error),
      extraction_time_seconds: parseFloat(duration.toFixed(3)),
      cache: {
        last_updated: null,
        age_ms: null,
        include_details: false,
        rate_limited: false
      }
    });
  }
});

export default router;