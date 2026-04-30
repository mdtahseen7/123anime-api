# 123Anime API - Cloudflare Worker Edition

This directory contains a blazing-fast, serverless version of the 123Anime API specifically optimized for deployment on Cloudflare Workers.

By leveraging Cloudflare's global edge network, you get:
- Near 0ms cold starts
- Bypasses Cloudflare bot protections on the target site (worker IPs are highly trusted)
- Infinitely scalable
- Much cheaper than running an Express/Puppeteer server

## Prerequisites

1. Create a Cloudflare account (https://dash.cloudflare.com/sign-up)
2. Install Wrangler CLI:
```bash
npm install -g wrangler
```
3. Login to Wrangler:
```bash
wrangler login
```

## Deployment

Simply run the following command in this directory:
```bash
npm run deploy
```
*(Or use `wrangler deploy` directly)*

Wrangler will package the application, resolve all internal dependencies from the parent folder (Axios, Cheerio, the scrapers), and deploy it directly to the Cloudflare Edge network!

## Local Testing

You can run the Cloudflare worker locally using Wrangler:
```bash
npm run dev
```
*(Or `wrangler dev`)*

## Notes on Architecture
This Cloudflare Worker utilizes [Hono](https://hono.dev/), a lightweight, ultra-fast web framework optimized for Edge computing. Since the main repository has been entirely rewritten to drop Puppeteer in favor of internal 123anime.la API calls, the entire scraping backend is now fully compatible with Cloudflare Workers!
