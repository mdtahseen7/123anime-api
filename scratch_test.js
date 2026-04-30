import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    let log = '';
    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('ajax') || url.includes('server') || url.includes('episode') || url.includes('info') || url.includes('play')) {
            log += 'Response URL: ' + url + '\n';
            try {
                if (url.includes('ajax')) {
                    const text = await res.text();
                    if (text.startsWith('{')) {
                        log += 'AJAX Data: ' + text + '\n';
                    }
                }
            } catch (e) {}
        }
    });

    try {
        await page.goto('https://123anime.la/anime/one-piece/episode/001', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 5000));
        fs.writeFileSync('network_utf8.log', log, 'utf8');
        console.log('Done');
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
