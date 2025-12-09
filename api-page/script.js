document.addEventListener("DOMContentLoaded", () => {
  const DOM = {
    body: document.body,
    sideNav: document.getElementById("sideNavigation"),
    collapseBtn: document.getElementById("collapseBtn"),
    menuToggle: document.getElementById("menuToggle"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    navLinks: document.querySelectorAll(".side-nav-link"),

    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearch"),

    themeToggle: document.getElementById("themeToggle"),
    themePreset: document.getElementById("themePreset"),

    apiFilters: document.getElementById("apiFilters"),
    apiContent: document.getElementById("apiContent"),

    historyList: document.getElementById("requestHistoryList"),
    liveLogs: document.getElementById("liveLogs"),

    cursorGlow: document.getElementById("cursorGlow"),

    bannerParallax: document.getElementById("bannerParallax"),

    apiRequestInput: document.getElementById("apiRequestInput"),
    sendApiRequest: document.getElementById("sendApiRequest"),

    // Modal
    modalEl: document.getElementById("apiResponseModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    endpointText: document.getElementById("endpointText"),
    modalStatusLine: document.getElementById("modalStatusLine"),
    modalLoading: document.getElementById("modalLoading"),
    responseContent: document.getElementById("apiResponseContent"),
    copyCurlBtn: document.getElementById("copyCurlBtn"),
    copyEndpointBtn: document.getElementById("copyEndpointBtn"),
  };

  const FAVORITES_KEY = "ada-favorites";
  const THEME_MODE_KEY = "ada-theme-mode";
  const THEME_PRESET_KEY = "ada-theme-preset";

  let settings = null;
  let favorites = loadFavorites();
  let currentFilter = "all";
  let currentCategory = "all";
  let searchText = "";
  let logs = [];
  let currentRequestMeta = null;

  const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl) : null;

  /* -----------------------------
     UTILS
  ------------------------------ */
  function slugify(str) {
    return (str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "uncategorized";
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {}
  }

  function isFavorite(id) {
    return favorites.includes(id);
  }

  function logLine(line) {
    const ts = new Date().toLocaleTimeString("id-ID", { hour12: false });
    const msg = `[${ts}] ${line}`;
    logs.push(msg);
    if (logs.length > 200) logs.shift();
    if (DOM.liveLogs) {
      DOM.liveLogs.textContent = logs.join("\n");
      DOM.liveLogs.scrollTop = DOM.liveLogs.scrollHeight;
    }
  }

  function syntaxHighlightJson(json) {
    json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      match => {
        let cls = "json-number";
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "json-key" : "json-string";
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  /* -----------------------------
     THEME MODE & PRESET
  ------------------------------ */
  function applyThemeMode(mode) {
    if (mode === "dark") {
      DOM.body.classList.add("dark-mode");
      if (DOM.themeToggle) DOM.themeToggle.checked = true;
    } else {
      DOM.body.classList.remove("dark-mode");
      if (DOM.themeToggle) DOM.themeToggle.checked = false;
    }
  }

  function initThemeMode() {
    let mode = localStorage.getItem(THEME_MODE_KEY);
    if (mode !== "light" && mode !== "dark") {
      const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      mode = prefersDark ? "dark" : "light";
    }
    applyThemeMode(mode);

    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener("change", () => {
        const m = DOM.themeToggle.checked ? "dark" : "light";
        applyThemeMode(m);
        localStorage.setItem(THEME_MODE_KEY, m);
      });
    }
  }

  function applyPreset(preset) {
    const root = document.documentElement;
    switch (preset) {
      case "noir":
        root.style.setProperty("--accent-color", "#cccccc");
        root.style.setProperty("--accent-soft", "rgba(204,204,204,0.26)");
        root.style.setProperty("--accent-strong", "rgba(204,204,204,0.9)");
        break;
      case "ivory":
        root.style.setProperty("--accent-color", "#f2d4a6");
        root.style.setProperty("--accent-soft", "rgba(242,212,166,0.28)");
        root.style.setProperty("--accent-strong", "rgba(242,212,166,0.9)");
        break;
      case "cyber":
        root.style.setProperty("--accent-color", "#5cf0ff");
        root.style.setProperty("--accent-soft", "rgba(92,240,255,0.3)");
        root.style.setProperty("--accent-strong", "rgba(92,240,255,0.9)");
        break;
      case "olive":
        root.style.setProperty("--accent-color", "#6e7b4f");
        root.style.setProperty("--accent-soft", "rgba(110,123,79,0.3)");
        root.style.setProperty("--accent-strong", "rgba(110,123,79,0.9)");
        break;
      case "emerald":
      default:
        root.style.setProperty("--accent-color", "#60c490");
        root.style.setProperty("--accent-soft", "rgba(96,196,144,0.22)");
        root.style.setProperty("--accent-strong", "rgba(96,196,144,0.8)");
        preset = "emerald";
        break;
    }
  }

  function initThemePreset() {
    let preset = localStorage.getItem(THEME_PRESET_KEY) || "emerald";
    applyPreset(preset);
    if (DOM.themePreset) {
      DOM.themePreset.value = preset;
      DOM.themePreset.addEventListener("change", () => {
        const p = DOM.themePreset.value || "emerald";
        applyPreset(p);
        localStorage.setItem(THEME_PRESET_KEY, p);
      });
    }
  }

  /* -----------------------------
     SIDEBAR
  ------------------------------ */
  function setSidebar(open) {
    if (window.innerWidth > 991) return;
    if (open) {
      DOM.sideNav.classList.add("open");
      DOM.body.classList.add("sidebar-open");
      DOM.sidebarBackdrop.classList.add("show");
    } else {
      DOM.sideNav.classList.remove("open");
      DOM.body.classList.remove("sidebar-open");
      DOM.sidebarBackdrop.classList.remove("show");
    }
  }

  if (DOM.menuToggle) {
    DOM.menuToggle.addEventListener("click", () => {
      const isOpen = DOM.sideNav.classList.contains("open");
      setSidebar(!isOpen);
    });
  }
  if (DOM.collapseBtn) {
    DOM.collapseBtn.addEventListener("click", () => setSidebar(false));
  }
  if (DOM.sidebarBackdrop) {
    DOM.sidebarBackdrop.addEventListener("click", () => setSidebar(false));
  }
  window.addEventListener("resize", () => {
    if (window.innerWidth > 991) {
      DOM.sideNav.classList.remove("open");
      DOM.body.classList.remove("sidebar-open");
      DOM.sidebarBackdrop.classList.remove("show");
    }
  });

  // nav link scroll + active
  DOM.navLinks.forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const headerHeight = document.querySelector(".main-header")?.offsetHeight || 60;
          const y = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 8;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
        DOM.navLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  });

  window.addEventListener("scroll", () => {
    const headerHeight = document.querySelector(".main-header")?.offsetHeight || 60;
    const scrollPos = window.scrollY + headerHeight + 30;
    document.querySelectorAll("main section[id]").forEach(section => {
      const top = section.offsetTop;
      const h = section.offsetHeight;
      const id = section.id;
      const navLink = document.querySelector(`.side-nav-link[href="#${id}"]`);
      if (!navLink) return;
      if (scrollPos >= top && scrollPos < top + h) {
        DOM.navLinks.forEach(l => l.classList.remove("active"));
        navLink.classList.add("active");
      }
    });
  });

  /* -----------------------------
     SEARCH
  ------------------------------ */
  if (DOM.clearSearchBtn && DOM.searchInput) {
    DOM.clearSearchBtn.addEventListener("click", () => {
      DOM.searchInput.value = "";
      searchText = "";
      applyFilters();
    });
  }
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener("input", () => {
      searchText = DOM.searchInput.value.toLowerCase().trim();
      applyFilters();
    });
  }

  /* -----------------------------
     REQUEST API BOX → WHATSAPP
  ------------------------------ */
  if (DOM.sendApiRequest && DOM.apiRequestInput) {
    DOM.sendApiRequest.addEventListener("click", () => {
      const text = DOM.apiRequestInput.value.trim();
      if (!text) {
        alert("Tulis dulu request API yang kamu mau.");
        return;
      }
      const message = encodeURIComponent(
        `Halo, saya ingin request endpoint baru:\n\n${text}`
      );
      window.open(`https://wa.me/6287751121269?text=${message}`, "_blank");
    });
  }

  /* -----------------------------
     AMBIENT CURSOR GLOW
  ------------------------------ */
  if (DOM.cursorGlow) {
    window.addEventListener("pointermove", e => {
      if (window.innerWidth < 768) {
        DOM.cursorGlow.style.opacity = "0";
        return;
      }
      DOM.cursorGlow.style.opacity = "1";
      DOM.cursorGlow.style.left = `${e.clientX}px`;
      DOM.cursorGlow.style.top = `${e.clientY}px`;
    });
    window.addEventListener("pointerleave", () => {
      DOM.cursorGlow.style.opacity = "0";
    });
  }

  /* -----------------------------
     PARALLAX BANNER
  ------------------------------ */
  if (DOM.bannerParallax) {
    DOM.bannerParallax.addEventListener("mousemove", e => {
      const rect = DOM.bannerParallax.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateX = y * -6;
      const rotateY = x * 6;
      DOM.bannerParallax.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    DOM.bannerParallax.addEventListener("mouseleave", () => {
      DOM.bannerParallax.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
  }

  /* -----------------------------
     SCROLL REVEAL
  ------------------------------ */
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

  /* -----------------------------
     SETTINGS & API RENDER
  ------------------------------ */
  function renderFiltersFromSettings() {
    if (!DOM.apiFilters || !settings || !settings.categories) return;
    DOM.apiFilters.innerHTML = "";

    const makeChip = (label, value, icon) => {
      const btn = document.createElement("button");
      btn.className = "filter-chip";
      btn.dataset.filter = value;
      if (icon) btn.innerHTML = `<i class="${icon} me-1"></i>${label}`;
      else btn.textContent = label;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = value;
        applyFilters();
      });
      return btn;
    };

    const allChip = makeChip("Semua", "all", "fas fa-layer-group");
    allChip.classList.add("active");
    DOM.apiFilters.appendChild(allChip);

    const favChip = makeChip("Favorit", "favorites", "fas fa-star");
    DOM.apiFilters.appendChild(favChip);

    settings.categories.forEach(cat => {
      const slug = slugify(cat.name);
      DOM.apiFilters.appendChild(makeChip(cat.name, slug, "fas fa-tag"));
    });
  }

  function renderApiCards() {
    if (!DOM.apiContent || !settings || !settings.categories) return;
    DOM.apiContent.innerHTML = "";

    settings.categories.forEach(cat => {
      const slug = slugify(cat.name);

      cat.items.forEach((item, idx) => {
        const id = `${slug}_${idx}_${item.name}`;
        const method = (item.method || "GET").toUpperCase();
        const path = item.path || "";
        const status = item.status || "ready";

        const card = document.createElement("article");
        card.className = "api-card reveal";
        card.dataset.id = id;
        card.dataset.category = slug;
        card.dataset.method = method;
        card.dataset.path = path;
        card.dataset.status = status;

        const header = document.createElement("div");
        header.className = "api-card-header";

        const titleBlock = document.createElement("div");
        const title = document.createElement("div");
        title.className = "api-card-title";
        title.textContent = item.name;

        const desc = document.createElement("div");
        desc.className = "api-card-desc";
        desc.textContent = item.desc || "";

        titleBlock.appendChild(title);
        titleBlock.appendChild(desc);

        const metaRow = document.createElement("div");
        metaRow.className = "card-meta-row";

        const methodBadge = document.createElement("span");
        methodBadge.className = "http-badge " + getMethodClass(method);
        methodBadge.textContent = method;

        const statusPill = document.createElement("span");
        statusPill.className = "endpoint-status-pill status-unknown";
        statusPill.dataset.path = path;
        statusPill.textContent = "Checking…";

        metaRow.appendChild(methodBadge);
        metaRow.appendChild(statusPill);
        titleBlock.appendChild(metaRow);

        const favBtn = document.createElement("button");
        favBtn.type = "button";
        favBtn.className = "fav-toggle-btn";
        favBtn.innerHTML = '<i class="far fa-star"></i>';
        if (isFavorite(id)) {
          favBtn.classList.add("favorited");
          favBtn.innerHTML = '<i class="fas fa-star"></i>';
        }
        favBtn.addEventListener("click", () => {
          if (isFavorite(id)) {
            favorites = favorites.filter(v => v !== id);
          } else {
            favorites.push(id);
          }
          saveFavorites();
          updateFavButtonState(favBtn, id);
          applyFilters();
        });

        header.appendChild(titleBlock);
        header.appendChild(favBtn);

        const footer = document.createElement("div");
        footer.className = "api-card-footer";

        const pathEl = document.createElement("div");
        pathEl.className = "api-path";
        pathEl.textContent = path;

        const actions = document.createElement("div");
        actions.className = "api-card-actions";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "api-open-btn";
        openBtn.innerHTML = '<i class="fas fa-play me-1"></i> Try';
        openBtn.addEventListener("click", () => {
          openEndpointModal({
            id,
            name: item.name,
            desc: item.desc,
            method,
            path,
            category: cat.name
          });
        });

        actions.appendChild(openBtn);
        actions.appendChild(favBtn);
        footer.appendChild(pathEl);
        footer.appendChild(actions);

        card.appendChild(header);
        card.appendChild(footer);

        DOM.apiContent.appendChild(card);
        revealObserver.observe(card);
      });
    });
  }

  function getMethodClass(method) {
    switch (method) {
      case "POST": return "http-post";
      case "PUT": return "http-put";
      case "DELETE": return "http-delete";
      default: return "http-get";
    }
  }

  function updateFavButtonState(btn, id) {
    if (isFavorite(id)) {
      btn.classList.add("favorited");
      btn.innerHTML = '<i class="fas fa-star"></i>';
    } else {
      btn.classList.remove("favorited");
      btn.innerHTML = '<i class="far fa-star"></i>';
    }
  }

  function applyFilters() {
    if (!DOM.apiContent) return;
    const cards = DOM.apiContent.querySelectorAll(".api-card");
    cards.forEach(card => {
      const id = card.dataset.id;
      const cat = card.dataset.category || "uncategorized";
      const name = card.querySelector(".api-card-title")?.textContent.toLowerCase() || "";
      const desc = card.querySelector(".api-card-desc")?.textContent.toLowerCase() || "";
      const path = card.dataset.path.toLowerCase();

      const matchSearch =
        !searchText ||
        name.includes(searchText) ||
        desc.includes(searchText) ||
        path.includes(searchText);

      let matchCategory = true;
      if (currentCategory === "favorites") {
        matchCategory = isFavorite(id);
      } else if (currentCategory !== "all") {
        matchCategory = cat === currentCategory;
      }

      card.style.display = matchSearch && matchCategory ? "" : "none";
    });
  }

  /* -----------------------------
     MODAL + API REQUEST
  ------------------------------ */
  function openEndpointModal(meta) {
    if (!modalInstance) return;
    currentRequestMeta = meta;

    DOM.modalTitle.textContent = meta.name || "Respons API";
    DOM.modalSubtitle.textContent = meta.desc || "";
    DOM.endpointText.textContent = `${meta.method} ${meta.path}`;
    DOM.modalStatusLine.textContent = "";
    DOM.responseContent.innerHTML = "";
    DOM.modalLoading.classList.remove("d-none");

    modalInstance.show();
    sendApiRequest(meta);
  }

  function sendApiRequest(meta) {
    const url = meta.path || "/";
    const method = meta.method || "GET";

    currentRequestMeta = {
      ...meta,
      url,
      method
    };

    DOM.modalStatusLine.textContent = "";
    DOM.responseContent.innerHTML = "";

    const startedAt = performance.now();
    logLine(`→ ${method} ${url}`);

    fetch(url, { method })
      .then(async res => {
        const elapsed = performance.now() - startedAt;
        const statusText = `${res.status} ${res.statusText || ""}`.trim();
        DOM.modalStatusLine.textContent = `Status: ${statusText} • ${elapsed.toFixed(0)} ms`;
        updateHistory(method, url, res.status);
        updateStatusPill(url, res.ok);

        const contentType = res.headers.get("content-type") || "";
        let bodyText = "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          const jsonStr = JSON.stringify(data, null, 2);
          DOM.responseContent.innerHTML = syntaxHighlightJson(jsonStr);
          bodyText = jsonStr;
        } else if (contentType.startsWith("image/")) {
          const blob = await res.blob();
          const imgUrl = URL.createObjectURL(blob);
          DOM.responseContent.innerHTML = "";
          const img = document.createElement("img");
          img.src = imgUrl;
          img.alt = "Image response";
          img.style.maxWidth = "100%";
          img.style.borderRadius = "10px";
          DOM.responseContent.appendChild(img);
          bodyText = "[image blob]";
        } else {
          const txt = await res.text();
          DOM.responseContent.textContent = txt || "(empty response)";
          bodyText = txt;
        }

        logLine(`← ${method} ${url} — ${statusText}`);
        prepareCurl(meta, bodyText);
      })
      .catch(err => {
        DOM.modalStatusLine.textContent = `Error: ${err.message || "Unknown error"}`;
        DOM.responseContent.textContent = "Tidak dapat menghubungi server. Periksa kembali endpoint atau server.";
        updateHistory(method, url, "ERR");
        updateStatusPill(url, false);
        logLine(`× ${method} ${url} — ERROR: ${err.message}`);
        prepareCurl(meta, "");
      })
      .finally(() => {
        DOM.modalLoading.classList.add("d-none");
      });
  }

  function updateHistory(method, url, status) {
    if (!DOM.historyList) return;
    const li = document.createElement("li");
    li.textContent = `${method} ${url} — ${status}`;
    DOM.historyList.prepend(li);
    while (DOM.historyList.children.length > 8) {
      DOM.historyList.removeChild(DOM.historyList.lastChild);
    }
  }

  function updateStatusPill(path, ok) {
    const pill = document.querySelector(`.endpoint-status-pill[data-path="${CSS.escape(path)}"]`);
    if (!pill) return;
    pill.classList.remove("status-unknown", "status-ok", "status-error");
    if (ok) {
      pill.classList.add("status-ok");
      pill.textContent = "Online";
    } else {
      pill.classList.add("status-error");
      pill.textContent = "Error";
    }
  }

  function prepareCurl(meta, bodyText) {
    if (!DOM.copyCurlBtn) return;
    const url = meta.path;
    const method = (meta.method || "GET").toUpperCase();
    let cmd = `curl -X ${method} "${url}"`;
    if (bodyText && bodyText.length < 2000 && bodyText.trim().startsWith("{")) {
      cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyText.replace(/\n/g, " ")}'`;
    }
    DOM.copyCurlBtn.dataset.curl = cmd;
  }

  if (DOM.copyCurlBtn) {
    DOM.copyCurlBtn.addEventListener("click", () => {
      const cmd = DOM.copyCurlBtn.dataset.curl || "";
      if (!cmd) return;
      navigator.clipboard?.writeText(cmd).catch(() => {});
    });
  }

  if (DOM.copyEndpointBtn) {
    DOM.copyEndpointBtn.addEventListener("click", () => {
      const txt = DOM.endpointText.textContent || "";
      if (!txt) return;
      navigator.clipboard?.writeText(txt).catch(() => {});
    });
  }

  /* -----------------------------
     LIVE ENDPOINT STATUS PING
  ------------------------------ */
  function pingAllEndpoints() {
    const cards = DOM.apiContent?.querySelectorAll(".api-card") || [];
    cards.forEach(card => {
      const path = card.dataset.path;
      if (!path) return;
      fetch(path, { method: "GET" })
        .then(res => updateStatusPill(path, res.ok))
        .catch(() => updateStatusPill(path, false));
    });
  }

  /* -----------------------------
     SETTINGS LOADING
  ------------------------------ */
  async function loadSettings() {
    try {
      const res = await fetch("/src/settings.json");
      if (!res.ok) throw new Error(`Gagal memuat settings.json (${res.status})`);
      settings = await res.json();
      renderFiltersFromSettings();
      renderApiCards();
      applyFilters();
      pingAllEndpoints();
      setInterval(pingAllEndpoints, 60_000);
      logLine("settings.json loaded and endpoints rendered.");
    } catch (err) {
      logLine(`Error loading settings.json: ${err.message}`);
      if (DOM.apiContent) {
        DOM.apiContent.textContent = "Gagal memuat konfigurasi API. Pastikan /src/settings.json dapat diakses.";
      }
    }
  }

// ====== DARK MODE + FOLLOW SYSTEM ======
(function () {
  const MODE_KEY = 'ada-ui-color-mode'; // 'light' | 'dark'
  const toggle = document.getElementById('themeToggle');

  function applyMode(mode) {
    const isDark = mode === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    if (toggle) toggle.checked = isDark;
  }

  function detectSystemMode() {
    try {
      return window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function initMode() {
    let stored = null;
    try {
      stored = localStorage.getItem(MODE_KEY);
    } catch (e) {}

    // Kalau belum pernah pilih manual, pakai sistem
    const initialMode = stored === 'dark' || stored === 'light'
      ? stored
      : detectSystemMode();

    applyMode(initialMode);

    // Jika sistem berubah DAN user belum pernah pilih manual, boleh ikut
    if (!stored && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      try {
        mq.addEventListener('change', (e) => {
          const newMode = e.matches ? 'dark' : 'light';
          applyMode(newMode);
        });
      } catch (_) {
        // Safari lama: fallback
        mq.addListener((e) => {
          const newMode = e.matches ? 'dark' : 'light';
          applyMode(newMode);
        });
      }
    }

    // Bind ke switch
    if (toggle) {
      toggle.addEventListener('change', () => {
        const mode = toggle.checked ? 'dark' : 'light';
        applyMode(mode);
        try {
          localStorage.setItem(MODE_KEY, mode);
        } catch (e) {}
      });
    }
  }

  // Jalankan setelah DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMode);
  } else {
    initMode();
  }
})();
  initThemeMode();
  initThemePreset();
  loadSettings();
});
// ====== MODE GELAP / TERANG (ikut sistem + switch) ======
(function () {
  const MODE_KEY = 'ada-ui-color-mode';
  const toggle = document.getElementById('themeToggle');

  function applyMode(mode) {
    const isDark = mode === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    if (toggle) toggle.checked = isDark;
  }

  function detectSystemMode() {
    try {
      return window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  }

  function initMode() {
    let stored = null;
    try {
      stored = localStorage.getItem(MODE_KEY);
    } catch {}

    const initial =
      stored === 'dark' || stored === 'light'
        ? stored
        : detectSystemMode();

    applyMode(initial);

    // follow system only if user belum override
    if (!stored && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = e => {
        const newMode = e.matches ? 'dark' : 'light';
        applyMode(newMode);
      };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else mq.addListener(handler);
    }

    if (toggle) {
      toggle.addEventListener('change', () => {
        const mode = toggle.checked ? 'dark' : 'light';
        applyMode(mode);
        try {
          localStorage.setItem(MODE_KEY, mode);
        } catch {}
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMode);
  } else {
    initMode();
  }
})();

// ====== TEMA (Noir / Emerald / Cyber / Amber) ======
(function () {
  const THEME_KEY = 'ada-ui-theme';
  const select = document.getElementById('themePreset');
  if (!select) return;

  const THEMES = ['noir', 'emerald-gold', 'cyber-glow', 'royal-amber'];

  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'emerald-gold';
    document.body.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }

  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {}

    const initial =
      stored && THEMES.includes(stored) ? stored : 'emerald-gold';
    applyTheme(initial);

    if ([...select.options].some(o => o.value === initial)) {
      select.value = initial;
    }
  }

  initTheme();

  select.addEventListener('change', () => {
    applyTheme(select.value);
  });
})();