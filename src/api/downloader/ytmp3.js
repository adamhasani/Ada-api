const axios = require('axios');

module.exports = function(app) {
    app.get('/api/downloader/ytmp3', async (req, res) => {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Url wajib diisi" });

        // Encode URL biar aman
        const targetUrl = encodeURIComponent(url);

        // --- SUMBER 1: Vercel GW ---
        const trySource1 = async () => {
            try {
                console.log("[YTMP3] Mencoba Source 1 (Vercel)...");
                const { data } = await axios.get(`https://woy-kontol-web-api-gw-jangan-diseba.vercel.app/download/ytmp3?url=${targetUrl}`, { timeout: 8000 });
                
                // Sesuaikan dengan respon API Source 1
                if (data && (data.download || data.url || data.result)) {
                    const result = data.data || data.result || data;
                    return {
                        source: "Vercel GW",
                        title: result.title || "Audio Source 1",
                        thumb: result.thumbnail || result.image || null,
                        url: result.download || result.url || result.link,
                    };
                }
                return null;
            } catch (e) {
                console.log(`[Skip] Source 1 Gagal: ${e.message}`);
                return null;
            }
        };

        // --- SUMBER 2: Zenzxz ---
        const trySource2 = async () => {
            try {
                console.log("[YTMP3] Mencoba Source 2 (Zenzxz)...");
                const { data } = await axios.get(`https://api.zenzxz.my.id/api/downloader/ytmp3?url=${targetUrl}&format=128k`, { timeout: 8000 });
                
                // Sesuaikan dengan respon API Source 2
                if (data && data.status && data.result) {
                    return {
                        source: "Zenzxz",
                        title: data.result.title || "Audio Source 2",
                        thumb: data.result.thumb,
                        url: data.result.url,
                    };
                }
                return null;
            } catch (e) {
                console.log(`[Skip] Source 2 Gagal: ${e.message}`);
                return null;
            }
        };

        // --- SUMBER 3: Zelapi (Koyeb) ---
        const trySource3 = async () => {
            try {
                console.log("[YTMP3] Mencoba Source 3 (Zelapi)...");
                const { data } = await axios.get(`https://zelapioffciall.koyeb.app/download/youtube?url=${targetUrl}`, { timeout: 10000 });
                
                // Sesuaikan dengan respon API Source 3
                if (data && (data.url || data.download)) {
                    return {
                        source: "Zelapi",
                        title: data.title || "Audio Source 3",
                        thumb: data.thumbnail || null,
                        url: data.download || data.url,
                    };
                }
                return null;
            } catch (e) {
                console.log(`[Skip] Source 3 Gagal: ${e.message}`);
                return null;
            }
        };

        // === EKSEKUSI BERURUTAN (ESTAFET) ===
        try {
            // Coba 1, kalau null coba 2, kalau null coba 3
            let result = await trySource1();
            if (!result) result = await trySource2();
            if (!result) result = await trySource3();

            // Kalau 3 API semuanya mati
            if (!result) {
                return res.status(500).json({ 
                    status: false, 
                    creator: "Ada API",
                    error: "Semua server downloader sedang sibuk. Coba lagi nanti." 
                });
            }

            // Kirim Hasil Sukses
            res.json({
                status: true,
                creator: `Ada API (via ${result.source})`,
                result: {
                    type: "audio",
                    title: result.title,
                    thumb: result.thumb,
                    url: result.url,
                    quality: "128kbps"
                }
            });

        } catch (e) {
            console.error("[YTMP3 Fatal Error]", e);
            res.status(500).json({ status: false, error: "Internal Server Error" });
        }
    });
};
