module.exports = function(app) {
    const axios = require('axios');
    const yts = require('yt-search');

    // Endpoint: /api/download/ytmp3
    app.get('/api/download/ytmp3', async (req, res) => {
        // Ambil input dari query 'q' atau 'url'
        const q = req.query.q || req.query.url;

        if (!q) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: 'Query parameter (q or url) is required'
            });
        }

        try {
            let targetUrl = q;
            let videoMeta = {};

            // 1. Cek Regex: Apakah inputnya Link YouTube?
            const isUrl = q.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/);

            if (!isUrl) {
                // 2. Kalau bukan Link, cari dulu videonya (Search Mode)
                // Kita gunakan yts.search sesuai contoh codinganmu
                const searchResults = await yts.search(q);
                
                if (!searchResults.videos || searchResults.videos.length === 0) {
                    return res.status(404).json({ 
                        status: false, 
                        error: "Video not found" 
                    });
                }

                // Ambil video paling atas
                const firstVideo = searchResults.videos[0];
                targetUrl = firstVideo.url;
                
                // Simpan info video buat ditampilkan di hasil
                videoMeta = {
                    title: firstVideo.title,
                    channel: firstVideo.author.name,
                    duration: firstVideo.duration.timestamp,
                    imageUrl: firstVideo.thumbnail
                };
            }

            // 3. Tembak API Nekolabs untuk dapat link download
            const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${targetUrl}&format=mp3`;
            const response = await axios.get(nekolabsUrl);
            const data = response.data;

            // Cek jika API Nekolabs gagal
            if (!data || !data.status) {
                return res.status(500).json({
                    status: false,
                    error: "Failed to fetch download link from source."
                });
            }

            // 4. Kirim Response JSON
            res.status(200).json({
                status: true,
                creator: "Ada API",
                metadata: {
                    ...videoMeta, // Gabungkan data search tadi (kalau ada)
                    originalUrl: targetUrl
                },
                result: data.data // Isi result dari Nekolabs
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                status: false, 
                error: error.message 
            });
        }
    });
};
