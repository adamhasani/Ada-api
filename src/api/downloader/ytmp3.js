const axios = require('axios');

module.exports = function(app) {
    app.get('/api/downloader/ytmp3', async (req, res) => {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Url wajib diisi" });

        const targetUrl = encodeURIComponent(url);
        
        // TIMEOUT KETAT: Cuma 3.5 Detik per API
        // Total maks waktu tunggu = 3.5 x 3 = 10.5 detik (Pas batas Vercel)
        const TIMEOUT_LIMIT = 3500; 

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        // --- SUMBER 1: Vercel GW ---
        const trySource1 = async () => {
            try {
                console.log("[YTMP3] Coba API 1...");
                const { data } = await axios.get(`https://woy-kontol-web-api-gw-jangan-diseba.vercel.app/download/ytmp3?url=${targetUrl}`, { 
                    timeout: TIMEOUT_LIMIT, headers 
                });
                
                if (data && (data.download || data.url || data.data?.download)) {
                    const res = data.data || data;
                    return { source: "API 1", title: res.title, thumb: res.thumbnail, url: res.download || res.url };
                }
            } catch (e) { console.log(`[Skip] API 1: ${e.message}`); }
            return null;
        };

        // --- SUMBER 2: Zenzxz ---
        const trySource2 = async () => {
            try {
                console.log("[YTMP3] Coba API 2...");
                const { data } = await axios.get(`https://api.zenzxz.my.id/api/downloader/ytmp3?url=${targetUrl}&format=128k`, { 
                    timeout: TIMEOUT_LIMIT, headers 
                });
                
                if (data?.status && data?.result?.url) {
                    return { source: "API 2", title: data.result.title, thumb: data.result.thumb, url: data.result.url };
                }
            } catch (e) { console.log(`[Skip] API 2: ${e.message}`); }
            return null;
        };

        // --- SUMBER 3: Zelapi ---
        const trySource3 = async () => {
            try {
                console.log("[YTMP3] Coba API 3...");
                const { data } = await axios.get(`https://zelapioffciall.koyeb.app/download/youtube?url=${targetUrl}`, { 
                    timeout: TIMEOUT_LIMIT, headers 
                });
                
                if (data?.url || data?.download) {
                    return { source: "API 3", title: data.title, thumb: data.thumbnail, url: data.url || data.download };
                }
            } catch (e) { console.log(`[Skip] API 3: ${e.message}`); }
            return null;
        };

        // === EKSEKUSI CEPAT ===
        try {
            let result = await trySource1();
            if (!result) result = await trySource2();
            if (!result) result = await trySource3();

            if (!result) {
                return res.status(503).json({ 
                    status: false, 
                    creator: "Ada API",
                    error: "Gagal mengambil data. Server sumber sibuk/mati. Coba lagi 1 menit lagi." 
                });
            }

            res.json({
                status: true,
                creator: `Ada API (via ${result.source})`,
                result: {
                    type: "audio",
                    title: result.title || "Unknown Title",
                    thumb: result.thumb || "https://i.ibb.co/3dM3W6h/music-placeholder.png",
                    url: result.url,
                    quality: "128kbps"
                }
            });

        } catch (e) {
            console.error("[Fatal Error]", e.message);
            res.status(500).json({ status: false, error: "Server Error" });
        }
    });
};
