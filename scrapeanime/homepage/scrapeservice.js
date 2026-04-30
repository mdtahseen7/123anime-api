import scrapeTopAiring from './top_airing/topAiring.js';
import scrapeMostPopular from './most_popular/mostPopular.js';
import scrapeMostFavorite from './most_favorite/mostFavorite.js';
import scrapeSlider from './slider/slider.js';
import scrapeTrending from './trending/trending.js';
import { fetchAndLoad, resolveUrlFactory } from '../../service/scraperService.js';

const BASE_URL = 'https://123anime.la';
const HOME_URL = `${BASE_URL}/home`;
const SOURCE_NAME = '123anime';

const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000;

function getCacheKey(url, includeDetails) {
	return `${url}_${includeDetails}`;
}

function getFromCache(key) {
	const cached = cache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.data;
	}
	return null;
}

function setCache(key, data) {
	cache.set(key, {
		data,
		timestamp: Date.now()
	});

	if (cache.size > 10) {
		const oldestKeys = Array.from(cache.keys()).slice(0, 5);
		oldestKeys.forEach(key => cache.delete(key));
	}
}

async function scrapeSite(url, base, source, includeDetails = false) {
	const cacheKey = getCacheKey(url, includeDetails);
	const cached = getFromCache(cacheKey);

	if (cached) {
		return cached;
	}

	const $ = await fetchAndLoad(url);
	const resolveUrl = resolveUrlFactory(base);

	const items = [];

	// Run slider scraper
	try {
		const slider = scrapeSlider($, resolveUrl, source);
		if (slider && slider.length) items.push(...slider);
	} catch (e) {
		console.warn(`Slider scraping failed for ${source}:`, e.message);
	}

	// Run other scrapers with timeout protection
	const scrapers = [
		() => scrapeTopAiring($, resolveUrl, source, includeDetails),
		() => scrapeMostPopular($, resolveUrl, source, includeDetails),
		() => scrapeMostFavorite($, resolveUrl, source, includeDetails),
		() => scrapeTrending($, resolveUrl, source, includeDetails)
	];

	await Promise.allSettled(scrapers.map(async (scraper, index) => {
		try {
			const result = await Promise.race([
				scraper(),
				new Promise((_, reject) => setTimeout(() => reject(new Error('Scraper timeout')), 5000))
			]);
			if (result && result.length) items.push(...result);
		} catch (e) {
			console.warn(`Scraper ${index} failed for ${source}:`, e.message);
		}
	}));

	const seen = new Set();
	const deduped = [];
	for (const it of items) {
		const contentKey = (it.href || it.title || it.image || '').toString().toLowerCase();
		const sectionKey = `${contentKey}::${it.section || 'unknown'}`;

		if (!contentKey) continue;
		if (!seen.has(sectionKey)) {
			seen.add(sectionKey);
			deduped.push(it);
		}
	}

	setCache(cacheKey, deduped);

	return deduped;
}

export async function scrapeHomepage(includeDetails = false) {
	// Scrape from 123anime.la
	const tasks = [
		scrapeSite(HOME_URL, BASE_URL, SOURCE_NAME, includeDetails),
	];

	const results = await Promise.allSettled(tasks);

	const combined = [];
	const errors = [];

	if (results[0].status === 'fulfilled') combined.push(...results[0].value);
	else errors.push({ source: SOURCE_NAME, error: String(results[0].reason) });

	const seen = new Set();
	const deduped = [];
	for (const it of combined) {
		const contentKey = (it.href || it.title || it.image || '').toString().toLowerCase();
		const sectionKey = `${contentKey}::${it.section || 'unknown'}`;

		if (!contentKey) continue;
		if (!seen.has(sectionKey)) {
			seen.add(sectionKey);
			deduped.push(it);
		}
	}

	const sectionTotals = {};
	for (const it of deduped) {
		const sec = it.section || 'unknown';
		sectionTotals[sec] = (sectionTotals[sec] || 0) + 1;
	}

	const sectionCounters = {};
	const indexed = deduped.map((item) => {
		const sec = item.section || 'unknown';
		sectionCounters[sec] = (sectionCounters[sec] || 0) + 1;
		return { index: sectionCounters[sec], ...item };
	});

	const result = { success: true, data: indexed, total: indexed.length, sectionTotals };
	if (errors.length) result.errors = errors;
	return result;
}

