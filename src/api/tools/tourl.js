const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Limit Vercel (4.5MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const USER_AGENT = 'Mozilla/5.0 (curl/7.68.0)'; // Nyamar jadi cURL biar diterima server dev

// --- 1. FILE.IO (Paling Cepat & Stabil - 1x Download / 14 Hari) ---
async function uploadToFileio(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    const res = await axios.post('https://file.io', form, {
        headers: { ...form.getHeaders() }
    });
    if (res.data && res.data.success) return res.data.link;
    throw new Error(`File.io Error: ${JSON.stringify(res.data)}`);
}

// --- 2. TRANSFER.SH (Developer Friendly - 14 Hari) ---
async function uploadToTransferSh(buffer, filename) {
    // Transfer.sh pakai PUT binary langsung
    const safeFilename = encodeURIComponent(filename.replace(/\s+/g, '-'));
    const res = await axios.put(`https://transfer.sh/${safeFilename}`, buffer, {
        headers: { 
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/octet-stream' // Wajib binary
        }
    });
    // Transfer.sh balikin body string langsung berupa URL
    if (res.data && typeof res.data === 'string' && res.data.includes('transfer.sh')) {
        return res.data.trim();
    }
    throw new Error("Transfer.sh Failed");
}

// --- 3. 0x0.ST (Null Pointer - Tahan Lama) ---
async function uploadTo0x0(buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, filename);
    const res = await axios.post('https://0x0.st', form, {
        headers: { ...form.getHeaders() }
    });
    if (res.data && typeof res.data === 'string' && res.data.startsWith('http')) {
        return res.data.trim();
    }
    throw new Error("0x0.st Failed");
}

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });

            // Cek Limit Vercel
            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File max 4.5MB (Limit Vercel)." });
            }

            // LIST SERVER (Prioritas Developer Servers)
            const providers = [
                { name: 'File.io', fn: uploadToFileio },
                { name: 'Transfer.sh', fn: uploadToTransferSh },
                { name: '0x0.st', fn: uploadTo0x0 }
            ];

            let resultUrl = null;
            let serverName = "";
            let errors = [];

            // LOOPING
            for (const provider of providers) {
                try {
                    console.log(`Mencoba upload ke ${provider.name}...`);
                    resultUrl = await provider.fn(file.buffer, file.originalname);
                    serverName = provider.name;
                    break;
                } catch (e) {
                    console.log(`${provider.name} Gagal: ${e.message}`);
                    errors.push(`${provider.name}: ${e.message}`);
                }
            }

            if (!resultUrl) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Gagal upload. Server sedang sibuk.",
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