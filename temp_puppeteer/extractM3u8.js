const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    let m3u8Url = null;
    
    page.on('request', req => {
        if (req.url().includes('.m3u8')) {
            m3u8Url = req.url();
        }
    });

    const targetUrl = 'https://play2.echovideo.ru/hs/UWxwb05ERkJXU1pUV1NwSmtnVUFBQXIvLzloUlFRbWdDRG9DS0ZSYzRoaUFDSUJNM0FBREJnQUNNSkFnSkFnQXFBUUtvQUJVWUFqSmdUVEV4R0ppTVI2SmdUMG1ZUXg2Z0FUUmdCcVpCaEdBMEViUVFHZ0lDNFEvQTBoVUxNYmg3NlV3V2VLU0w3dENsM2RKNkdrUDZPN3BZM3JLZHJqTVQxYmtwNUFDK3NvUjdYQkN3TVdZdGR1djhBeURJZVJRdTR1NUlwd29TQlVreVFLQQ==';
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    console.log("M3U8:", m3u8Url);
    
    // Check if there are other AJAX requests for sources
    await browser.close();
})();
