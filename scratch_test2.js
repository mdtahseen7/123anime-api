import axios from 'axios';

async function getStreamLink(animeId, episode) {
    try {
        // We know the exact format of the info URL:
        const url = `https://123anime.la/ajax/episode/info?epr=${animeId}%2F${episode}%2Fvidstreaming.io&ts=001`;
        console.log('Requesting:', url);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `https://123anime.la/anime/${animeId}/episode/${String(episode).padStart(3, '0')}`
            }
        });
        
        console.log('Response:', response.data);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

getStreamLink('one-piece', '1');
getStreamLink('one-piece', '100');
