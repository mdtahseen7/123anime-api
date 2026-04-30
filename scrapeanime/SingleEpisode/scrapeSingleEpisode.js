import axios from 'axios';

const scrapeCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 5;

export const scrapeSingleEpisode = async (episodeUrl) => {
    const startTime = Date.now();
    console.log(`🔄 Fetching streaming link via API for ${episodeUrl}`);
    
    const cached = scrapeCache.get(episodeUrl);
    if (cached && cached.expiresAt > Date.now()) {
        return {
            ...cached.result,
            extraction_time_seconds: 0.001,
            cached: true
        };
    }

    try {
        // Parse animeId and episode from the URL
        // Example: https://123anime.la/anime/one-piece/episode/001
        let episodeNumber = 'Unknown';
        let animeId = 'unknown';
        
        const episodePatterns = [
            /episode[\/\-]?(\d+)/i,
            /ep[\/\-]?(\d+)/i,
            /\/(\d+)\/?$/,
            /\-(\d+)\/?$/
        ];

        for (const pattern of episodePatterns) {
            const match = episodeUrl.match(pattern);
            if (match) {
                // Ensure no leading zeros if 123anime uses unpadded for the API (actually 123anime uses unpadded for API e.g. one-piece/1)
                episodeNumber = parseInt(match[1], 10).toString();
                break;
            }
        }

        const urlParts = episodeUrl.split('/');
        const animeIndex = urlParts.findIndex(part => part === 'anime');
        if (animeIndex !== -1 && urlParts[animeIndex + 1]) {
            animeId = urlParts[animeIndex + 1];
        }

        const animeTitle = animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // 123anime.la internal AJAX endpoint for retrieving the iframe URL
        // They use the format: {animeId}/{episodeNumber}/{serverName}
        // "vidstreaming.io" is their default F5 - HQ server
        const apiUrl = `https://123anime.la/ajax/episode/info?epr=${animeId}%2F${episodeNumber}%2Fvidstreaming.io&ts=001`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': episodeUrl
            },
            timeout: 10000
        });

        if (response.data && response.data.target) {
            const streamingLink = response.data.target;
            console.log(`✅ Found valid streaming link via API: ${streamingLink.substring(0, 60)}...`);

            // Try to extract direct M3U8 for proxy/ad-free viewing
            let directM3u8 = null;
            let m3u8Headers = null;
            
            try {
                if (streamingLink.includes('echovideo.ru/embed-3/')) {
                    const e1 = await axios.get(streamingLink, { timeout: 5000 });
                    const match = e1.data.match(/var zrpart2\s*=\s*'([^']+)'/);
                    if (match) {
                        const zrpart2 = match[1];
                        const baseUrl = streamingLink.split('/').slice(0, 3).join('/');
                        const hsUrl = `${baseUrl}/hs/${zrpart2}`;
                        
                        const e2 = await axios.get(hsUrl, { 
                            headers: { 'Referer': streamingLink },
                            timeout: 5000 
                        });
                        
                        const idMatch = e2.data.match(/data-id="([^"]+)"/);
                        if (idMatch) {
                            const dataId = idMatch[1];
                            const apiUrl = `${baseUrl}/hs/getSources?id=${dataId}`;
                            
                            const e3 = await axios.get(apiUrl, {
                                headers: { 
                                    'Referer': hsUrl,
                                    'X-Requested-With': 'XMLHttpRequest'
                                },
                                timeout: 5000
                            });

                            if (e3.data && e3.data.sources) {
                                directM3u8 = e3.data.sources;
                                m3u8Headers = {
                                    'Referer': baseUrl + '/',
                                    'Origin': baseUrl
                                };
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("❌ Direct M3U8 extraction failed (ad-free fallback may be unavailable):", e.message);
            }

            const streamingData = {
                title: animeTitle,
                episode_number: episodeNumber,
                streaming_link: streamingLink,
                direct_m3u8: directM3u8,
                m3u8_headers: m3u8Headers
            };

            const result = {
                success: true,
                anime_id: animeId,
                episode: episodeNumber,
                data: streamingData
            };

            scrapeCache.set(episodeUrl, {
                expiresAt: Date.now() + CACHE_TTL_MS,
                result: result
            });

            return {
                ...result,
                extraction_time_seconds: parseFloat(((Date.now() - startTime) / 1000).toFixed(3)),
                cached: false
            };
        } else {
            console.log(`❌ Failed to find streaming link via API. Data:`, response.data);
            return {
                success: false,
                error: 'Could not extract streaming link from API response',
                episode_url: episodeUrl,
                extraction_time_seconds: parseFloat(((Date.now() - startTime) / 1000).toFixed(3))
            };
        }
    } catch (error) {
        console.error('❌ Error fetching single episode via API:', error.message);
        return {
            success: false,
            error: error.message,
            episode_url: episodeUrl,
            extraction_time_seconds: parseFloat(((Date.now() - startTime) / 1000).toFixed(3))
        };
    }
}

export async function closeSharedBrowser() {
    // Puppeteer removed, nothing to close
}