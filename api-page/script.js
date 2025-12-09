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

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(THEME_MODE_KEY)) {
                applyThemeMode(e.matches ? "dark" : "light");
            }
        });
    }
  }

  function applyPreset(preset) {
    const root = document.documentElement;
    DOM.body.setAttribute('data-theme', preset);
    
    // Fallback variables for JS logic if needed, but CSS handles most
    switch (preset) {
      case "noir":
        root.style.setProperty("--accent-color", "#cccccc");
        break;
      case "royal-amber":
        root.style.setProperty("--accent-color", "#f3c47a");
        break;
      case "cyber-glow":
        root.style.setProperty("--accent-color", "#78ffd2");
        break;
      case "emerald-gold":
      default:
        root.style.setProperty("--accent-color", "#60c490");
        preset = "emerald-gold";
        break;
    }
  }

  function initThemePreset() {
    let preset = localStorage.getItem(THEME_PRESET_KEY) || "emerald-gold";
    applyPreset(preset);
    if (DOM.themePreset) {
      DOM.themePreset.value = preset;
      DOM.themePreset.addEventListener("change", () => {
        const p = DOM.themePreset.value || "emerald-gold";
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
    if (!DOM.sideNav) return;
    
    if (open) {
      DOM.sideNav.classList.add("open");
      DOM.body.classList.add("sidebar-open");
      if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add("show");
    } else {
      DOM.sideNav.classList.remove("open");
      DOM.body.classList.remove("sidebar-open");
      if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
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
    if (window.innerWidth > 991 && DOM.sideNav) {
      DOM.sideNav.classList.remove("open");
      DOM.body.classList.remove("sidebar-open");
      if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
    }
  });

  DOM.navLinks.forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const headerHeight = document.querySelector(".main-header")?.offsetHeight || 60;
          const y = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 10;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
        DOM.navLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        setSidebar(false);
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
     WHATSAPP REQUEST
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
     CURSOR & PARALLAX
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

  if (DOM.bannerParallax) {
    DOM.bannerParallax.addEventListener("mousemove", e => {
      const rect = DOM.bannerParallax.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      DOM.bannerParallax.style.transform = `rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
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
    { threshold: 0.1 }
  );
  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

  /* -----------------------------
     RENDER & FILTERS
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
    DOM.apiFilters.appendChild(makeChip("Favorit", "favorites", "fas fa-star"));

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
        favBtn.className = "fav-toggle-btn";
        favBtn.innerHTML = isFavorite(id) ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
        if (isFavorite(id)) favBtn.classList.add("favorited");
        
        favBtn.addEventListener("click", () => {
          if (isFavorite(id)) {
            favorites = favorites.filter(v => v !== id);
            favBtn.classList.remove("favorited");
            favBtn.innerHTML = '<i class="far fa-star"></i>';
          } else {
            favorites.push(id);
            favBtn.classList.add("favorited");
            favBtn.innerHTML = '<i class="fas fa-star"></i>';
          }
          saveFavorites();
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
        openBtn.className = "api-open-btn";
        openBtn.innerHTML = '<i class="fas fa-play me-1"></i> Try';
        openBtn.addEventListener("click", () => {
          openEndpointModal({ id, name: item.name, desc: item.desc, method, path, category: cat.name });
        });

        actions.appendChild(openBtn);
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

  function applyFilters() {
    if (!DOM.apiContent) return;
    const cards = DOM.apiContent.querySelectorAll(".api-card");
    cards.forEach(card => {
      const id = card.dataset.id;
      const cat = card.dataset.category || "uncategorized";
      const name = card.querySelector(".api-card-title")?.textContent.toLowerCase() || "";
      const path = card.dataset.path.toLowerCase();

      const matchSearch = !searchText || name.includes(searchText) || path.includes(searchText);
      let matchCategory = true;
      if (currentCategory === "favorites") matchCategory = isFavorite(id);
      else if (currentCategory !== "all") matchCategory = cat === currentCategory;

      card.style.display = matchSearch && matchCategory ? "" : "none";
    });
  }

  /* -----------------------------
     MODAL & FETCH
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
    DOM.modalStatusLine.textContent = "Sending request...";
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
          bodyText = JSON.stringify(data, null, 2);
          DOM.responseContent.innerHTML = syntaxHighlightJson(bodyText);
        } else if (contentType.startsWith("image/")) {
          const blob = await res.blob();
          const imgUrl = URL.createObjectURL(blob);
          DOM.responseContent.innerHTML = `<img src="${imgUrl}" style="max-width:100%; border-radius:8px;">`;
          bodyText = "[image blob]";
        } else {
          bodyText = await res.text();
          DOM.responseContent.textContent = bodyText || "(empty response)";
        }
        logLine(`← ${method} ${url} — ${statusText}`);
        prepareCurl(meta, bodyText);
      })
      .catch(err => {
        DOM.modalStatusLine.textContent = `Error: ${err.message}`;
        DOM.responseContent.textContent = "Gagal menghubungi server. Endpoint mungkin mati atau CORS block.";
        updateHistory(method, url, "ERR");
        updateStatusPill(url, false);
        logLine(`× ${method} ${url} — ERROR: ${err.message}`);
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
    if (DOM.historyList.children.length > 8) DOM.historyList.removeChild(DOM.historyList.lastChild);
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
      if (cmd) navigator.clipboard?.writeText(cmd);
    });
  }
  if (DOM.copyEndpointBtn) {
    DOM.copyEndpointBtn.addEventListener("click", () => {
      navigator.clipboard?.writeText(DOM.endpointText.textContent || "");
    });
  }

  /* -----------------------------
     STATUS PING
  ------------------------------ */
  function pingAllEndpoints() {
    const cards = DOM.apiContent?.querySelectorAll(".api-card") || [];
    cards.forEach(card => {
      const path = card.dataset.path;
      if (!path) return;
      fetch(path, { method: "HEAD" }) // Use HEAD for lighter check
        .then(res => updateStatusPill(path, res.ok))
        .catch(() => updateStatusPill(path, false));
    });
  }

  /* -----------------------------
     INIT
  ------------------------------ */
  async function loadSettings() {
    try {
      // Added timestamp to prevent caching during dev
      const res = await fetch(`/src/settings.json?v=${Date.now()}`);
      if (!res.ok) throw new Error("Settings not found");
      settings = await res.json();
      renderFiltersFromSettings();
      renderApiCards();
      applyFilters();
      pingAllEndpoints();
      setInterval(pingAllEndpoints, 60000);
      logLine("System ready.");
    } catch (err) {
      logLine("Failed loading settings.json");
      if (DOM.apiContent) {
        DOM.apiContent.innerHTML = `<div style="text-align:center; padding:2rem; color:#888;">
          <i class="fas fa-exclamation-triangle fa-2x"></i><br><br>
          Gagal memuat /src/settings.json.<br>Pastikan file tersedia dan format JSON benar.
        </div>`;
      }
    }
  }

  initThemeMode();
  initThemePreset();
  loadSettings();
});