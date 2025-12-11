const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Akses File Statis
app.use(express.static(__dirname));
app.use('/src', express.static(path.join(__dirname, 'src')));

// --- SAFE SETTINGS LOADER ---
// Baca settings sekali saja saat server nyala, biar gak berat/error
let globalCreator = "Ada API";
try {
    const settingsPath = path.join(__dirname, 'src', 'settings.json');
    if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const json = JSON.parse(raw);
        globalCreator = json.apiSettings.creator || "Ada API";
        console.log("✅ Settings Loaded. Creator:", globalCreator);
    } else {
        console.log("⚠️ Settings.json tidak ditemukan di:", settingsPath);
    }
} catch (e) {
    console.log("⚠️ Gagal baca settings:", e.message);
}

// Middleware Inject Creator (Safe Mode)
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            // Hindari menimpa error response
            if (!data.error) {
                data.creator = globalCreator;
            }
            return originalJson.call(this, data);
        }
        return originalJson.call(this, data);
    };
    next();
});

// =======================================================
// MANUAL LOAD ROUTES
// =======================================================
function loadRoute(filePath) {
    try {
        require(filePath)(app);
        console.log(`✅ Route OK: ${filePath}`);
    } catch (e) {
        console.error(`❌ Route Error [${filePath}]:`, e.message);
    }
}

// Load satu per satu (Pastikan filenya ada!)
loadRoute('./src/api/download/ytmp3');
loadRoute('./src/api/download/ytmp4');
loadRoute('./src/api/tools/tourl');
loadRoute('./src/api/random/bluearchive');

// =======================================================
// ROUTES UTAMA
// =======================================================

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(500).json({
                status: false,
                error: "Index.html Missing",
                detail: err.message,
                path: indexPath
            });
        }
    });
});

// Custom 404
app.use((req, res) => {
    res.status(404).json({
        status: false,
        error: "404 Not Found (Cek URL endpoint kamu)"
    });
});

// ERROR HANDLER (JUJUR)
// Ini akan menampilkan pesan error asli biar kita tau masalahnya
app.use((err, req, res, next) => {
    console.error("🔥 SERVER CRASH:", err.stack);
    res.status(500).json({
        status: false,
        creator: globalCreator,
        error: "Server Error",
        message: err.message, // <--- INI YANG KITA BUTUHKAN
        stack: err.stack // Opsional: Hapus kalau sudah production
    });
});

// Jalankan
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
