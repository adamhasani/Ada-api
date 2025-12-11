// api/ytmp3.js
// Vercel Serverless function — proxy ke upstream downloader (example: nekolabs)
// Usage:
//  - GET /api/ytmp3?url=<youtube-url>          -> returns JSON metadata + downloadUrl
//  - GET /api/ytmp3?url=<youtube-url>&direct=1 -> redirect (302) to upstream file (trigger download)

const axios = require("axios");

module.exports = async (req, res) => {
  // CORS: allow frontend from any origin (adjust for security in production)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const url = req.query.url;
  const direct = req.query.direct === "1" || req.query.direct === "true";

  if (!url) {
    return res.status(400).json({ status: false, error: "Missing 'url' query parameter." });
  }

  // basic youtube url validation
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  if (!youtubeRegex.test(url)) {
    return res.status(400).json({ status: false, error: "Invalid YouTube URL." });
  }

  try {
    // Upstream base (change to upstream you trust). Use ENV var on Vercel to override.
    const THIRD_BASE = process.env.THIRD_BASE || "https://api.nekolabs.web.id";
    const upstream = `${THIRD_BASE}/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=mp3`;

    const r = await axios.get(upstream, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AdaAPI/1.0)" },
      timeout: 20000
    });

    const data = r.data || {};

    // Upstream expected shape: { success: true, result: { downloadUrl: "...", ... } }
    if (!data || data.success !== true || !data.result) {
      return res.status(502).json({
        status: false,
        error: "Upstream error or no result",
        upstream: data
      });
    }

    const result = data.result;
    const downloadUrl = result.downloadUrl || result.url || null;

    if (!downloadUrl) {
      return res.status(502).json({
        status: false,
        error: "Upstream did not return downloadUrl",
        upstreamResult: result
      });
    }

    if (direct) {
      // Redirect client to the real file (browser follows and will download/preview)
      return res.redirect(302, downloadUrl);
    }

    // Otherwise return metadata + link
    return res.status(200).json({
      status: true,
      metadata: {
        title: result.title || null,
        duration: result.duration || null,
        cover: result.cover || null,
        originalUrl: url
      },
      result: {
        downloadUrl,
        quality: result.quality || null,
        format: result.format || "mp3"
      }
    });

  } catch (err) {
    // if upstream returned error body
    if (err.response) {
      return res.status(502).json({
        status: false,
        error: "Upstream returned error",
        upstreamStatus: err.response.status,
        upstreamBody: err.response.data
      });
    }
    return res.status(500).json({ status: false, error: err.message || "Internal server error" });
  }
};
