const axios = require('axios');

module.exports = function(app) {
    app.get('/api/downloader/ytmp3', async (req, res) => {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Url wajib diisi" });

        const targetUrl = encodeURIComponent(url);
        const TIMEOUT = 9000; // 9 Detik (Mepet batas Vercel)
        
        // Fungsi Template Request
        const fetchAPI = (sourceName, apiUrl) => {
            return new Promise(async (resolve, reject) => {
                try {
                    console.log(`[Race] Start: ${sourceName}`);
                    const { data } = await axios.get(apiUrl, { 
                        timeout: TIMEOUT,
                        headers: { 'User-Agent': 'Mozilla/5.0' } // Biar dikira browser
                    });

                    // Cek validitas data tiap API (beda-beda dikit strukturnya)
                    let result = null;

                    // Logika Filter Respon
                    if (sourceName === "API 1" && (data.download || data.url)) {
                        result = { title: data.data?.title || "Audio", url: data.download || data.url, thumb: data.data?.thumbnail };
                    } 
                    else if (sourceName === "API 2" && data.status && data.result?.url) {
                        result = { title: data.result.title, url: data.result.url, thumb: data.result.thumb };
                    }
                    else if (sourceName === "API 3" && (data.url || data.download)) {
                        result = { title: data.title, url: data.url || data.download, thumb: data.thumbnail };
                    }

                    if (result && result.url) {
                        console.log(`[Race] WINNER: ${sourceName}`);
                        resolve({ source: sourceName, ...result });
                    } else {
                        reject(new Error(`${sourceName} kosong`));
                    }
                } catch (e) {
                    reject(new Error(`${sourceName} error: ${e.message}`));
                }
            });
        };

        // === MULAI BALAPAN ===
        try {
            // Kita jalankan 3 request SEKALIGUS!
            // Promise.any akan mengambil yang PERTAMA KALI sukses.
            const winner = await Promise.any([
                fetchAPI("API 1", `https://woy-kontol-web-api-gw-jangan-diseba.vercel.app/download/ytmp3?url=${targetUrl}`),
                fetchAPI("API 2", `https://api.zenzxz.my.id/api/downloader/ytmp3?url=${targetUrl}&format=128k`),
                fetchAPI("API 3", `https://zelapioffciall.koyeb.app/download/youtube?url=${targetUrl}`)
            ]);

            // Kirim Pemenang ke User
            res.json({
                status: true,
                creator: `Ada API (Fastest: ${winner.source})`,
                result: {
                    type: "audio",
                    title: winner.title || "YouTube Audio",
                    thumb: winner.thumb || "https://i.ibb.co/3dM3W6h/music-placeholder.png",
                    url: winner.url,
                    quality: "128kbps"
                }
            });

        } catch (error) {
            // Kalau ke-3 nya gagal semua
            console.error("[Race Failed] Semua API Gagal/Timeout");
            res.status(503).json({ 
                status: false, 
                error: "Server sibuk. Semua sumber API sedang down atau timeout." 
            });
        }
    });
};
