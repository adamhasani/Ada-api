const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Hapus 'chalk' biar gak bikin error 500
// const chalk = require('chalk'); <--- PENYEBAB ERROR KEMARIN

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. SETUP FOLDER (PENTING!) ---
// Izinkan server baca file di folder depan (Root)
// Ini biar index.html, style.css, script.js terbaca
app.use(express.static(process.cwd())); 
app.use('/src', express.static(path.join(process.cwd(), 'src')));

// --- 2. LOAD API (DENGAN PENGAMAN) ---
function loadRoute(filePath) {
    try {
        require(filePath)(app);
        console.log(`[OK] Loaded: ${filePath}`);
    } catch (e) {
        // Kalau file gak ada, server JANGAN CRASH. Cukup lapor aja.
        console.error(`[SKIP] Gagal load ${filePath}: ${e.message}`);
    }
}

// Panggil API kamu
loadRoute('./src/api/download/ytmp3');
loadRoute('./src/api/download/ytmp4');
loadRoute('./src/api/tools/tourl');
loadRoute('./src/api/random/bluearchive');

// --- 3. HALAMAN UTAMA ---
app.get('/', (req, res) => {
    const indexPath = path.join(process.cwd(), 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Kalau index.html hilang, kasih pesan jelas
        res.status(500).send(`
            <h1>Error 500: Index.html Missing</h1>
            <p>File index.html tidak ditemukan di folder utama (Root).</p>
            <p>Pastikan kamu sudah memindahkan file index.html keluar dari folder 'api-page'.</p>
        `);
    }
});

// Error Handler Terakhir (Biar gak blank putih)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: false, error: "Server Error", message: err.message });
});

app.listen(PORT, () => console.log(`Server running at port ${PORT}`));
module.exports = app;
