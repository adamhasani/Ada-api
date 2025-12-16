const axios = require('axios');
const https = require('https'); // Wajib import ini

module.exports = function(app) {
    app.get('/api/download/ytmp3', async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({ status: false, creator: "Ada API", error: "Parameter 'url' is required." });
        }

        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!youtubeRegex.test(url)) {
            return res.status(400).json({ status: false, creator: "Ada API", error: "Invalid YouTube URL." });
        }

        try {
            const encodedUrl = encodeURIComponent(url);

            // --- SETTINGAN ANTI-DISCONNECT ---
            // Ini obat untuk error "Socket Disconnected"
            const agent = new https.Agent({  
                keepAlive: true,
                rejectUnauthorized: false // Bypass SSL error biar ga rewel
            });

            const axiosConfig = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                    'Referer': 'https://www.google.com/',
                    'Accept': 'application/json'
                },
                httpsAgent: agent, // Pasang agent disini
                timeout: 10000 // Batas waktu 10 detik per request (biar ga ngegantung)
            };

            // --- PEMBALAP 1: NEKO V1 ---
            const raceNekoV1 = async () => {
                const { data } = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`, axiosConfig);
                if (!data || !data.success) throw new Error('Neko V1 Gagal');
                return {
                    source: 'Neko V1',
                    title: data.result.title,
                    originalUrl: url,
                    duration: data.result.duration,
                    cover: data.result.cover,
                    downloadUrl: data.result.downloadUrl,
                    quality: data.result.quality,
                    format: data.result.format
                };
            };

            // --- PEMBALAP 2: NEKO V2 ---
            const raceNekoV2 = async () => {
                const { data } = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/v2?url=${encodedUrl}`, axiosConfig);
                if (!data || !data.success) throw new Error('Neko V2 Gagal');
                return {
                    source: 'Neko V2',
                    title: data.result.title,
                    originalUrl: url,
                    duration: data.result.duration,
                    cover: data.result.cover,
                    downloadUrl: data.result.downloadUrl,
                    quality: '128kbps',
                    format: 'mp3'
                };
            };

            // --- PEMBALAP 3: ZENZ API ---
            const raceZenz = async () => {
                const { data } = await axios.get(`https://api.zenzxz.my.id/api/downloader/ytmp3?url=${encodedUrl}`, axiosConfig);
                if (!data || !data.result) throw new Error('Zenz Gagal');
                return {
                    source: 'Zenz API',
                    title: data.result.title || 'YouTube Audio',
                    originalUrl: url,
                    duration: data.result.duration || '-',
                    cover: data.result.thumb || data.result.thumbnail,
                    downloadUrl: data.result.url || data.result.download,
                    quality: '128kbps',
                    format: 'mp3'
                };
            };

            // --- PEMBALAP 4: YUPRA ---
            const raceYupra = async () => {
                const { data } = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodedUrl}`, axiosConfig);
                const res = data.result || data; 
                if (!res || (!res.url && !res.download_url)) throw new Error('Yupra Gagal');
                return {
                    source: 'Yupra API',
                    title: res.title || 'YouTube Audio',
                    originalUrl: url,
                    duration: res.duration || '-',
                    cover: res.thumb || res.thumbnail,
                    downloadUrl: res.url || res.download_url,
                    quality: '128kbps',
                    format: 'mp3'
                };
            };

            // --- START BALAPAN ---
            const winner = await Promise.any([
                raceNekoV1(),
                raceNekoV2(),
                raceZenz(),
                raceYupra()
            ]);

            res.status(200).json({
                status: true,
                creator: "Ada API",
                server: winner.source,
                metadata: {
                    title: winner.title,
                    originalUrl: winner.originalUrl,
                    duration: winner.duration,
                    cover: winner.cover || 'https://i.imgur.com/MDSfT22.jpeg'
                },
                result: {
                    downloadUrl: winner.downloadUrl,
                    quality: winner.quality || '128kbps',
                    format: winner.format || 'mp3'
                }
            });

        } catch (error) {
            console.error("All racers failed:", error.message);
            res.status(500).json({ 
                status: false, 
                creator: "Ada API",
                error: "Gagal menghubungkan ke semua server (Network Error).",
                message: error.message
            });
        }
    });
};                    duration: res.duration || '-',
                    cover: res.thumb || res.thumbnail,
                    downloadUrl: res.url || res.download_url,
                    quality: '128kbps',
                    format: 'mp3'
                };
            };

            // --- START BALAPAN (4 SERVERS) ---
            // Mengambil siapa saja yang selesai & sukses duluan
            const winner = await Promise.any([
                raceNekoV1(),
                raceNekoV2(),
                raceZenz(),
                raceYupra()
            ]);

            // --- KIRIM RESPONSE ---
            res.status(200).json({
                status: true,
                creator: "Ada API",
                server: winner.source, // Debugging: Server mana yang menang
                metadata: {
                    title: winner.title,
                    originalUrl: winner.originalUrl,
                    duration: winner.duration,
                    cover: winner.cover || 'https://i.imgur.com/MDSfT22.jpeg'
                },
                result: {
                    downloadUrl: winner.downloadUrl,
                    quality: winner.quality || '128kbps',
                    format: winner.format || 'mp3'
                }
            });

        } catch (error) {
            console.error("All 4 racers failed:", error);
            res.status(500).json({ 
                status: false, 
                creator: "Ada API",
                error: "Semua server (Neko, Zenz, Yupra) sedang sibuk.",
                message: error.errors ? error.errors.map(e => e.message) : error.message
            });
        }
    });
};
