/**
 * ADA API CONSOLE - MAIN SCRIPT (ULTIMATE EXTENDED EDITION)
 * =========================================================
 * Version: 5.0.0 (Stable Release)
 * Author: Ada API Team
 * * FEATURES:
 * - Dynamic Sidebar & Theme Engine
 * - Smart Search & Filtering
 * - LocalStorage Favorites & History
 * - Hybrid API Response View (JSON vs GUI)
 * - Auto File Upload Detection
 * - Multi-MIME Type Rendering
 * - Robust Error Handling (Red Screen of Death)
 * - Mobile Friendly & Responsive
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ================================================================
    // 1. DOM ELEMENTS CACHE
    // Mengambil semua elemen HTML yang dibutuhkan di awal
    // ================================================================
    const DOM = {
        // Layout Utama
        body: document.body,
        mainContent: document.querySelector("main"),
        
        // Sidebar & Navigasi
        sideNav: document.querySelector(".side-nav"),
        sideNavLinks: document.querySelectorAll(".side-nav-link"),
        menuToggle: document.getElementById("menuToggle"),
        navCollapseBtn: document.getElementById("collapseBtn"),
        sidebarBackdrop: document.getElementById("sidebarBackdrop"),
        
        // Pencarian & Filter
        searchInput: document.getElementById("searchInput"),
        clearSearch: document.getElementById("clearSearch"),
        apiFilters: document.getElementById("apiFilters"),
        
        // Kontrol Tema
        themeToggle: document.getElementById("themeToggle"),
        themePreset: document.getElementById("themePreset"),
        
        // Area Konten API
        apiContent: document.getElementById("apiContent"),
        versionBadge: document.getElementById("versionBadge"),
        
        // Request Box (WhatsApp)
        apiRequestInput: document.getElementById("apiRequestInput"),
        sendApiRequest: document.getElementById("sendApiRequest"),
        
        // Logs & History
        logsConsole: document.getElementById("liveLogs"),
        requestHistoryList: document.getElementById("requestHistoryList"),
        
        // Visual Effects
        bannerParallax: document.getElementById("bannerParallax"),
        cursorGlow: document.getElementById("cursorGlow"),
        
        // MODAL ELEMENTS (Pop-up)
        modalEl: document.getElementById("apiResponseModal"),
        modalTitle: document.getElementById("modalTitle"),
        modalSubtitle: document.getElementById("modalSubtitle"),
        endpointText: document.getElementById("endpointText"),
        modalStatusLine: document.getElementById("modalStatusLine"),
        modalLoading: document.getElementById("modalLoading"),
        apiResponseContent: document.getElementById("apiResponseContent"),
        
        // Tombol Aksi di Modal
        copyEndpointBtn: document.getElementById("copyEndpointBtn"),
        copyCurlBtn: document.getElementById("copyCurlBtn"),
    };

    // Inisialisasi Bootstrap Modal Wrapper (dengan fallback)
    const modalInstance = DOM.modalEl && window.bootstrap ? new bootstrap.Modal(DOM.modalEl, { keyboard: true, backdrop: 'static' }) : null;

    // ================================================================
    // 2. STATE MANAGEMENT & STORAGE
    // Menyimpan data sementara dan data persisten (LocalStorage)
    // ================================================================
    let appSettings = null;
    let currentApiItem = null;
    
    // Load data dari LocalStorage dengan nilai default jika kosong
    let userFavorites = loadLocalStorage("ada-api-fav", []);
    let userHistory = loadLocalStorage("ada-api-history", []);
    let currentThemeMode = loadLocalStorage("ada-ui-mode", "light");
    let currentThemePreset = loadLocalStorage("ada-ui-theme", "emerald-gold");

    // Kategori cadangan jika fetch gagal total
    const fallbackCategories = [
        {
            name: "System",
            items: [
                { 
                    name: "Status Check", 
                    desc: "Cek koneksi ke server.", 
                    path: "/status", 
                    method: "GET",
                    status: "unknown" 
                }
            ]
        }
    ];

    // ================================================================
    // 3. UTILITY HELPER FUNCTIONS
    // Fungsi-fungsi bantuan umum
    // ================================================================
    
    function loadLocalStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error("LocalStorage Read Error:", error);
            return defaultValue;
        }
    }

    function saveLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("LocalStorage Save Error:", error);
        }
    }

    function appendLog(message, type = "info") {
        if (!DOM.logsConsole) return;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        const logLine = document.createElement("div");
        logLine.className = `log-line log-${type}`;
        logLine.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${message}</span>`;
        
        DOM.logsConsole.appendChild(logLine);
        DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
    }

    function beautifyJSON(jsonString) {
        try {
            const jsonObj = JSON.parse(jsonString);
            return JSON.stringify(jsonObj, null, 2);
        } catch (e) {
            return jsonString; // Kembalikan teks asli jika bukan JSON
        }
    }

    // --- CUSTOM TOAST NOTIFICATION SYSTEM ---
    function showToast(message, type = "success") {
        let toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999;";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        const bgClass = type === 'success' ? 'bg-success' : (type === 'danger' ? 'bg-danger' : 'bg-warning');
        
        toast.className = `toast align-items-center text-white ${bgClass} border-0 show`;
        toast.style.marginBottom = "10px";
        toast.style.padding = "12px 20px";
        toast.style.borderRadius = "8px";
        toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        toast.style.minWidth = "250px";
        toast.style.animation = "fadeIn 0.3s ease-out";
        
        toast.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="toast-body" style="font-size: 0.95rem;">
                    ${type === 'success' ? '<i class="fas fa-check-circle me-2"></i>' : '<i class="fas fa-exclamation-circle me-2"></i>'}
                    ${message}
                </div>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Hapus otomatis setelah 3 detik
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // --- SCREEN DEBUGGER (PENTING BUAT HP) ---
    // Menampilkan kotak merah besar jika terjadi error fatal
    function showErrorOnScreen(title, message) {
        if (DOM.apiContent) {
            DOM.apiContent.innerHTML = `
                <div style="background: #fff5f5; border: 2px solid #ff4444; padding: 25px; border-radius: 15px; color: #cc0000; text-align: center; margin: 20px; box-shadow: 0 10px 30px rgba(255,0,0,0.15);">
                    <i class="fas fa-bug fa-4x mb-4 text-danger"></i>
                    <h3 style="margin-top: 0; font-weight: 800; color: #d32f2f;">⚠️ ${title}</h3>
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ffcccc; margin: 20px 0; text-align: left; font-family: monospace; color: #333; word-break: break-word;">
                        <strong>Error Message:</strong><br>${message}
                    </div>
                    <p style="font-size: 0.9em; text-align: left; color: #555;">
                        <b>Troubleshooting:</b><br>
                        1. Pastikan file <code>src/settings.json</code> ada.<br>
                        2. Pastikan file API (JS) sudah di-update ke path <code>downloader</code>.<br>
                        3. Cek apakah <code>index.js</code> sudah mengarah ke folder <code>api-gate</code>.
                    </p>
                    <button onclick="location.reload()" class="btn btn-danger btn-lg mt-3 w-100 shadow-sm">
                        <i class="fas fa-sync-alt me-2"></i> Refresh Halaman
                    </button>
                </div>
            `;
        }
    }

    // ================================================================
    // 4. THEME & VISUAL ENGINE
    // Mengatur warna, dark mode, dan preset tema
    // ================================================================

    function initThemeEngine() {
        // Terapkan Mode (Light/Dark)
        applyThemeMode(currentThemeMode);
        
        // Terapkan Preset (Warna Aksen)
        applyThemePreset(currentThemePreset);

        // Listener: Toggle Switch
        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener("change", (e) => {
                const newMode = e.target.checked ? "dark" : "light";
                applyThemeMode(newMode);
            });
        }

        // Listener: Dropdown Preset
        if (DOM.themePreset) {
            DOM.themePreset.addEventListener("change", (e) => {
                const selectedValue = e.target.value;
                const map = {
                    "emerald": "emerald-gold",
                    "noir": "noir",
                    "ivory": "royal-amber",
                    "cyber": "cyber-glow"
                };
                const newPreset = map[selectedValue] || "emerald-gold";
                applyThemePreset(newPreset);
            });
        }
    }

    function applyThemeMode(mode) {
        currentThemeMode = mode;
        saveLocalStorage("ada-ui-mode", mode);
        
        if (mode === "dark") {
            DOM.body.classList.add("dark-mode");
            if (DOM.themeToggle) DOM.themeToggle.checked = true;
        } else {
            DOM.body.classList.remove("dark-mode");
            if (DOM.themeToggle) DOM.themeToggle.checked = false;
        }
    }

    function applyThemePreset(presetKey) {
        currentThemePreset = presetKey;
        saveLocalStorage("ada-ui-theme", presetKey);
        
        DOM.body.setAttribute("data-theme", presetKey);
        
        // Sinkronisasi Dropdown
        if (DOM.themePreset) {
            const reverseMap = {
                "emerald-gold": "emerald",
                "noir": "noir",
                "royal-amber": "ivory",
                "cyber-glow": "cyber"
            };
            DOM.themePreset.value = reverseMap[presetKey] || "emerald";
        }
    }

    // ================================================================
    // 5. SIDEBAR & NAVIGATION LOGIC
    // Mengatur buka-tutup sidebar (Mobile & Desktop)
    // ================================================================

    function initSidebarLogic() {
        // Toggle Desktop (Collapsed Mode)
        const toggleSidebar = () => DOM.sideNav.classList.toggle("collapsed");
        
        // Toggle Mobile (Offcanvas Mode)
        const toggleMobileSidebar = () => {
            const isOpen = DOM.sideNav.classList.contains("open");
            if (isOpen) {
                DOM.sideNav.classList.remove("open");
                DOM.body.classList.remove("sidebar-open");
                if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
            } else {
                DOM.sideNav.classList.add("open");
                DOM.body.classList.add("sidebar-open");
                if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add("show");
            }
        };

        // Event Listeners Buttons
        if (DOM.menuToggle) DOM.menuToggle.onclick = () => {
            if (window.innerWidth < 992) toggleMobileSidebar();
            else toggleSidebar();
        };

        if (DOM.navCollapseBtn) DOM.navCollapseBtn.onclick = toggleSidebar;
        
        if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.onclick = toggleMobileSidebar;

        // Auto close saat klik link (Mobile)
        DOM.sideNavLinks.forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth < 992) {
                    DOM.sideNav.classList.remove("open");
                    DOM.body.classList.remove("sidebar-open");
                    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
                }
            });
        });
    }

    // ================================================================
    // 6. FAVORITES & HISTORY SYSTEM
    // Mengelola daftar favorit user dan riwayat penggunaan API
    // ================================================================

    function toggleFavorite(path, buttonElement) {
        const index = userFavorites.indexOf(path);
        
        if (index === -1) {
            userFavorites.push(path);
            buttonElement.classList.add("favorited");
            const card = buttonElement.closest(".api-item");
            if (card) card.dataset.fav = "1";
            showToast("Ditambahkan ke Favorit");
        } else {
            userFavorites.splice(index, 1);
            buttonElement.classList.remove("favorited");
            const card = buttonElement.closest(".api-item");
            if (card) card.dataset.fav = "0";
            showToast("Dihapus dari Favorit", "danger");
        }
        
        saveLocalStorage("ada-api-fav", userFavorites);
    }

    function addToHistory(item) {
        userHistory.unshift({
            name: item.name,
            path: item.path,
            time: new Date().toISOString()
        });
        
        // Batasi histori max 20 item
        if (userHistory.length > 20) {
            userHistory = userHistory.slice(0, 20);
        }
        
        saveLocalStorage("ada-api-history", userHistory);
        renderHistoryList();
    }

    function renderHistoryList() {
        if (!DOM.requestHistoryList) return;
        DOM.requestHistoryList.innerHTML = "";
        
        if (userHistory.length === 0) {
            DOM.requestHistoryList.innerHTML = "<li class='text-muted small p-2'>Belum ada riwayat request.</li>";
            return;
        }

        userHistory.forEach(h => {
            const li = document.createElement("li");
            li.className = "history-item";
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center w-100">
                    <span class="history-name text-truncate" style="max-width: 150px;">${h.name}</span>
                    <span class="badge bg-secondary rounded-pill" style="font-size: 0.6rem">REQ</span>
                </div>
                <div class="history-path text-muted small text-truncate">${h.path}</div>
            `;
            DOM.requestHistoryList.appendChild(li);
        });
    }

    // ================================================================
    // 7. LOAD SETTINGS (CRITICAL PART)
    // Mengambil data API dari src/settings.json
    // ================================================================

    async function loadSettings() {
        try {
            appendLog("Menghubungi settings.json...");
            
            // Tambahkan timestamp agar browser tidak cache file settings
            // Kita arahkan ke /src/settings.json (karena index.js sudah mount /src)
            const res = await fetch("/src/settings.json?t=" + new Date().getTime());
            
            // --- DETEKSI ERROR ---
            if (res.status === 404) throw new Error("File settings.json Tidak Ditemukan (404). Cek path di index.js!");
            if (res.status === 500) throw new Error("Server Error (500). Cek log server.");
            if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
            
            try {
                appSettings = await res.json();
            } catch (jsonError) {
                throw new Error("Format JSON Salah. Cek file settings.json (Koma/Kurung berlebih).");
            }
            
            appendLog("Settings loaded successfully.");
            
            if(DOM.versionBadge && appSettings.version) {
                DOM.versionBadge.textContent = appSettings.version;
            }
            renderApiContent();
            
        } catch (err) {
            // TAMPILKAN LAYAR MERAH
            console.error(err);
            appendLog(`FATAL ERROR: ${err.message}`, "error");
            showErrorOnScreen("Gagal Memuat Data API", err.message);
        }
    }

    // ================================================================
    // 8. RENDER API CONTENT & CARDS
    // Fungsi utama untuk menampilkan daftar API ke layar
    // ================================================================

    function renderApiContent() {
        if (!DOM.apiContent || !appSettings) return;
        
        const categories = (appSettings.categories) ? appSettings.categories : fallbackCategories;
        
        // 1. Render Filter Buttons
        renderCategoryFilters(categories);
        
        // 2. Render Cards API
        DOM.apiContent.innerHTML = "";
        const row = document.createElement("div");
        row.className = "row g-4";

        categories.forEach(category => {
            if (!category.items) return;
            
            category.items.forEach(item => {
                const col = document.createElement("div");
                col.className = "col-12 col-md-6 col-lg-4 api-item";
                
                col.dataset.category = category.name;
                col.dataset.fav = userFavorites.includes(item.path) ? "1" : "0";
                
                col.innerHTML = `
                    <article class="api-card h-100">
                        <div class="api-card-header d-flex justify-content-between align-items-start mb-2">
                            <h4 class="api-card-title h6 fw-bold mb-0 text-truncate" title="${item.name}">${item.name}</h4>
                            <div class="d-flex align-items-center gap-2">
                                <span class="http-badge http-${(item.method||'GET').toLowerCase()} badge">${item.method||'GET'}</span>
                                <span class="endpoint-status-pill badge bg-secondary" data-path="${item.path}">...</span>
                            </div>
                        </div>
                        <p class="api-card-desc text-muted small mb-3">${item.desc || 'Deskripsi tidak tersedia.'}</p>
                        <div class="api-card-footer mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                            <code class="api-path small text-truncate me-2 bg-light px-2 py-1 rounded" style="max-width: 60%;">${item.path}</code>
                            <div class="api-card-actions">
                                <button type="button" class="btn btn-sm btn-primary api-open-btn"><i class="fas fa-play me-1"></i> Try</button>
                                <button type="button" class="btn btn-sm btn-outline-warning fav-toggle-btn ${userFavorites.includes(item.path) ? 'favorited' : ''}">
                                    <i class="fas fa-star"></i>
                                </button>
                            </div>
                        </div>
                    </article>
                `;

                // Bind Event Listeners
                const tryBtn = col.querySelector(".api-open-btn");
                const favBtn = col.querySelector(".fav-toggle-btn");

                tryBtn.onclick = () => openApiModal(item);
                favBtn.onclick = (e) => {
                    e.stopPropagation();
                    toggleFavorite(item.path, favBtn);
                };

                row.appendChild(col);
            });
        });

        DOM.apiContent.appendChild(row);
        
        // Cek status endpoint di background
        checkAllEndpointStatuses();
    }

    function renderCategoryFilters(categories) {
        if (!DOM.apiFilters) return;
        DOM.apiFilters.innerHTML = "";

        // Tombol 'Semua'
        const allBtn = document.createElement("button");
        allBtn.className = "filter-chip active";
        allBtn.textContent = "Semua";
        allBtn.dataset.filter = "all";
        DOM.apiFilters.appendChild(allBtn);

        // Tombol Per Kategori
        categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.className = "filter-chip";
            btn.textContent = cat.name;
            btn.dataset.filter = cat.name;
            DOM.apiFilters.appendChild(btn);
        });

        // Tombol 'Favorit'
        const favBtn = document.createElement("button");
        favBtn.className = "filter-chip";
        favBtn.textContent = "Favorit Saya";
        favBtn.dataset.filter = "favorites";
        DOM.apiFilters.appendChild(favBtn);

        // Logic Filter
        DOM.apiFilters.onclick = (e) => {
            if (!e.target.classList.contains("filter-chip")) return;
            DOM.apiFilters.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            filterApiItems(e.target.dataset.filter);
        };
    }

    function filterApiItems(filterValue) {
        const items = document.querySelectorAll(".api-item");
        const searchQuery = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : "";

        items.forEach(item => {
            const itemCategory = item.dataset.category;
            const isFav = item.dataset.fav === "1";
            const textContent = item.textContent.toLowerCase();

            let categoryMatch = false;
            if (filterValue === "all") categoryMatch = true;
            else if (filterValue === "favorites") categoryMatch = isFav;
            else categoryMatch = (itemCategory === filterValue);

            const searchMatch = textContent.includes(searchQuery);

            if (categoryMatch && searchMatch) {
                item.style.display = ""; // Show
            } else {
                item.style.display = "none"; // Hide
            }
        });
    }

    // ================================================================
    // 9. STATUS CHECKER (Background Task)
    // ================================================================

    function checkAllEndpointStatuses() {
        const statusPills = document.querySelectorAll(".endpoint-status-pill");
        
        statusPills.forEach(pill => {
            const methodBadge = pill.closest(".api-card").querySelector(".http-badge");
            const method = methodBadge ? methodBadge.textContent : "GET";
            
            // Skip checking POST/PUT
            if (method !== "GET") {
                pill.className = "endpoint-status-pill badge bg-success";
                pill.textContent = "Ready";
                return;
            }

            let urlToCheck = pill.dataset.path;
            if (!urlToCheck.startsWith("http")) {
                urlToCheck = window.location.origin + urlToCheck;
            }

            fetch(urlToCheck, { method: "HEAD" })
                .then(res => {
                    const isOnline = res.ok || res.status === 405 || res.status === 400;
                    if (isOnline) { 
                        pill.className = "endpoint-status-pill badge bg-success";
                        pill.textContent = "Online";
                    } else {
                        pill.className = "endpoint-status-pill badge bg-danger";
                        pill.textContent = "Error";
                    }
                })
                .catch(() => {
                    pill.className = "endpoint-status-pill badge bg-danger";
                    pill.textContent = "Offline";
                });
        });
    }

    // ================================================================
    // 10. MODAL & REQUEST EXECUTION (HYBRID ENGINE)
    // ================================================================

    function openApiModal(item) {
        currentApiItem = item;
        const method = (item.method || "GET").toUpperCase();

        // 1. Reset Modal UI
        DOM.modalTitle.textContent = item.name;
        DOM.modalSubtitle.textContent = item.desc;
        DOM.endpointText.textContent = item.path;
        
        DOM.modalStatusLine.textContent = "Ready to send...";
        DOM.modalStatusLine.className = "text-muted";
        
        DOM.apiResponseContent.innerHTML = ""; 
        DOM.modalLoading.classList.add("d-none"); 

        // 2. Tambah ke History
        addToHistory(item);

        // 3. Tampilkan Modal
        if (modalInstance) modalInstance.show();

        // 4. SMART LOGIC: Cek Metode Request
        if (method === "POST" || method === "PUT") {
            renderUploadForm();
        } else {
            executeApiRequest();
        }
    }

    function renderUploadForm() {
        DOM.apiResponseContent.innerHTML = `
            <div class="upload-zone text-center p-5 border rounded bg-light" style="border: 2px dashed #ccc !important; transition: all 0.3s;">
                <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                <h5>File Upload Required</h5>
                <p class="text-muted small">Endpoint ini membutuhkan file (Multipart/Form-Data).</p>
                <div class="mb-3 mt-4">
                    <input class="form-control form-control-lg" type="file" id="modalFileInput">
                </div>
                <button id="triggerUploadBtn" class="btn btn-primary w-100 btn-lg shadow-sm">
                    <i class="fas fa-paper-plane me-2"></i> Kirim Request
                </button>
            </div>
            <div id="uploadResultContainer" class="mt-4"></div>
        `;

        document.getElementById("triggerUploadBtn").onclick = () => {
            const fileInput = document.getElementById("modalFileInput");
            if (fileInput.files.length === 0) {
                showToast("Harap pilih file terlebih dahulu!", "warning");
                return;
            }
            executeApiRequest(fileInput.files[0]);
        };
    }

    async function executeApiRequest(fileData = null) {
        if (!currentApiItem) return;

        const method = (currentApiItem.method || "GET").toUpperCase();
        
        // Handle URL: Pastikan full domain
        let url = currentApiItem.path;
        if (!url.startsWith("http")) url = window.location.origin + url;
        
        const resultContainer = document.getElementById("uploadResultContainer") || DOM.apiResponseContent;
        
        DOM.modalLoading.classList.remove("d-none");
        DOM.modalStatusLine.textContent = "Sending Request...";
        DOM.modalStatusLine.className = "text-info fw-bold";
        
        appendLog(`[REQ] ${method} ${url}`);

        try {
            let fetchOptions = {
                method: method,
                headers: {}
            };

            if ((method === "POST" || method === "PUT") && fileData) {
                const formData = new FormData();
                formData.append("file", fileData); 
                fetchOptions.body = formData;
            }

            const startTime = performance.now();
            const response = await fetch(url, fetchOptions);
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(0);

            const statusClass = response.ok ? "text-success" : "text-danger";
            DOM.modalStatusLine.innerHTML = `<span class="${statusClass} fw-bold">Status: ${response.status} ${response.statusText}</span> <span class="text-muted ms-2">(${duration}ms)</span>`;

            const contentType = response.headers.get("content-type");
            let renderHtml = "";

            if (response.redirected) {
                renderHtml += `<div class="alert alert-info shadow-sm mb-3">Redirected to: ${response.url}</div>`;
            }

            // === RENDER LOGIC ===
            
            // 1. IMAGE DIRECT
            if (contentType && contentType.startsWith("image/")) {
                const blob = await response.blob();
                const imgUrl = URL.createObjectURL(blob);
                renderHtml += `<div class="text-center bg-dark p-3 rounded shadow-sm"><img src="${imgUrl}" class="img-fluid rounded" style="max-height: 400px;" alt="Response Image"></div>`;
            } 
            // 2. AUDIO DIRECT
            else if (contentType && contentType.startsWith("audio/")) {
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                renderHtml += `<div class="text-center p-4 bg-light rounded border shadow-sm"><audio controls class="w-100"><source src="${audioUrl}" type="${contentType}"></audio></div>`;
            }
            // 3. JSON / TEXT (Hybrid View Check)
            else {
                const textData = await response.text();
                
                try {
                    const jsonObj = JSON.parse(textData);
                    
                    // A. TAMPILAN DOWNLOADER (YTMP3/MP4)
                    if (jsonObj.result && (jsonObj.result.type === 'audio' || jsonObj.result.type === 'video')) {
                        const r = jsonObj.result;
                        renderHtml += `
                            <div class="card border-0 shadow-sm mb-3">
                                <div class="card-body text-center p-4">
                                    ${r.thumb ? `<img src="${r.thumb}" class="img-fluid rounded mb-3 shadow" style="max-height: 200px;">` : ''}
                                    <h4 class="fw-bold mb-2 text-dark">${r.title || "Media File"}</h4>
                                    <p class="text-muted small mb-4">
                                        ${r.duration ? `<i class="far fa-clock me-1"></i> ${r.duration}` : ''} 
                                        ${r.quality ? `<span class="mx-2">|</span> <i class="fas fa-video me-1"></i> ${r.quality}` : ''}
                                    </p>
                                    <a href="${r.url}" target="_blank" class="btn btn-success btn-lg w-100 mb-2 py-3 shadow-sm">
                                        <i class="fas fa-download me-2"></i> Download ${r.type.toUpperCase()}
                                    </a>
                                </div>
                                <div class="card-footer bg-light text-start">
                                    <details>
                                        <summary class="small text-primary fw-bold" style="cursor:pointer">Show Raw JSON (Developer)</summary>
                                        <pre class="mt-2 p-3 bg-dark text-white rounded small" style="overflow-x: auto;">${JSON.stringify(jsonObj, null, 2)}</pre>
                                    </details>
                                </div>
                            </div>
                        `;
                    }
                    // B. UPLOAD RESULT (Tourl)
                    else if (jsonObj.result && jsonObj.result.url) {
                        renderHtml += `
                            <div class="alert alert-success text-center shadow-sm">
                                <h4>✅ Upload Success!</h4>
                                <div class="input-group mb-3 mt-3">
                                    <input type="text" class="form-control" value="${jsonObj.result.url}" readonly>
                                    <button class="btn btn-outline-secondary" onclick="navigator.clipboard.writeText('${jsonObj.result.url}')">Copy</button>
                                </div>
                                <a href="${jsonObj.result.url}" target="_blank" class="btn btn-primary btn-sm px-4">Buka Link</a>
                            </div>
                            <pre class="bg-dark text-white p-3 rounded shadow-sm">${JSON.stringify(jsonObj, null, 2)}</pre>
                        `;
                    }
                    // C. JSON BIASA
                    else {
                        const prettyJson = JSON.stringify(jsonObj, null, 2);
                        renderHtml += `<pre class="json-response p-3 rounded shadow-sm" style="background: #1e1e1e; color: #d4d4d4; overflow: auto; max-height: 400px; font-family: 'Consolas', monospace;"><code>${prettyJson}</code></pre>`;
                    }
                } catch (e) {
                    // Plain Text
                    renderHtml += `<pre class="p-3 bg-light border rounded shadow-sm text-wrap">${textData}</pre>`;
                }
            }

            resultContainer.innerHTML = renderHtml;
            appendLog(`[RES] ${response.status} OK`);

        } catch (error) {
            console.error(error);
            resultContainer.innerHTML = `<div class="alert alert-danger shadow-sm"><strong>Request Failed:</strong><br>${error.message}</div>`;
            DOM.modalStatusLine.textContent = "Network Error";
            DOM.modalStatusLine.className = "text-danger fw-bold";
            appendLog(`[ERR] ${error.message}`, "error");
        } finally {
            DOM.modalLoading.classList.add("d-none");
        }
    }

    // FIX: ANTI STUCK MODAL
    if (DOM.modalEl) {
        DOM.modalEl.addEventListener('hidden.bs.modal', function () {
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            DOM.body.classList.remove('modal-open');
            DOM.body.style.overflow = 'auto'; 
            DOM.body.style.paddingRight = '0px';
        });
    }

    // ================================================================
    // 11. EVENTS & INTERACTIONS
    // ================================================================

    function initEvents() {
        if (DOM.copyEndpointBtn) {
            DOM.copyEndpointBtn.addEventListener("click", async () => {
                let path = DOM.endpointText.textContent.trim();
                let fullUrl = path.startsWith("http") ? path : window.location.origin + path;
                try {
                    await navigator.clipboard.writeText(fullUrl);
                    showToast("Link Endpoint Tersalin!");
                } catch (err) { showToast("Gagal menyalin link", "danger"); }
            });
        }

        if (DOM.copyCurlBtn) {
            DOM.copyCurlBtn.addEventListener("click", async () => {
                if (!currentApiItem) return;
                const method = (currentApiItem.method || "GET").toUpperCase();
                let fullUrl = currentApiItem.path;
                if (!fullUrl.startsWith("http")) fullUrl = window.location.origin + fullUrl;
                const curlCommand = `curl -X ${method} "${fullUrl}"`;
                try {
                    await navigator.clipboard.writeText(curlCommand);
                    showToast("Perintah cURL Tersalin!");
                } catch (err) { showToast("Gagal menyalin cURL", "danger"); }
            });
        }

        if (DOM.sendApiRequest) {
            DOM.sendApiRequest.addEventListener("click", () => {
                const msg = DOM.apiRequestInput.value.trim();
                if (!msg) { showToast("Ketik permintaan dulu!", "warning"); return; }
                const phone = "6287751121269"; 
                const text = encodeURIComponent(`Halo Admin, Request API:\n\n${msg}`);
                window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                DOM.apiRequestInput.value = "";
            });
        }

        if (DOM.searchInput) {
            DOM.searchInput.addEventListener("input", () => {
                const activeFilterBtn = DOM.apiFilters.querySelector(".active");
                const filterVal = activeFilterBtn ? activeFilterBtn.dataset.filter : "all";
                filterApiItems(filterVal);
            });
        }
        
        if (DOM.clearSearch) {
            DOM.clearSearch.addEventListener("click", () => {
                DOM.searchInput.value = "";
                filterApiItems("all");
            });
        }
    }

    // ================================================================
    // 12. INITIALIZATION
    // ================================================================

    function initVisualEffects() {
        // Banner Parallax
        if (DOM.bannerParallax) {
            DOM.bannerParallax.addEventListener("mousemove", (e) => {
                const rect = DOM.bannerParallax.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                const img = DOM.bannerParallax.querySelector("img");
                if (img) img.style.transform = `scale(1.1) translate(${x * 20}px, ${y * 20}px)`;
            });
        }
        
        // Scroll Reveal
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add("reveal-visible");
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    async function initApp() {
        appendLog("Initializing Ada API Console...");
        initSidebarLogic();
        initThemeEngine();
        initVisualEffects();
        initEvents();
        renderHistoryList();
        
        // Load Data from Server
        await loadSettings();
        
        appendLog("System Ready.");
    }

    initApp();
});