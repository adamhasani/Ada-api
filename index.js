const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.enable('trust proxy');
app.set("json spaces", 2);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- PERBAIKAN STATIC FILES UNTUK VERCEL ---
// Gunakan process.cwd() agar file script.js/settings.json terbaca
app.use(express.static(process.cwd())); 
app.use('/src', express.static(path.join(process.cwd(), 'src')));

// --- LOAD ROUTES API ---
try {
    // Pastikan path require ini SESUAI dengan struktur folder kamu
    // Kalau salah satu file ini tidak ada, hapus barisnya!
    
    // 1. Downloaders
    require('./src/api/download/ytmp3')(app);
    
    // 2. Tools
    require('./src/api/tools/tourl')(app);
    
    // 3. Random (Pilih salah satu sesuai nama file kamu: ba.js atau bluearchive.js)
    // require('./src/api/random/ba')(app); 
    require('./src/api/random/bluearchive')(app);

    // 4. AI (Jika ada)
    // require('./src/api/ai/luminai')(app);
    
    console.log("✅ Routes Loaded");
} catch (error) {
    console.log("⚠️ Route Error:", error.message);
}

// --- HALAMAN UTAMA (FIX NOT FOUND) ---
app.get('/', (req, res) => {
    // Gunakan process.cwd() untuk menemukan index.html
    const indexPath = path.join(process.cwd(), 'index.html');
    
    // Cek apakah file ada sebelum dikirim (opsional tapi aman)
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(500).send("Error loading index.html: " + err.message);
        }
    });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
