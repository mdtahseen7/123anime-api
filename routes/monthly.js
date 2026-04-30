import express from 'express';
import { scrapeMonthlyTop10 } from '../scrapeanime/Leaderboard/Monthly/scrapeMonthlyTop10.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const start = Date.now();
  try {
    console.log('📅 Starting Monthly Top 10 scraping...');
    
    const result = await scrapeMonthlyTop10();
    const duration = (Date.now() - start) / 1000;

    console.log(`✅ Monthly Top 10 scraping completed in ${duration}s`);

    res.json({
      success: true,
      data: result,
      extraction_time_seconds: duration,
      message: "Top 10 monthly viewed anime",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    console.error('❌ Error scraping monthly top 10:', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      extraction_time_seconds: duration,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;