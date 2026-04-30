import romanizeJapanese from '../../../util/romanizeJapanese.js';

/**
 * 123anime doesn't have a separate "Top Airing" section.
 * We repurpose the Recently Updated subbed section as "top airing" since
 * recently updated subbed anime are effectively the currently airing ones.
 */
export default function scrapeTopAiring($, resolveUrl, source) {
  const items = [];

  // Find the "Recently Updated" widget and get the subbed content
  $('div.widget').each((i, widget) => {
    const w$ = $(widget);
    const titleText = w$.find('.widget-title .title, .widget-title h1.title').text() || '';
    if (!/recently\s*updated/i.test(titleText)) return;

    // Get the sub content (active tab)
    let subContent = w$.find('.content[data-name="sub"]');
    if (!subContent.length) subContent = w$.find('.content').first();
    if (!subContent.length) return;

    subContent.find('.film-list .item').slice(0, 10).each((j, item) => {
      const el$ = $(item);
      const posterA = el$.find('a.poster').first();
      const nameA = el$.find('a.name').first();

      let href = posterA.attr('href') || nameA.attr('href') || '';
      href = href ? resolveUrl(href) : null;

      let title = nameA.attr('data-jtitle') || nameA.text().trim() || null;

      let img = null;
      const imgEl = posterA.find('img').first();
      if (imgEl.length) {
        img = imgEl.attr('data-src') || imgEl.attr('src') || null;
      }
      if (img) img = resolveUrl(img);

      // Episode info
      const epEl = el$.find('.status .ep').first();
      const epText = epEl.text().trim() || '';
      const epMatch = epText.match(/(\d+)/);

      // Sub/dub info
      const hasSub = el$.find('.status .sub').length > 0;
      const hasDub = el$.find('.status .dub').length > 0;

      let japanese = null;
      const jtitle = nameA.attr('data-jtitle');
      if (jtitle) {
        japanese = romanizeJapanese(jtitle);
      } else if (title) {
        japanese = romanizeJapanese(title);
      }

      if (title && href) {
        items.push({
          title: title || null,
          japanese: japanese || null,
          href: href || null,
          image: img || null,
          dub: hasDub ? (epMatch ? parseInt(epMatch[1], 10) : 1) : null,
          sub: hasSub ? (epMatch ? parseInt(epMatch[1], 10) : 1) : null,
          tv: true,
          source,
          section: 'top_airing',
        });
      }
    });

    return false; // break after first match
  });

  return items;
}
