const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Limit 10MB (Ingat, Vercel Free mentok di 4.5MB untuk body request)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- 1. UPLOAD KE QU.AX (Paling Stabil & Cepat) ---
async function uploadToQuax(buffer, filename) {
    const form = new FormData();
    form.append('files[]', buffer, filename); 
    const res = await axios.post('https://qu.ax/upload.php', form, { 
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' } 
    });
    if (res.data && res.data.success) return res.data.files[0].url;
    throw new Error(`Qu.ax Failed: ${JSON.stringify(res.data)}`);
}

// --- 2. UPLOAD KE TMPFILES.ORG (Spesialis Dokumen) ---
async function uploadToTmpfiles(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, { 
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' } 
    });
    if (res.data && res.data.status === 'success') {
        // Tmpfiles ngasih URL yang harus diedit dikit biar bisa direct link
        let originalUrl = res.data.data.url;
        return originalUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }
    throw new Error(`Tmpfiles Failed: ${JSON.stringify(res.data)}`);
}

// --- 3. UPLOAD KE CATBOX (Cadangan Multimedia) ---
async function uploadToCatbox(buffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, filename);
    const res = await axios.post('https://catbox.moe/user/api.php', form, { 
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' } 
    });
    if (typeof res.data === 'string' && res.data.includes('catbox.moe')) return res.data.trim();
    throw new Error("Catbox Failed");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });
            }

            // Validasi Ukuran Vercel (PENTING)
            // Vercel Free Tier OTOMATIS memutus koneksi jika file > 4.5 MB
            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({
                    status: false,
                    creator: "Ada API",
                    error: "File terlalu besar! Batas maksimal server Vercel adalah 4.5 MB."
                });
            }

            let resultUrl = null;
            let serverName = "";
            let errors = [];

            // LOGIKA UPLOAD BERJENJANG
            try {
                // Prioritas 1: Qu.ax (Cocok semua file)
                resultUrl = await uploadToQuax(file.buffer, file.originalname);
                serverName = "Qu.ax";
            } catch (e1) {
                errors.push(e1.message);
                try {
                    // Prioritas 2: Tmpfiles (Cocok dokumen)
                    console.log("Qu.ax skip, trying Tmpfiles...");
                    resultUrl = await uploadToTmpfiles(file.buffer, file.originalname);
                    serverName = "Tmpfiles.org";
                } catch (e2) {
                    errors.push(e2.message);
                    try {
                        // Prioritas 3: Catbox (Cocok gambar/video)
                        console.log("Tmpfiles skip, trying Catbox...");
                        resultUrl = await uploadToCatbox(file.buffer, file.originalname);
                        serverName = "Catbox";
                    } catch (e3) {
                        errors.push(e3.message);
                        // Nyerah
                        return res.status(500).json({
                            status: false,
                            creator: "Ada API",
                            error: "Semua server menolak file ini.",
                            debug_trace: errors // Biar tau kenapa gagal
                        });
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
