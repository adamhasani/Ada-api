const axios = require('axios');

module.exports = function(app) {
    // Kita set path-nya pendek: /random/ba
    app.get('/random/ba', async (req, res) => {
        try {
            // 1. Ambil database link gambar dari GitHub
            const { data } = await axios.get('https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json');
            
            // 2. Pilih satu link acak
            const randomUrl = data[Math.floor(Math.random() * data.length)];
            
            // 3. REDIRECT (Ini kuncinya!)
            // Browser otomatis pindah ke link gambar asli. User langsung lihat gambar bersih.
            res.redirect(randomUrl);

        } catch (error) {
            // Kalau error, kasih JSON simple
            res.status(500).json({ 
                status: false, 
                message: "Gagal mengambil gambar",
                error: error.message 
            });
        }
    });
};
