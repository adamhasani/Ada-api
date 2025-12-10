const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Setup Multer (Limit 10MB biar aman di Vercel, meski Vercel max 4.5MB di free tier)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- 1. UPLOAD KE CATBOX (Tahan Lama) ---
async function uploadToCatbox(buffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, filename);
    const res = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders() });
    if (res.data && res.data.includes('catbox.moe')) return res.data.trim();
    throw new Error("Catbox Failed");
}

// --- 2. UPLOAD KE UGUU.SE (Cocok buat Document/Temp) ---
async function uploadToUguu(buffer, filename) {
    const form = new FormData();
    form.append('files[]', buffer, filename); // Key-nya files[]
    const res = await axios.post('https://uguu.se/upload.php', form, { headers: form.getHeaders() });
    if (res.data && res.data.success) return res.data.files[0].url;
    throw new Error("Uguu Failed");
}

// --- 3. UPLOAD KE POMF.LAIN.LA (Stabil buat file aneh) ---
async function uploadToPomf(buffer, filename) {
    const form = new FormData();
    form.append('files[]', buffer, filename);
    const res = await axios.post('https://pomf.lain.la/upload.php', form, { headers: form.getHeaders() });
    if (res.data && res.data.success) return res.data.files[0].url;
    throw new Error("Pomf Failed");
}

// --- 4. UPLOAD KE YUPRA (Cadangan Terakhir) ---
async function uploadToYupra(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    const res = await axios.post('https://cdn.yupra.my.id/upload', form, { headers: form.getHeaders() });
    const data = res.data;
    const url = data.url || (data.files && data.files[0]?.url) || data.link;
    if (url) return url;
    throw new Error("Yupra Failed");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });
            }

            // CEK UKURAN FILE (Vercel Free Limit Body ~4.5MB)
            // Kalau lebih dari 4.5MB, Vercel otomatis mutus koneksi (Error 413/500 dari sistem, bukan script)
            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({
                    status: false,
                    creator: "Ada API",
                    error: "File terlalu besar! Batas Vercel Free adalah 4.5MB."
                });
            }

            let resultUrl = null;
            let serverName = "";

            // LOGIKA "TANK": Coba satu per satu sampai berhasil
            try {
                // Prioritas 1: Catbox
                resultUrl = await uploadToCatbox(file.buffer, file.originalname);
                serverName = "Catbox";
            } catch (e1) {
                try {
                    // Prioritas 2: Uguu.se
                    console.log("Catbox skip, trying Uguu...");
                    resultUrl = await uploadToUguu(file.buffer, file.originalname);
                    serverName = "Uguu.se";
                } catch (e2) {
                    try {
                        // Prioritas 3: Pomf
                        console.log("Uguu skip, trying Pomf...");
                        resultUrl = await uploadToPomf(file.buffer, file.originalname);
                        serverName = "Pomf.lain.la";
                    } catch (e3) {
                        try {
                            // Prioritas 4: Yupra
                            console.log("Pomf skip, trying Yupra...");
                            resultUrl = await uploadToYupra(file.buffer, file.originalname);
                            serverName = "Yupra";
                        } catch (e4) {
                            // Semua Gagal
                            throw new Error("Semua server (Catbox, Uguu, Pomf, Yupra) menolak file ini.");
                        }
                    }
                }
            }

            res.status(200).json({
                status: true,
                creator: "Ada API",
                result: {
                    name: file.originalname,
                    mime: file.mimetype,
                    size: file.size,
                    server: serverName,
                    url: resultUrl
                }
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
