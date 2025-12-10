const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Setup Multer (Limit 10MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- FUNGSI UPLOAD (PROVIDER) ---

async function uploadToQuax(buffer, filename) {
    const form = new FormData();
    form.append('files[]', buffer, filename);
    const res = await axios.post('https://qu.ax/upload.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.data && res.data.success) return res.data.files[0].url;
    throw new Error("Qu.ax Failed");
}

async function uploadToPixeldrain(buffer, filename) {
    const safeFilename = encodeURIComponent(filename);
    const res = await axios.put(`https://pixeldrain.com/api/file/${safeFilename}`, buffer, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/octet-stream' }
    });
    if (res.data && res.data.success) return `https://pixeldrain.com/u/${res.data.id}`;
    throw new Error("Pixeldrain Failed");
}

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

// --- MAIN HANDLER ---

module.exports = function(app) {
    app.post('/api/tools/tourl', upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ status: false, creator: "Ada API", error: "File tidak ditemukan." });

            // Cek Ukuran Vercel (4.5MB Max)
            if (file.size > 4.5 * 1024 * 1024) {
                return res.status(400).json({ status: false, creator: "Ada API", error: "File max 4.5MB (Limit Vercel)." });
            }

            // DAFTAR SERVER TUJUAN
            // Kita atur urutannya: Dokumen -> Pixeldrain dulu. Media -> Qu.ax dulu.
            const isDocument = file.mimetype.includes('pdf') || file.mimetype.includes('text') || file.mimetype.includes('msword') || file.mimetype.includes('office');
            
            let providers = [];
            if (isDocument) {
                providers = [
                    { name: 'Pixeldrain', fn: uploadToPixeldrain },
                    { name: 'Qu.ax', fn: uploadToQuax },
                    { name: 'Catbox', fn: uploadToCatbox }
                ];
            } else {
                providers = [
                    { name: 'Qu.ax', fn: uploadToQuax },
                    { name: 'Catbox', fn: uploadToCatbox },
                    { name: 'Pixeldrain', fn: uploadToPixeldrain }
                ];
            }

            let resultUrl = null;
            let serverName = "";
            let errors = [];

            // --- LOGIKA LOOPING (ANTI RIBET) ---
            // Mencoba satu per satu server dalam daftar
            for (const provider of providers) {
                try {
                    console.log(`Mencoba upload ke ${provider.name}...`);
                    resultUrl = await provider.fn(file.buffer, file.originalname);
                    serverName = provider.name;
                    // Kalau berhasil, STOP looping
                    break; 
                } catch (e) {
                    console.log(`${provider.name} Gagal: ${e.message}`);
                    errors.push(`${provider.name}: ${e.message}`);
                    // Lanjut ke server berikutnya...
                }
            }

            // Jika setelah semua dicoba masih gagal (resultUrl kosong)
            if (!resultUrl) {
                return res.status(500).json({
                    status: false,
                    creator: "Ada API",
                    error: "Semua server menolak file ini.",
                    debug_trace: errors
                });
            }

            // Berhasil
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
};                             serverName = "Pixeldrain";
                        } else {
                             throw new Error("Semua opsi habis.");
                        }
                    } catch (e3) {
                        errors.push(e3.message);
                         return res.status(500).json({
                            status: false,
                            creator: "Ada API",
                            error: "Gagal upload ke semua server (Qu.ax, Pixeldrain, Catbox).",
                            debug_trace: errors
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
            res.status(500).json({ status: false, error: error.message });
        }
    });
};            }

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
