const axios = require('axios');
async function getM3u8() {
    try {
        const e1 = await axios.get('https://play2.echovideo.ru/embed-3/UWxwb05ERkJXU1pUV1NwSmtnVUFBQXIvLzloUlFRbWdDRG9DS0ZSYzRoaUFDSUJNM0FBREJnQUNNSkFnSkFnQXFBUUtvQUJVWUFqSmdUVEV4R0ppTVI2SmdUMG1ZUXg2Z0FUUmdCcVpCaEdBMEViUVFHZ0lDNFEvQTBoVUxNYmg3NlV3V2VLU0w3dENsM2RKNkdrUDZPN3BZM3JLZHJqTVQxYmtwNUFDK3NvUjdYQkN3TVdZdGR1djhBeURJZVJRdTR1NUlwd29TQlVreVFLQQ==');
        const zrpart2 = e1.data.match(/var zrpart2\s*=\s*'([^']+)'/)[1];
        console.log("zrpart2", zrpart2.substring(0, 10));

        const e2 = await axios.get('https://play2.echovideo.ru/hs/' + zrpart2, { headers: { 'Referer': 'https://play2.echovideo.ru/embed-3/' } });
        const dataId = e2.data.match(/data-id="([^"]+)"/)[1];
        console.log("dataId", dataId.substring(0, 10));

        const e3 = await axios.get('https://play2.echovideo.ru/hs/getSources?id=' + dataId, { headers: { 'Referer': 'https://play2.echovideo.ru/hs/' + zrpart2, 'X-Requested-With': 'XMLHttpRequest' } });
        console.log(e3.data);
    } catch (e) {
        console.log(e.message);
    }
}
getM3u8();
