const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // Wajib ada buat upload
const axios = require('axios');   // Wajib ada buat YTMP3

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Dasar
app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// --- AKSES FILE STATIS ---
// Kita set ke root (__dirname) karena index.html kamu ada di luar, bukan di folder 'api-page'
app.use(express.static(__dirname)); 
app.use('/src', express.static(path.join(__dirname, 'src')));

// --- MIDDLEWARE: AUTO INJECT CREATOR ---
// Ini fitur keren kamu, kita pertahankan.
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            // Cek settings.json aman atau tidak
            let creator = "Ada API";
            try {
                const settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/settings.json'), 'utf-8'));
                creator = settings.apiSettings.creator;
            } catch (e) {}

            const responseData = {
                status: true, // Default status true
                creator: creator,
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

// =======================================================
// MANUAL LOAD ROUTES (SUPAYA VERCEL TIDAK BINGUNG)
// =======================================================

// 1. Load YTMP3 (Pastikan file src/api/download/ytmp3.js ADA)
try {
    require('./src/api/download/ytmp3')(app);
    console.log("✅ Loaded: YTMP3");
} catch (e) { console.log("⚠️ Skip YTMP3:", e.message); }

// 2. Load YTMP4 (Pastikan file src/api/download/ytmp4.js ADA)
try {
    require('./src/api/download/ytmp4')(app);
    console.log("✅ Loaded: YTMP4");
} catch (e) { console.log("⚠️ Skip YTMP4:", e.message); }

// 3. Load Tourl/Upload (Pastikan file src/api/tools/tourl.js ADA)
try {
    require('./src/api/tools/tourl')(app);
    console.log("✅ Loaded: Tourl");
} catch (e) { console.log("⚠️ Skip Tourl:", e.message); }

// 4. Load Random (Pastikan path-nya benar, pilih salah satu)
try {
    // require('./src/api/random/ba')(app); 
    require('./src/api/random/bluearchive')(app); 
    console.log("✅ Loaded: Random");
} catch (e) { console.log("⚠️ Skip Random:", e.message); }


// =======================================================
// ROUTES HALAMAN
// =======================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Custom 404 (Kalau route tidak ketemu)
app.use((req, res, next) => {
    res.status(404).json({
        status: false,
        creator: "Ada API",
        error: "404 Not Found - Endpoint tidak ditemukan."
    });
});

// Error Handler 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: false,
        creator: "Ada API",
        error: "Internal Server Error"
    });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
