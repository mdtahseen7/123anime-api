import romanizeJapanese from '../../../util/romanizeJapanese.js';

/**
 * 123anime doesn't have a dedicated "Most Popular" section.
 * We use the "Top Anime - Week" tab from the ranking sidebar widget.
 */
export default function scrapeMostPopular($, resolveUrl, source) {
  const items = [];

  const rankingWidget = $('div.widget.ranking');
  if (!rankingWidget.length) return items;

  // Get the "week" content tab for most popular
  let weekContent = rankingWidget.find('.content[data-name="week"]');
  if (!weekContent.length) {
    // Fallback: try second content block
    weekContent = rankingWidget.find('.content').eq(1);
  }
  if (!weekContent.length) return items;

  weekContent.find('.item').slice(0, 10).each((j, el) => {
    const el$ = $(el);
    const nameLink = el$.find('a.name').first();

    let href = nameLink.attr('href') || el$.find('a.thumb').attr('href') || '';
    href = href ? resolveUrl(href) : null;

    let title = nameLink.text().trim() || null;

    let img = null;
    const imgEl = el$.find('img').first();
    if (imgEl.length) {
      img = imgEl.attr('data-src') || imgEl.attr('src') || null;
    }
    if (img) img = resolveUrl(img);

    // Episode info
    const epText = el$.find('.tip').text() || '';
    const epMatch = epText.match(/Ep\s*(\d+)/i);
    const ep = epMatch ? parseInt(epMatch[1], 10) : null;

    // Check if title contains "dub"
    const hasDub = title && /dub/i.test(title);

    let japanese = null;
    if (title) {
      japanese = romanizeJapanese(title);
    }

    if (title && href) {
      items.push({
        title: title || null,
        japanese: japanese || null,
        href: href || null,
        image: img || null,
        dub: hasDub ? ep : null,
        sub: !hasDub ? ep : null,
        tv: true,
        source,
        section: 'most_popular',
      });
    }
  });

  return items;
}
