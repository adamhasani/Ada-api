// script.js – sinkron dengan index.html old money + support gambar + ikon tengkorak error

document.addEventListener('DOMContentLoaded', async () => {
    const apiContent = document.getElementById('apiContent');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    const modalEl = document.getElementById('apiResponseModal');
    const apiResponseContent = document.getElementById('apiResponseContent');
    const apiSkeleton = document.getElementById('apiSkeleton');

    const bootstrapModal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let settings = null;

    // =========================
    //  LOAD SETTINGS + RENDER
    // =========================

    async function loadSettings() {
        try {
            const res = await fetch('/src/settings.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            settings = await res.json();
            renderApiFromSettings(settings);
        } catch (err) {
            console.error('Gagal memuat settings.json:', err);
            if (apiContent) {
                apiContent.innerHTML = `
                    <div class="no-results-message text-center p-5">
                        <i class="fas fa-skull-crossbones fa-3x mb-3 icon-error-skull"></i>
                        <p class="h5">Gagal memuat konfigurasi API.</p>
                        <p class="text-muted">Periksa file <code>src/settings.json</code> atau coba muat ulang halaman.</p>
                        <button class="btn btn-primary mt-3" onclick="location.reload()">
                            <i class="fas fa-sync-alt me-2"></i> Muat Ulang
                        </button>
                    </div>
                `;
            }
        }
    }

    function renderApiFromSettings(settings) {
        if (!apiContent) return;

        const categories = Array.isArray(settings.categories) ? settings.categories : [];
        apiContent.innerHTML = '';

        if (!categories.length) {
            apiContent.innerHTML = `<p class="mb-0 text-muted">Belum ada endpoint yang dikonfigurasi.</p>`;
            return;
        }

        categories.forEach((cat, catIndex) => {
            const catName = cat.name || `Kategori ${catIndex + 1}`;
            const catId = `category-${catName.toLowerCase().replace(/\s+/g, '-')}`;

            const section = document.createElement('section');
            section.className = 'category-section mb-3';
            section.id = catId;

            const header = document.createElement('h3');
            header.className = 'category-header h6 mb-2';
            header.textContent = catName;
            section.appendChild(header);

            const items = Array.isArray(cat.items) ? cat.items.slice() : [];
            items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            items.forEach((item, itemIndex) => {
                const name = item.name || `Endpoint ${itemIndex + 1}`;
                const desc = item.desc || '';
                const path = item.path || '/';
                const method = (item.method || 'GET').toUpperCase();
                const categorySlug = (catName || 'other').toLowerCase().replace(/\s+/g, '-');

                const card = document.createElement('article');
                card.className = 'api-card';
                card.dataset.category = categorySlug;
                card.dataset.name = name.toLowerCase();
                card.dataset.desc = desc.toLowerCase();

                const headerRow = document.createElement('div');
                headerRow.className = 'api-card-header';

                const info = document.createElement('div');

                const titleEl = document.createElement('div');
                titleEl.className = 'api-card-title';
                titleEl.textContent = name;

                const descEl = document.createElement('div');
                descEl.className = 'api-card-desc';
                descEl.textContent = desc;

                info.appendChild(titleEl);
                info.appendChild(descEl);

                const badge = document.createElement('span');
                badge.className = 'http-badge ' + getMethodBadgeClass(method);
                badge.textContent = method;

                headerRow.appendChild(info);
                headerRow.appendChild(badge);

                const footer = document.createElement('div');
                footer.className = 'api-card-footer';

                const pathEl = document.createElement('span');
                pathEl.className = 'api-path';
                pathEl.textContent = path;

                const openBtn = document.createElement('button');
                openBtn.type = 'button';
                openBtn.className = 'api-open-btn';
                openBtn.textContent = 'Detail';
                openBtn.dataset.path = path;
                openBtn.dataset.method = method;

                footer.appendChild(pathEl);
                footer.appendChild(openBtn);

                card.appendChild(headerRow);
                card.appendChild(footer);

                section.appendChild(card);
            });

            apiContent.appendChild(section);
        });

        applyFilterAndSearch();
    }

    function getMethodBadgeClass(method) {
        switch (method) {
            case 'GET': return 'http-get';
            case 'POST': return 'http-post';
            case 'PUT': return 'http-put';
            case 'DELETE': return 'http-delete';
            default: return 'http-get';
        }
    }

    // =========================
    //  SEARCH + FILTER
    // =========================

    function applyFilterAndSearch() {
        const term = (searchInput?.value || '').trim().toLowerCase();

        const activeChip = document.querySelector('.filter-chip.active');
        const filter = activeChip ? (activeChip.dataset.filter || 'all') : 'all';

        const cards = document.querySelectorAll('.api-card');
        cards.forEach(card => {
            const name = card.dataset.name || '';
            const desc = card.dataset.desc || '';
            const cat = card.dataset.category || '';

            const matchSearch =
                !term ||
                name.includes(term) ||
                desc.includes(term) ||
                cat.includes(term);

            const matchFilter =
                filter === 'all' ||
                cat === filter;

            card.style.display = (matchSearch && matchFilter) ? '' : 'none';
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (clearSearchBtn) {
                clearSearchBtn.classList.toggle('visible', searchInput.value.trim().length > 0);
            }
            applyFilterAndSearch();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (!searchInput) return;
            searchInput.value = '';
            searchInput.focus();
            clearSearchBtn.classList.remove('visible');
            applyFilterAndSearch();
        });
    }

    const filterChips = document.querySelectorAll('.filter-chip');
    if (filterChips.length) {
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                setTimeout(applyFilterAndSearch, 0);
            });
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === '/' &&
            document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            searchInput?.focus();
        }
    });

    // =========================
    //  HANDLER KLIK API CARD
    // =========================

    if (apiContent) {
        apiContent.addEventListener('click', (event) => {
            const btn = event.target.closest('.api-open-btn');
            if (!btn) return;

            const method = (btn.dataset.method || 'GET').toUpperCase();
            const path = btn.dataset.path || '/';

            openModalAndFetch(method, path);
        });
    }

    async function openModalAndFetch(method, path) {
        const base = window.location.origin;
        const url = new URL(path, base).href;

        if (window.adaUI && typeof window.adaUI.startLoading === 'function') {
            window.adaUI.setRequestMeta({
                method,
                url,
                body: null,
                status: ''
            });
            window.adaUI.startLoading({ method, url });
        } else {
            if (apiSkeleton && apiResponseContent) {
                apiSkeleton.classList.remove('d-none');
                apiResponseContent.classList.add('d-none');
            }
        }

        if (bootstrapModal) {
            bootstrapModal.show();
        }

        let responseText = '';
        let statusCode = '';
        let isHtml = false;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            statusCode = res.status;
            const contentType = (res.headers.get('Content-Type') || '').toLowerCase();

            if (contentType.includes('application/json')) {
                const data = await res.json();
                responseText = JSON.stringify(data, null, 2);
            } else if (contentType.startsWith('image/')) {
                const blob = await res.blob();
                const imgUrl = URL.createObjectURL(blob);
                responseText = `<img src="${imgUrl}" alt="API Image" style="max-width:100%;border-radius:8px;display:block;margin:auto;" />`;
                isHtml = true;
            } else {
                responseText = await res.text();
            }

        } catch (err) {
            console.error('Error request API:', err);
            responseText = `Request error: ${err.message || err}`;
        }

        if (window.adaUI && typeof window.adaUI.endLoading === 'function') {
            window.adaUI.endLoading({
                responseText,
                status: statusCode,
                isHtml
            });
        } else if (apiResponseContent) {
            if (apiSkeleton) apiSkeleton.classList.add('d-none');
            apiResponseContent.classList.remove('d-none');
            if (isHtml) {
                apiResponseContent.innerHTML = responseText;
            } else {
                apiResponseContent.textContent = responseText;
            }
        }
    }

    // =========================
    //  START
    // =========================

    await loadSettings();
});