export default scrapeHomepage;

let homepageCache = null;
let homepageCacheTs = 0;
const DEFAULT_HOMEPAGE_TTL = 60 * 1000; // 1 minute
const HOMEPAGE_TTL = Number(process.env.HOME_CACHE_TTL_MS || DEFAULT_HOMEPAGE_TTL);

// rate-limit forced refreshes to avoid hammering the origin sites when clients call ?fresh=1
const DEFAULT_MIN_FORCE_INTERVAL = 60 * 1000; // 1 minute
const MIN_FORCE_INTERVAL = Number(process.env.HOME_MIN_FORCE_INTERVAL_MS || DEFAULT_MIN_FORCE_INTERVAL);
let lastForceAt = 0;

export async function getHomepageCached(includeDetails = false, forceRefresh = false) {
	const keyTs = homepageCacheTs || 0;
	const isValid = homepageCache && (Date.now() - keyTs) < HOMEPAGE_TTL && homepageCache._includeDetails === includeDetails;

	if (!forceRefresh && isValid) {
		return { value: homepageCache.value, lastUpdated: homepageCache.timestamp };
	}

	// If force requested, enforce rate limit
	if (forceRefresh && (Date.now() - lastForceAt) < MIN_FORCE_INTERVAL) {
		// return cached value if available, otherwise proceed
		if (homepageCache && homepageCache.value) {
			return { value: homepageCache.value, lastUpdated: homepageCache.timestamp, rateLimited: true };
		}
	}

	try {
		lastForceAt = forceRefresh ? Date.now() : lastForceAt;
		const res = await scrapeHomepage(includeDetails);
		homepageCache = { value: res, timestamp: Date.now(), _includeDetails: includeDetails };
		homepageCacheTs = Date.now();
		return { value: homepageCache.value, lastUpdated: homepageCache.timestamp };
	} catch (e) {
		if (homepageCache && homepageCache.value) return { value: homepageCache.value, lastUpdated: homepageCache.timestamp, error: e };
		throw e;
	}
}

export function warmHomepageCache(intervalMs = HOMEPAGE_TTL) {
	// run immediately
	getHomepageCached(false).catch(() => {});
	setInterval(() => {
		// refresh without blocking
		getHomepageCached(false).catch(() => {});
	}, intervalMs);
}

export function getHomepageCacheMeta() {
	if (!homepageCache) return null;
	return { lastUpdated: homepageCache.timestamp, includeDetails: homepageCache._includeDetails };
}

// Helper to scrape a single section using a scraper function (123anime only)
async function scrapeSectionFromSite(scraperFn, includeDetails = false) {
	try {
		const $ = await fetchAndLoad(HOME_URL);
		const resolveUrl = resolveUrlFactory(BASE_URL);
		const data = (await scraperFn($, resolveUrl, SOURCE_NAME, includeDetails)) || [];
		return { success: true, data };
	} catch (e) {
		return { success: false, data: [], errors: [{ source: SOURCE_NAME, error: String(e) }] };
	}
}

export async function scrapeMostPopularAcrossSites(includeDetails = false) {
	return scrapeSectionFromSite(scrapeMostPopular, includeDetails);
}

export async function scrapeMostFavoriteAcrossSites(includeDetails = false) {
	return scrapeSectionFromSite(scrapeMostFavorite, includeDetails);
}

export async function scrapeTopAiringAcrossSites(includeDetails = false) {
	return scrapeSectionFromSite(scrapeTopAiring, includeDetails);
}