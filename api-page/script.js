// Pastikan DOM sudah dimuat sepenuhnya sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', async () => {
    // Selektor Elemen DOM Utama
    const DOM = {
        loadingScreen: document.getElementById("loadingScreen"),
        body: document.body,
        sideNav: document.querySelector('.side-nav'),
        mainWrapper: document.querySelector('.main-wrapper'),
        navCollapseBtn: document.querySelector('.nav-collapse-btn'),
        menuToggle: document.querySelector('.menu-toggle'),
        themeToggle: document.getElementById('themeToggle'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearch'),
        apiContent: document.getElementById('apiContent'),
        notificationToast: document.getElementById('notificationToast'),
        notificationBell: document.getElementById('notificationBell'),
        notificationBadge: document.getElementById('notificationBadge'),
        modal: {
            instance: null,
            element: document.getElementById('apiResponseModal'),
            label: document.getElementById('apiResponseModalLabel'),
            desc: document.getElementById('apiResponseModalDesc'),
            endpoint: document.getElementById('apiEndpoint'),
            queryInputContainer: document.getElementById('apiQueryInputContainer'),
            responseContent: document.getElementById('apiResponseContent'),
            responseContainer: document.getElementById('responseContainer'),
            submitBtn: document.getElementById('submitQueryBtn'),
            loadingIndicator: document.getElementById('apiResponseLoading'),
            copyEndpointBtn: document.getElementById('copyEndpoint'),
            copyResponseBtn: document.getElementById('copyResponse'),
            dialog: document.getElementById('modalDialog')
        },
        pageTitle: document.getElementById('page'),
        wm: document.getElementById('wm'),
        appName: document.getElementById('name'),
        sideNavName: document.getElementById('sideNavName'),
        versionBadge: document.getElementById('version'),
        versionHeaderBadge: document.getElementById('versionHeader'),
        appDescription: document.getElementById('description'),
        dynamicImage: document.getElementById('dynamicImage'),
        apiLinksContainer: document.getElementById('apiLinks')
    };

    let settings = {};
    let currentApiData = null;
    let notificationData = [];
    let newNotificationsCount = 0;
    let originalBodyPaddingRight = '';

    // ---------- Utilities ----------
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const setPageContent = (element, text, fallback = "") => {
        if (element) element.textContent = text || fallback;
    };

    const showLoadingScreen = () => {
        if (DOM.loadingScreen) DOM.loadingScreen.style.display = 'flex';
    };

    const hideLoadingScreen = () => {
        if (!DOM.loadingScreen) return;
        DOM.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            DOM.loadingScreen.style.display = 'none';
        }, 300);
    };

    const showToast = (message, type = 'info') => {
        if (!DOM.notificationToast) return;

        const toastElement = DOM.notificationToast;
        const toastBody = toastElement.querySelector('.toast-body');
        const toastTitle = toastElement.querySelector('.toast-title');
        const toastIcon = toastElement.querySelector('.toast-icon');

        toastBody.textContent = message;
        toastElement.className = 'toast';

        switch (type) {
            case 'success':
                toastTitle.textContent = 'Berhasil';
                toastIcon.className = 'toast-icon fas fa-check-circle me-2';
                toastElement.classList.add('toast-success');
                break;
            case 'warning':
                toastTitle.textContent = 'Peringatan';
                toastIcon.className = 'toast-icon fas fa-exclamation-triangle me-2';
                toastElement.classList.add('toast-warning');
                break;
            case 'error':
                toastTitle.textContent = 'Terjadi Kesalahan';
                toastIcon.className = 'toast-icon fas fa-times-circle me-2';
                toastElement.classList.add('toast-error');
                break;
            default:
                toastTitle.textContent = 'Notifikasi';
                toastIcon.className = 'toast-icon fas fa-info-circle me-2';
                toastElement.classList.add('toast-info');
        }

        let bsToast = bootstrap.Toast.getInstance(toastElement);
        if (!bsToast) bsToast = new bootstrap.Toast(toastElement);
        bsToast.show();
    };

    const displayErrorState = (message) => {
        if (!DOM.apiContent) return;
        DOM.apiContent.innerHTML = `
            <div class="error-state">
                <h3>Terjadi Kesalahan</h3>
                <p>${message}</p>
            </div>
        `;
    };

    // ---------- Theme ----------
    const applyTheme = (theme) => {
        DOM.body.setAttribute('data-theme', theme);
        if (DOM.themeToggle) DOM.themeToggle.checked = theme === 'dark';
        localStorage.setItem('theme', theme);
    };

    const initTheme = () => {
        const saved = localStorage.getItem('theme');
        if (saved) {
            applyTheme(saved);
        } else {
            const prefersDark = window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark ? 'dark' : 'light');
        }
    };

    const handleThemeToggle = () => {
        const newTheme = DOM.themeToggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    // ---------- Side Nav ----------
    const toggleSideNavCollapse = () => {
        if (!DOM.sideNav || !DOM.mainWrapper || !DOM.navCollapseBtn) return;

        const isCollapsed = DOM.sideNav.classList.toggle('collapsed');
        DOM.mainWrapper.classList.toggle('expanded');

        const collapseIcon = DOM.navCollapseBtn.querySelector('i');
        if (collapseIcon) {
            collapseIcon.classList.toggle('fa-angle-left', !isCollapsed);
            collapseIcon.classList.toggle('fa-angle-right', isCollapsed);
        }

        localStorage.setItem('sideNavCollapsed', isCollapsed ? 'true' : 'false');
    };

    const toggleSideNavMobile = () => {
        if (!DOM.sideNav) return;

        const isOpen = DOM.sideNav.classList.toggle('open');
        DOM.body.classList.toggle('no-scroll', isOpen);

        if (isOpen) {
            originalBodyPaddingRight = DOM.body.style.paddingRight;
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            DOM.body.style.paddingRight = `${scrollBarWidth}px`;
        } else {
            DOM.body.style.paddingRight = originalBodyPaddingRight || '';
        }
    };

    const initSideNavCollapsedState = () => {
        if (!DOM.sideNav || !DOM.mainWrapper || !DOM.navCollapseBtn) return;

        const isCollapsed = localStorage.getItem('sideNavCollapsed') === 'true';
        if (isCollapsed) {
            DOM.sideNav.classList.add('collapsed');
            DOM.mainWrapper.classList.add('expanded');

            const collapseIcon = DOM.navCollapseBtn.querySelector('i');
            if (collapseIcon) {
                collapseIcon.classList.remove('fa-angle-left');
                collapseIcon.classList.add('fa-angle-right');
            }
        }
    };

    const closeSideNavIfOpenOnMobile = () => {
        if (!DOM.sideNav) return;

        if (DOM.sideNav.classList.contains('open')) {
            DOM.sideNav.classList.remove('open');
            DOM.body.classList.remove('no-scroll');
            DOM.body.style.paddingRight = originalBodyPaddingRight || '';
        }
    };

    const initSideNav = () => {
        initSideNavCollapsedState();

        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) closeSideNavIfOpenOnMobile();
        });

        document.addEventListener('click', (event) => {
            if (window.innerWidth > 992) return;
            if (!DOM.sideNav.classList.contains('open')) return;
            if (!DOM.sideNav.contains(event.target) && !DOM.menuToggle.contains(event.target)) {
                closeSideNavIfOpenOnMobile();
            }
        });
    };

    // ---------- Search ----------
    const filterApis = (query) => {
        if (!DOM.apiContent || !settings.categories || !settings.categories.length) return;

        const q = query.trim().toLowerCase();
        const items = DOM.apiContent.querySelectorAll('.api-item');

        if (!q) {
            items.forEach(i => i.classList.remove('hidden'));
            return;
        }

        items.forEach(item => {
            const title = item.querySelector('.api-name')?.textContent.toLowerCase() || '';
            const desc = item.querySelector('.api-description')?.textContent.toLowerCase() || '';
            const methods = item.dataset.methods?.toLowerCase() || '';
            const endpoint = item.dataset.endpoint?.toLowerCase() || '';

            const match =
                title.includes(q) ||
                desc.includes(q) ||
                methods.includes(q) ||
                endpoint.includes(q);

            item.classList.toggle('hidden', !match);
        });
    };

    const handleSearchInput = (event) => {
        filterApis(event.target.value);
    };

    const clearSearch = () => {
        if (!DOM.searchInput) return;
        DOM.searchInput.value = '';
        filterApis('');
    };

    // ---------- Branding & Banner ----------
    const populatePageContent = () => {
        if (!settings || Object.keys(settings).length === 0) return;

        const currentYear = new Date().getFullYear();
        const creator = settings.apiSettings?.creator || 'Ada';

        setPageContent(DOM.pageTitle, settings.name || 'Ada API', 'Ada API');
        setPageContent(DOM.wm, `© ${currentYear} ${creator}. Semua hak dilindungi.`);
        setPageContent(DOM.appName, settings.name || 'Ada API', 'Ada API');
        setPageContent(DOM.sideNavName, settings.name || 'Ada API');
        setPageContent(DOM.versionBadge, settings.version || 'v1.0', 'v1.0');
        setPageContent(DOM.versionHeaderBadge, settings.header?.status || 'Online!', 'Online!');
        setPageContent(
            DOM.appDescription,
            settings.description || 'Antarmuka dokumentasi Ada API yang simpel, modern, dan mudah disesuaikan.',
            'Antarmuka dokumentasi Ada API yang simpel, modern, dan mudah disesuaikan.'
        );

        // Banner GIF utama
        if (DOM.dynamicImage) {
            const defaultGif = '/src/banner.gif';
            const fallbackStatic = '/src/banner-fallback.jpg';

            const bannerSrc = settings.bannerImage || defaultGif;

            DOM.dynamicImage.src = bannerSrc;
            DOM.dynamicImage.alt = settings.name
                ? `${settings.name} Banner`
                : 'Ada API Banner';
            DOM.dynamicImage.style.display = '';
            DOM.dynamicImage.style.opacity = '0';

            let hasTriedFallback = false;

            DOM.dynamicImage.onload = () => {
                DOM.dynamicImage.classList.add('banner-loaded');
                DOM.dynamicImage.style.opacity = '1';
            };

            DOM.dynamicImage.onerror = () => {
                if (hasTriedFallback || !fallbackStatic) {
                    DOM.dynamicImage.classList.add('banner-error');
                    DOM.dynamicImage.style.opacity = '1';
                    return;
                }
                hasTriedFallback = true;
                DOM.dynamicImage.src = fallbackStatic;
                DOM.dynamicImage.alt = 'Ada API Banner Fallback';
                DOM.dynamicImage.style.display = '';
                DOM.dynamicImage.style.opacity = '1';
                showToast('Banner GIF gagal dimuat, menggunakan gambar cadangan.', 'warning');
            };
        }

        // Link hero
        if (DOM.apiLinksContainer) {
            DOM.apiLinksContainer.innerHTML = '';
            const defaultLinks = [
                {
                    url: 'https://github.com/adamhasani/ada-api.git',
                    name: 'Lihat di GitHub',
                    icon: 'fab fa-github'
                }
            ];
            const linksToRender = settings.links?.length ? settings.links : defaultLinks;

            linksToRender.forEach(({ url, name, icon }, index) => {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'api-link btn btn-primary';
                link.style.animationDelay = `${index * 0.1}s`;
                link.setAttribute('aria-label', name);

                const iconElement = document.createElement('i');
                iconElement.className = icon || 'fas fa-external-link-alt';
                iconElement.setAttribute('aria-hidden', 'true');

                link.appendChild(iconElement);
                link.appendChild(document.createTextNode(` ${name}`));
                DOM.apiLinksContainer.appendChild(link);
            });
        }
    };

    const initHeroBannerEffects = () => {
        const banner = DOM.dynamicImage;
        if (!banner) return;

        const container = banner.closest('.banner-container');
        if (!container) return;

        banner.style.transition = 'transform 400ms ease, filter 400ms ease, opacity 400ms ease';
        banner.style.transform = 'scale(1.02)';
        container.style.perspective = '1200px';

        const handleMove = (e) => {
            const rect = container.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            const rotateX = y * -6;
            const rotateY = x * 8;

            banner.style.transform = `
                scale(1.03)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
            `;
            banner.style.filter = 'brightness(1.08)';
        };

        const handleLeave = () => {
            banner.style.transform = 'scale(1.02) rotateX(0deg) rotateY(0deg)';
            banner.style.filter = 'brightness(1)';
        };

        container.addEventListener('mousemove', handleMove);
        container.addEventListener('mouseleave', handleLeave);
    };

    // ---------- Render Kategori & API ----------
    const renderApiCategories = () => {
        if (!DOM.apiContent || !settings.categories || !settings.categories.length) {
            displayErrorState('Tidak ada kategori API yang ditemukan.');
            return;
        }

        DOM.apiContent.innerHTML = '';

        settings.categories.forEach((category, categoryIndex) => {
            const sortedItems = category.items.slice().sort((a, b) => a.name.localeCompare(b.name));

            const section = document.createElement('section');
            section.className = 'category-section';
            section.style.animationDelay = `${categoryIndex * 0.15}s`;

            const header = document.createElement('h3');
            header.className = 'category-title';
            header.textContent = category.name;

            const desc = document.createElement('p');
            desc.className = 'category-description';
            desc.textContent = category.description || '';

            const grid = document.createElement('div');
            grid.className = 'api-grid';

            sortedItems.forEach((item, itemIndex) => {
                const card = document.createElement('article');
                card.className = 'api-item glass-card';
                card.style.animationDelay = `${(categoryIndex * 0.15) + (itemIndex * 0.05)}s`;
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', `Buka detail API ${item.name}`);
                card.dataset.endpoint = item.endpoint;
                card.dataset.methods = (item.methods || []).join(', ');

                const methodBadges = (item.methods || []).map(method => {
                    const cls =
                        method === 'GET' ? 'badge-get' :
                        method === 'POST' ? 'badge-post' :
                        method === 'PUT' ? 'badge-put' :
                        method === 'DELETE' ? 'badge-delete' :
                        'badge-default';
                    return `<span class="method-badge ${cls}">${method}</span>`;
                }).join(' ');

                card.innerHTML = `
                    <div class="api-header">
                        <div class="api-title-group">
                            <h4 class="api-name">${item.name}</h4>
                            <div class="api-meta">
                                ${item.authRequired
                                    ? '<span class="badge-auth"><i class="fas fa-lock"></i> Auth</span>'
                                    : '<span class="badge-no-auth"><i class="fas fa-unlock"></i> Publik</span>'}
                                ${item.categoryLabel
                                    ? `<span class="badge-category">${item.categoryLabel}</span>`
                                    : ''}
                            </div>
                        </div>
                        <div class="api-methods">
                            ${methodBadges}
                        </div>
                    </div>
                    <p class="api-description">${item.description || ''}</p>
                    <div class="api-footer">
                        <code class="api-endpoint-preview">${item.endpoint}</code>
                        <button class="btn btn-sm btn-outline-light api-test-btn">
                            <span>Uji</span>
                            <i class="fas fa-play ms-2"></i>
                        </button>
                    </div>
                `;

                const open = () => {
                    currentApiData = item;
                    openApiModal(item);
                };

                card.addEventListener('click', open);
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        open();
                    }
                });

                grid.appendChild(card);
            });

            section.appendChild(header);
            section.appendChild(desc);
            section.appendChild(grid);
            DOM.apiContent.appendChild(section);
        });
    };

    // ---------- Modal ----------
    const initModal = () => {
        if (!DOM.modal.element) return;
        DOM.modal.instance = new bootstrap.Modal(DOM.modal.element, {
            backdrop: 'static',
            keyboard: true
        });

        DOM.modal.element.addEventListener('hidden.bs.modal', resetModal);

        if (DOM.modal.copyEndpointBtn) {
            DOM.modal.copyEndpointBtn.addEventListener('click', () => {
                const text = DOM.modal.endpoint.textContent.trim();
                if (!text) return;
                navigator.clipboard.writeText(text)
                    .then(() => showToast('Endpoint disalin ke clipboard.', 'success'))
                    .catch(() => showToast('Gagal menyalin endpoint.', 'error'));
            });
        }

        if (DOM.modal.copyResponseBtn) {
            DOM.modal.copyResponseBtn.addEventListener('click', () => {
                const text = DOM.modal.responseContent.textContent.trim();
                if (!text) return;
                navigator.clipboard.writeText(text)
                    .then(() => showToast('Respons disalin ke clipboard.', 'success'))
                    .catch(() => showToast('Gagal menyalin respons.', 'error'));
            });
        }
    };

    const resetModal = () => {
        DOM.modal.label.textContent = 'Nama API';
        DOM.modal.desc.textContent = 'Deskripsi API.';
        DOM.modal.endpoint.textContent = '';
        DOM.modal.queryInputContainer.innerHTML = '';
        DOM.modal.responseContent.textContent = '';
        DOM.modal.responseContent.classList.add('d-none');
        DOM.modal.responseContainer.classList.add('d-none');
        DOM.modal.loadingIndicator.classList.add('d-none');
        DOM.modal.submitBtn.disabled = true;
        DOM.modal.submitBtn.innerHTML = `<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>`;
        DOM.modal.dialog.classList.remove('modal-error');
    };

    const openApiModal = (item) => {
        if (!DOM.modal.instance) return;

        currentApiData = item;

        DOM.modal.label.textContent = item.name;
        DOM.modal.desc.textContent = item.description || 'Tidak ada deskripsi.';
        DOM.modal.endpoint.textContent = item.endpoint || '';

        DOM.modal.queryInputContainer.innerHTML = '';

        const params = item.parameters || {};
        const keys = Object.keys(params);

        if (keys.length > 0) {
            keys.forEach((key) => {
                const cfg = params[key];

                const wrap = document.createElement('div');
                wrap.className = 'mb-3';

                const label = document.createElement('label');
                label.className = 'form-label';
                label.setAttribute('for', `param-${key}`);
                label.textContent = `${key}${cfg.required ? ' *' : ''}`;

                const input = document.createElement('input');
                input.id = `param-${key}`;
                input.className = 'form-control';
                input.type = cfg.type === 'number' ? 'number' : 'text';
                input.placeholder = cfg.placeholder || `Masukkan ${key}...`;
                input.dataset.param = key;
                input.required = !!cfg.required;

                wrap.appendChild(label);
                wrap.appendChild(input);
                DOM.modal.queryInputContainer.appendChild(wrap);
            });

            DOM.modal.submitBtn.disabled = false;
        } else {
            DOM.modal.queryInputContainer.innerHTML =
                '<p class="text-muted mb-0">Endpoint ini tidak memerlukan parameter tambahan.</p>';
            DOM.modal.submitBtn.disabled = false;
        }

        DOM.modal.responseContent.classList.add('d-none');
        DOM.modal.responseContainer.classList.add('d-none');
        DOM.modal.loadingIndicator.classList.add('d-none');
        DOM.modal.dialog.classList.remove('modal-error');
        DOM.modal.submitBtn.innerHTML = `<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>`;

        DOM.modal.instance.show();
    };

    const buildQueryParams = () => {
        const inputs = DOM.modal.queryInputContainer
            ? DOM.modal.queryInputContainer.querySelectorAll('input[data-param]')
            : [];
        const params = [];
        inputs.forEach(input => {
            const key = input.dataset.param;
            const val = input.value.trim();
            if (val !== '') {
                params.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
            }
        });
        return params.length ? `?${params.join('&')}` : '';
    };

    const handleSubmitApiRequest = async () => {
        if (!currentApiData) return;

        try {
            DOM.modal.dialog.classList.remove('modal-error');
            DOM.modal.responseContent.classList.add('d-none');
            DOM.modal.responseContainer.classList.add('d-none');

            DOM.modal.loadingIndicator.classList.remove('d-none');
            DOM.modal.submitBtn.disabled = true;
            DOM.modal.submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Memproses...`;

            const queryParams = buildQueryParams();
            const url = `${window.location.origin}${currentApiData.endpoint}${queryParams}`;

            const options = {
                method: currentApiData.methods?.[0] || 'GET',
                headers: {}
            };

            if (currentApiData.requiresAuth && currentApiData.authToken) {
                options.headers['Authorization'] = `Bearer ${currentApiData.authToken}`;
            }

            const response = await fetch(url, options);
            const contentType = response.headers.get('Content-Type') || '';

            if (contentType.includes('application/json')) {
                const json = await response.json();
                DOM.modal.responseContent.textContent = JSON.stringify(json, null, 2);
            } else {
                const text = await response.text();
                DOM.modal.responseContent.textContent = text || '(respons kosong)';
            }

            DOM.modal.responseContent.classList.remove('d-none');
            DOM.modal.responseContainer.classList.remove('d-none');
            showToast('Permintaan API berhasil diproses.', 'success');
        } catch (err) {
            console.error('API error:', err);
            DOM.modal.responseContent.textContent = `Terjadi kesalahan: ${err.message}`;
            DOM.modal.responseContent.classList.remove('d-none');
            DOM.modal.responseContainer.classList.remove('d-none');
            DOM.modal.dialog.classList.add('modal-error');
            showToast('Terjadi kesalahan saat memproses permintaan API.', 'error');
        } finally {
            DOM.modal.loadingIndicator.classList.add('d-none');
            DOM.modal.submitBtn.disabled = false;
            DOM.modal.submitBtn.innerHTML = `<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>`;
        }
    };

    // ---------- Notifications ----------
    const updateNotificationBadge = () => {
        if (!DOM.notificationBadge) return;

        if (newNotificationsCount > 0) {
            DOM.notificationBadge.textContent = newNotificationsCount;
            DOM.notificationBadge.style.display = 'inline-block';
        } else {
            DOM.notificationBadge.textContent = '';
            DOM.notificationBadge.style.display = 'none';
        }
    };

    const loadNotifications = async () => {
        try {
            const res = await fetch('/src/notifications.json');
            if (!res.ok) throw new Error(`Gagal memuat notifikasi: ${res.status}`);
            const data = await res.json();
            notificationData = data.notifications || [];
            newNotificationsCount = notificationData.filter(n => !n.read).length;
            updateNotificationBadge();
        } catch (err) {
            console.error('Error load notifications:', err);
        }
    };

    const showLatestNotification = () => {
        if (!notificationData.length) {
            showToast('Belum ada notifikasi.', 'info');
            return;
        }
        const latest = notificationData[0];
        showToast(latest.message || 'Notifikasi baru.', latest.type || 'info');
        latest.read = true;
        newNotificationsCount = notificationData.filter(n => !n.read).length;
        updateNotificationBadge();
    };

    // ---------- Observer ----------
    const observeApiItems = () => {
        if (!DOM.apiContent) return;
        const items = DOM.apiContent.querySelectorAll('.api-item');
        if (!items.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) e.target.classList.add('visible');
            });
        }, {
            threshold: 0.1
        });

        items.forEach(i => observer.observe(i));
    };

    // ---------- Init & Events ----------
    const setupEventListeners = () => {
        if (DOM.navCollapseBtn) DOM.navCollapseBtn.addEventListener('click', toggleSideNavCollapse);
        if (DOM.menuToggle) DOM.menuToggle.addEventListener('click', toggleSideNavMobile);
        if (DOM.themeToggle) DOM.themeToggle.addEventListener('change', handleThemeToggle);
        if (DOM.searchInput) DOM.searchInput.addEventListener('input', debounce(handleSearchInput, 200));
        if (DOM.clearSearchBtn) DOM.clearSearchBtn.addEventListener('click', clearSearch);
        if (DOM.notificationBell) DOM.notificationBell.addEventListener('click', () => {
            showLatestNotification();
            newNotificationsCount = 0;
            updateNotificationBadge();
        });
        if (DOM.modal.submitBtn) DOM.modal.submitBtn.addEventListener('click', handleSubmitApiRequest);
    };

    const init = async () => {
        setupEventListeners();
        initTheme();
        initSideNav();
        initModal();
        await loadNotifications();

        try {
            const res = await fetch('/src/settings.json');
            if (!res.ok) throw new Error(`Gagal memuat pengaturan: ${res.status}`);
            settings = await res.json();
            populatePageContent();
            initHeroBannerEffects();
            renderApiCategories();
            observeApiItems();
        } catch (err) {
            console.error('Error load settings:', err);
            showToast(`Gagal memuat pengaturan: ${err.message}`, 'error');
            displayErrorState('Tidak dapat memuat konfigurasi API.');
        } finally {
            hideLoadingScreen();
        }
    };

    showLoadingScreen();
    await init();
});