import * as cheerio from 'cheerio';
import axios from 'axios';

async function scrapeSchedule() {
    try {
        const url = 'https://123anime.la';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const schedule = [];

        $('.scheduletitle').each((i, titleElem) => {
            const day = $(titleElem).text().trim();
            const animes = [];
            
            const dayContainer = $(titleElem).next('.scheduledetails');
            
            dayContainer.find('.scheduleitem').each((j, itemElem) => {
                const time = $(itemElem).find('.scheduletime').text().trim();
                const name = $(itemElem).find('.schedulename').text().trim();
                const episode = $(itemElem).find('.scheduleepisode').text().trim();
                const link = $(itemElem).find('a').attr('href');
                
                animes.push({
                    time,
                    name,
                    episode,
                    link: link ? `https://123anime.la${link}` : null
                });
            });
            
            schedule.push({
                day,
                animes
            });
        });

        // Add additional specific selectors from Shirayuki config
        if (schedule.length === 0) {
            $('.anime-schedule-item').each((i, item) => {
                const time = $(item).find('.time').text().trim();
                const name = $(item).find('.name').text().trim();
                const episode = $(item).find('.episode').text().trim();
                const link = $(item).find('a').attr('href');
                
                if (name) {
                    schedule.push({
                        time,
                        name,
                        episode,
                        link: link ? `https://123anime.la${link}` : null
                    });
                }
            });
        }

        return {
            success: true,
            data: schedule
        };

    } catch (error) {
        console.error('Error scraping schedule:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

export default scrapeSchedule;
