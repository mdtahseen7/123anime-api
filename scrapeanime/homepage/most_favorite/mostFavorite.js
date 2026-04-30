import romanizeJapanese from '../../../util/romanizeJapanese.js';

/**
 * 123anime doesn't have a dedicated "Most Favorite" section.
 * We use the "Top Anime - Month" tab from the ranking sidebar widget.
 */
export default function scrapeMostFavorite($, resolveUrl, source) {
  const items = [];

  const rankingWidget = $('div.widget.ranking');
  if (!rankingWidget.length) return items;

  // Get the "month" content tab for most favorite
  let monthContent = rankingWidget.find('.content[data-name="month"]');
  if (!monthContent.length) {
    // Fallback: try third content block
    monthContent = rankingWidget.find('.content').eq(2);
  }
  if (!monthContent.length) return items;

  monthContent.find('.item').slice(0, 10).each((j, el) => {
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
        section: 'most_favorite',
      });
    }
  });

  return items;
}
