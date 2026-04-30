import express from 'express';
import { scrapeWeeklyTop10 } from '../scrapeanime/Leaderboard/Weekly/scrapeWeeklyTop10.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const start = Date.now();
  try {
    console.log('📅 Starting Weekly Top 10 scraping...');
    
    const result = await scrapeWeeklyTop10();
    const duration = (Date.now() - start) / 1000;

    console.log(`✅ Weekly Top 10 scraping completed in ${duration}s`);

    res.json({
      success: true,
      data: result,
      extraction_time_seconds: duration,
      message: "Top 10 weekly viewed anime",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    console.error('❌ Error scraping weekly top 10:', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      extraction_time_seconds: duration,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;