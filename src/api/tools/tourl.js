const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Limit Vercel (4.5MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// User Agent khusus:
// 1. Browser: Untuk Telegraph (biar dikira user upload foto profil)
// 2. cURL: Untuk 0x0.st / Uguu (biar dikira developer upload code)
const BROWSER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CURL_AGENT = 'curl/7.68.0'; 

// --- 1. TELEGRAPH / GRAPH.ORG (PERMANEN - KHUSUS MEDIA) ---
async function uploadToTelegraph(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    const res = await axios.post('https://graph.org/upload', form, {
        headers: { ...form.getHeaders(), 'User-Agent': BROWSER_AGENT }
    });
    if (res.data && res.data[0] && res.data[0].src) {
        return 'https://graph.org' + res.data[0].src;
    }
    throw new Error("Telegraph Failed");
}

// --- 2. 0x0.ST (TAHAN TAHUNAN - KHUSUS DOKUMEN / UMUM) ---
async function uploadTo0x0(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    const res = await axios.post('https://0x0.st', form, {
        headers: { ...form.getHeaders(), 'User-Agent': CURL_AGENT }
    });
    if (res.data && typeof res.data === 'string' && res.data.startsWith('http')) {
        return res.data.trim();
    }
    throw new Error("0x0.st Failed");
}

// --- 3. PIXELDRAIN (30 HARI+ - CADANGAN) ---
async function uploadToPixeldrain(buffer, filename) {
    const safeFilename = encodeURIComponent(filename);
    const res = await axios.put(`https://pixeldrain.com/api/file/${safeFilename}`, buffer, {
        headers: { 'User-Agent': BROWSER_AGENT, 'Content-Type': 'application/octet-stream' }
    });
    if (res.data && res.data.success) {
        return `https://pixeldrain.com/u/${res.data.id}`;
    }
    throw new Error("Pixeldrain Failed");
}

// --- 4. UGUU.SE (24 JAM - DARURAT) ---
// Kalau semua server nolak, minimal ini masuk (daripada Error)
async function uploadToUguu(buffer, filename) {
    const form = new FormData();
    form.append('files[]', buffer, filename);
    const res = await axios.post('https://uguu.se/upload.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': CURL_AGENT }
    });
    if (res.data && res.data.success) return res.data.files[0].url;
    throw new Error("Uguu Failed");
}

// --- 5. CATBOX.MOE (PERMANEN - PALING UTAMA UNTUK DOCX/PDF/PPTX) ---
async function uploadToCatbox(buffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, filename);

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
    });

    if (res.data && typeof res.data === 'string' && res.data.startsWith('http')) {
        return res.data.trim();
    }
    throw new Error("Catbox Failed");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });

            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File max 4.5MB (Limit Vercel)." });
            }

            // DETEKSI TIPE FILE
            const isMedia = file.mimetype.match(/image|video|gif/);
            
            let providers = [];

            if (isMedia) {
                // MEDIA: Catbox (Permanent) -> Telegraph -> 0x0 -> Pixeldrain
                providers = [
                    { name: 'Catbox (Permanent)', fn: () => uploadToCatbox(file.buffer, file.originalname) },
                    { name: 'Telegraph (Permanent Media)', fn: () => uploadToTelegraph(file.buffer, file.originalname) },
                    { name: '0x0.st (Long Term)', fn: () => uploadTo0x0(file.buffer, file.originalname) },
                    { name: 'Pixeldrain', fn: () => uploadToPixeldrain(file.buffer, file.originalname) }
                ];
            } else {
                // DOKUMEN: Catbox (Permanent) -> 0x0 (Tahan Lama) -> Pixeldrain -> Uguu (Darurat)
                // Cocok buat: PDF, DOCX, PPTX, ZIP, dll.
                providers = [
                    { name: 'Catbox (Permanent)', fn: () => uploadToCatbox(file.buffer, file.originalname) },
                    { name: '0x0.st (Long Term)', fn: () => uploadTo0x0(file.buffer, file.originalname) },
                    { name: 'Pixeldrain (30 Day+)', fn: () => uploadToPixeldrain(file.buffer, file.originalname) },
                    { name: 'Uguu.se (24h Backup)', fn: () => uploadToUguu(file.buffer, file.originalname) }
                ];
            }

            let resultUrl = null;
            let serverName = "";
            let errors = [];

            // LOOPING PERCOBAAN
            for (const provider of providers) {
                try {
                    console.log(`Mencoba upload ke ${provider.name}...`);
                    resultUrl = await provider.fn();
                    serverName = provider.name;
                    break; 
                } catch (e) {
                    const msg = e.response ? `Status ${e.response.status}` : e.message;
                    console.log(`${provider.name} Gagal: ${msg}`);
                    errors.push(`${provider.name}: ${msg}`);
                }
            }

            if (!resultUrl) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Semua server menolak file ini.",
                    debug_trace: errors
                });
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
            res.status(500).json({ status: false, error: error.message });
        }
    });
};