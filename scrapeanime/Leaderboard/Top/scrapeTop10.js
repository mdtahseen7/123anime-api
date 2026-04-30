import axios from 'axios';
import * as cheerio from 'cheerio';
import romanizeJapanese from '../../../util/romanizeJapanese.js';

/**
 * Scrapes Top 10 anime from 123anime.la's "Top Anime - Day" tab
 */
export const scrapeTop10 = async () => {
    try {
        const response = await axios.get('https://123anime.la/home', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results = [];

        const rankingWidget = $('div.widget.ranking');
        if (!rankingWidget.length) {
            console.log('❌ Ranking widget not found');
            return {};
        }

        let dayContent = rankingWidget.find('.content[data-name="day"]');
        if (!dayContent.length) {
            dayContent = rankingWidget.find('.content').first();
        }

        if (dayContent.length) {
            dayContent.find('.item').slice(0, 10).each((index, item) => {
                try {
                    const el$ = $(item);
                    const nameLink = el$.find('a.name').first();
                    const title = nameLink.text().trim();

                    const imgEl = el$.find('img').first();
                    let image = imgEl.attr('data-src') || imgEl.attr('src') || null;
                    if (image && !image.startsWith('http')) {
                        image = 'https://123anime.la' + image;
                    }

                    const epText = el$.find('.tip').text() || '';
                    const epMatch = epText.match(/Ep\s*(\d+)/i);
                    const episode = epMatch ? epMatch[1] : null;
                    const isDub = /dub/i.test(title);

                    if (title) {
                        results.push({
                            title,
                            image,
                            rank: index + 1,
                            sub: isDub ? [] : (episode ? [episode] : []),
                            dub: isDub ? (episode ? [episode] : []) : []
                        });
                    }
                } catch (error) {}
            });
        }

        const finalResults = results.slice(0, 10).map((anime, idx) => ({
            index: idx + 1,
            rank: anime.rank,
            title: anime.title,
            japanese: romanizeJapanese(anime.title) || anime.title,
            img: anime.image || '',
            dub: anime.dub,
            sub: anime.sub
        }));

        const resultObj = {};
        finalResults.forEach(anime => {
            resultObj[anime.index] = anime;
        });
        return resultObj;

    } catch (error) {
        console.error('Error scraping Top 10:', error.message);
        return {
            1: { index: 1, rank: 1, title: "Scraping Error", img: null, dub: [], sub: [] }
        };
    }
};
