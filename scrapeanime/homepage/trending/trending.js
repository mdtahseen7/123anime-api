import romanizeJapanese from '../../../util/romanizeJapanese.js';

const japaneseCharRE = /[\u3000-\u303F\u3040-\u30FF\u4E00-\u9FFF]/;

/**
 * Scrapes the "Top Anime" / trending section from 123anime.la homepage.
 * 123anime doesn't have a dedicated "trending" section, but has a "Top Anime"
 * sidebar widget with Day/Week/Month tabs. We scrape the "Day" tab as trending.
 */
export default async function scrapeTrending($, resolveUrl, source) {
  const items = [];

  // 123anime uses .widget.ranking for the "Top Anime" sidebar
  const rankingWidget = $('div.widget.ranking');
  if (!rankingWidget.length) return items;

  // Get the "day" content (active tab = trending/daily top)
  let dayContent = rankingWidget.find('.content[data-name="day"]');
  if (!dayContent.length) {
    // Fallback: get the first .content
    dayContent = rankingWidget.find('.content').first();
  }
  if (!dayContent.length) return items;

  dayContent.find('.item').slice(0, 10).each((i, el) => {
    const el$ = $(el);

    // Title from a.name link
    const nameLink = el$.find('a.name').first();
    let title = nameLink.text().trim() || null;

    // Href
    let href = nameLink.attr('href') || el$.find('a.thumb').attr('href') || '';
    href = href ? resolveUrl(href) : null;

    // Image
    const imgEl = el$.find('img').first();
    let image = null;
    if (imgEl.length) {
      image = imgEl.attr('data-src') || imgEl.attr('src') || null;
    }
    if (image) image = resolveUrl(image);

    // Episode info
    let episode = null;
    const epText = el$.find('.tip').text() || '';
    const epMatch = epText.match(/Ep\s*(\d+)/i);
    if (epMatch) episode = epMatch[1];

    if (title && href) {
      const item = {
        index: i + 1,
        title,
        japanese: null,
        href,
        image,
        number: i + 1,
        episode: episode || null,
        source,
        section: 'trending'
      };

      // Romanize
      if (japaneseCharRE.test(title)) {
        item.japanese = romanizeJapanese(title);
      } else {
        item.japanese = romanizeJapanese(title);
      }

      items.push(item);
    }
  });

  return items.filter(Boolean);
}