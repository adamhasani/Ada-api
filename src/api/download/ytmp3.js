const axios = require('axios');
const https = require('https');

module.exports = function(app) {
    app.get('/api/download/ytmp3', async (req, res) => {
        const url = req.query.url;

        // 1. Validasi Input
        if (!url) {
            return res.status(400).json({ status: false, creator: "Ada API", error: "Parameter 'url' is required." });
        }
        
        // 2. Cek apakah itu link YouTube
        // Regex diperluas biar support short link & music
        if (!url.match(/youtu/)) {
            return res.status(400).json({ status: false, creator: "Ada API", error: "Invalid YouTube URL." });
        }

        try {
            const encodedUrl = encodeURIComponent(url);

            // --- SETTINGAN ANTI-DISCONNECT & ANTI-SSL ERROR ---
            // Ini kunci agar "Socket Disconnected" tidak muncul lagi
            const agent = new https.Agent({  
                keepAlive: true, 
                rejectUnauthorized: false // Abaikan error sertifikat (penting buat scraping)
            });

            const axiosConfig = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/114.0.0.0 Safari/537.36',
                    'Referer': 'https://www.google.com/',
                    'Accept': 'application/json'
                },
                httpsAgent: agent, // Pasang agen disini
                timeout: 8000 // Batas waktu 8 detik (agar serverless tidak timeout)
            };

            // --- DAFTAR PEMBALAP (SERVER) ---
            const racers = [
                // 1. NEKO V1
                async () => {
                    const { data } = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`, axiosConfig);
                    if (!data || !data.success) throw new Error('V1 fail');
                    return {
                        server: 'Neko V1',
                        title: data.result.title,
                        cover: data.result.cover,
                        downloadUrl: data.result.downloadUrl
                    };
                },
                // 2. NEKO V2
                async () => {
                    const { data } = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/v2?url=${encodedUrl}`, axiosConfig);
                    if (!data || !data.success) throw new Error('V2 fail');
                    return {
                        server: 'Neko V2',
                        title: data.result.title,
                        cover: data.result.cover,
                        downloadUrl: data.result.downloadUrl
                    };
                },
                // 3. ZENZ API
                async () => {
                    const { data } = await axios.get(`https://api.zenzxz.my.id/api/downloader/ytmp3?url=${encodedUrl}`, axiosConfig);
                    if (!data || !data.result) throw new Error('Zenz fail');
                    return {
                        server: 'Zenz',
                        title: data.result.title,
                        cover: data.result.thumb,
                        downloadUrl: data.result.url
                    };
                },
                // 4. YUPRA API
                async () => {
                    const { data } = await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodedUrl}`, axiosConfig);
                    const r = data.result || data;
                    if (!r || (!r.url && !r.download_url)) throw new Error('Yupra fail');
                    return {
                        server: 'Yupra',
                        title: r.title,
                        cover: r.thumb,
                        downloadUrl: r.url || r.download_url
                    };
                }
            ];

            // --- LOGIKA BALAPAN MANUAL (KOMPATIBEL SEMUA VERSI NODE) ---
            // Kita tidak pakai Promise.any() karena bikin crash di Node versi lama.
            // Kita pakai Promise biasa dengan logika counter.
            
            const winner = await new Promise((resolve, reject) => {
                let failureCount = 0;
                
                // Jalankan semua server SEKALIGUS
                racers.forEach(racer => {
                    racer()
                        .then(result => {
                            // Kalau ada satu yang berhasil, langsung selesaikan (Resolve)
                            resolve(result);
                        })
                        .catch(err => {
                            // Kalau gagal, tambah counter
                            failureCount++;
                            // Jika SEMUA server (4) sudah gagal, baru kita nyerah (Reject)
                            if (failureCount === racers.length) {
                                reject(new Error("Maaf, semua server (Neko/Zenz/Yupra) sedang down atau sibuk."));
                            }
                        });
                });
            });

            // --- KIRIM HASIL KE USER ---
            res.status(200).json({
                status: true,
                creator: "Ada API",
                server: winner.server, // Info server mana yang menang
                metadata: {
                    title: winner.title || 'Unknown Title',
                    cover: winner.cover || 'https://i.imgur.com/MDSfT22.jpeg'
                },
                result: {
                    downloadUrl: winner.downloadUrl
                }
            });

        } catch (error) {
            console.error("Critical Error:", error.message);
            res.status(500).json({ 
                status: false, 
                creator: "Ada API", 
                error: "Internal Server Error",
                message: error.message 
            });
        }
    });
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
