const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// --- KONFIGURASI FOLDER ---
// 1. Jadikan folder 'api-page' sebagai sumber file statis (CSS/JS/HTML)
//    Jadi saat browser minta 'style.css', server nyari di dalam 'api-page'
app.use(express.static(path.join(__dirname, 'api-page')));

// 2. Folder src tetap bisa diakses
app.use('/src', express.static(path.join(__dirname, 'src')));

// --- MANUAL LOAD ROUTES ---
function loadRoute(filePath) {
    try { require(filePath)(app); } catch (e) { console.log(`Skip: ${filePath}`); }
}
loadRoute('./src/api/download/ytmp3');
loadRoute('./src/api/download/ytmp4');
loadRoute('./src/api/tools/tourl');
loadRoute('./src/api/random/bluearchive');

// --- ROUTES HALAMAN UTAMA ---
app.get('/', (req, res) => {
    // Ambil index.html dari dalam folder 'api-page'
    const indexPath = path.join(__dirname, 'api-page', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(500).send("Error: index.html tidak ditemukan di dalam folder api-page!");
    }
});

// Custom 404
app.use((req, res) => { res.status(404).json({status: false, error: "404 Not Found"}); });

app.listen(PORT, () => { console.log(`Server running at ${PORT}`); });
module.exports = app;
