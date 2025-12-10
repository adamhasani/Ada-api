const axios = require('axios');

module.exports = function(app) {
    app.get('/api/download/ytmp3', async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Parameter 'url' is required."
            });
        }

        // Validasi Link YouTube
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!youtubeRegex.test(url)) {
            return res.status(400).json({
                status: false,
                creator: "Ada API",
                error: "Invalid YouTube URL."
            });
        }

        try {
            // === PERBAIKAN UTAMA ADA DI SINI ===
            // Kita encode URL-nya biar karakter aneh (? & =) aman saat dikirim
            const encodedUrl = encodeURIComponent(url);
            
            const nekolabsUrl = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodedUrl}&format=mp3`;
            
            // Tambahkan Header biar dikira Browser (Chrome)
            const response = await axios.get(nekolabsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const data = response.data;

            // Debugging (Opsional: Cek di console server kalau masih error)
            // console.log("Respon Nekolabs:", data);

            if (!data || !data.status) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Gagal mengambil data dari server downloader (Mungkin limit atau IP block).",
                    debug: data // Tampilkan pesan asli dari Nekolabs biar tau errornya apa
                });
            }

            res.status(200).json({
                status: true,
                creator: "Ada API",
                metadata: {
                    title: data.data.title,
                    originalUrl: url
                },
                result: data.data
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
