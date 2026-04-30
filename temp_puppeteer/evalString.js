const fs = require('fs');
const code = fs.readFileSync('hs_source.js', 'utf8');
const script = code.match(/<script>(.*?)<\/script>/s)[1];
const runCode = `
var window = { location: { search: "" } };
class URLSearchParams {
    constructor() { this.get = () => null; }
}
var document = {
    getElementById: () => ({ getAttribute: () => "A" })
};
` + script.replace('var videoId=', 'global.getStr = _0x1ac7d8; global.getStr2 = _0x364cac; global.getStr3 = _0x53cf6d; global.getStr4 = _0x5c2cc5; global.getStr5 = _0x53a679; global.getStrings = _0x59ac; /*').replace(';var player=jwplayer', '*/;');

eval(runCode);

console.log(global.getStrings().slice(0, 50).join('\\n'));
