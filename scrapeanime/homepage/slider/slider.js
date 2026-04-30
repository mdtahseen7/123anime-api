import romanizeJapanese from '../../../util/romanizeJapanese.js';

const romanizeCache = new Map();
const japaneseCharRE = /[\u3000-\u303F\u3040-\u30FF\u4E00-\u9FFF]/;

function cachedRomanize(text) {
  if (!text) return null;
  if (romanizeCache.has(text)) return romanizeCache.get(text);
  const result = romanizeJapanese(text);
  romanizeCache.set(text, result);
  return result;
}

export default function scrapeSlider($, resolveUrl, source) {
  const items = [];
  const maxItems = 10;

  // 123anime slider structure: .widget.slider .swiper-slide .item
  const sliderItems = $('.widget.slider .swiper-slide.item, .widget.slider .swiper-wrapper .item');

  if (sliderItems.length) {
    sliderItems.each((i, el) => {
      if (items.length >= maxItems) return false;

      const el$ = $(el);

      // Extract href and title from the .info .name link
      const nameLink = el$.find('.info a.name').first();
      let href = nameLink.attr('href') || '';
      href = href ? resolveUrl(href) : null;

      let title = nameLink.text().trim() || null;

      // Extract image from data-bg attribute on the slide element
      let img = el$.attr('data-bg') || el$.attr('data-background') || null;
      if (!img) {
        const imgEl = el$.find('img').first();
        if (imgEl.length) {
          img = imgEl.attr('data-src') || imgEl.attr('src') || null;
        }
      }
      if (img) img = resolveUrl(img);

      // Extract description from the .info p element
      let description = el$.find('.info p').text().trim() || null;

      if (!title || !href) return true; // skip if no title or href

      const item = {
        title,
        japanese: null,
        href,
        image: img,
        description,
        isTV: false,
        duration: null,
        releaseDate: null,
        quality: null,
        subtitles: null,
        dubbed: false,
        source,
        section: 'slider'
      };

      // Check for dub in title
      if (title && /dub/i.test(title)) {
        item.dubbed = true;
      }

      // Try to generate japanese romanization
      if (title) {
        if (japaneseCharRE.test(title)) {
          item.japanese = cachedRomanize(title);
        } else {
          item.japanese = cachedRomanize(title);
        }
      }

      items.push(item);
    });
  }

  return items.slice(0, maxItems);
}
