// Ada API Console – script utama (nyambung ke index.html + src/settings.json)

document.addEventListener("DOMContentLoaded", () => {
  // ================================
  // DOM CACHE
  // ================================
  const DOM = {
    body: document.body,

    sideNav: document.querySelector(".side-nav"),
    sideNavLinks: document.querySelectorAll(".side-nav-link"),
    menuToggle: document.getElementById("menuToggle"),
    navCollapseBtn: document.getElementById("collapseBtn"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),

    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),

    themeToggle: document.getElementById("themeToggle"),
    themePreset: document.getElementById("themePreset"),

    apiFilters: document.getElementById("apiFilters"),
    apiContent: document.getElementById("apiContent"),
    apiRequestInput: document.getElementById("apiRequestInput"),
    sendApiRequest: document.getElementById("sendApiRequest"),
    requestHistoryList: document.getElementById("requestHistoryList"),
    logsConsole: document.getElementById("liveLogs"),

    versionBadge: document.getElementById("versionBadge"),

    bannerParallax: document.getElementById("bannerParallax"),
    cursorGlow: document.getElementById("cursorGlow"),

    modalEl: document.getElementById("apiResponseModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    endpointText: document.getElementById("endpointText"),
    modalStatusLine: document.getElementById("modalStatusLine"),
    modalLoading: document.getElementById("modalLoading"),
    apiResponseContent: document.getElementById("apiResponseContent"),
    copyEndpointBtn: document.getElementById("copyEndpointBtn"),
    copyCurlBtn: document.getElementById("copyCurlBtn"),
  };

  const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl) : null;

  // ================================
  // STATE
  // ================================
  let settings = null;
  let currentApiItem = null;
  let favorites = loadJSON("ada-api-fav", []); // array path
  let historyItems = loadJSON("ada-api-history", []); // {name,path,ts}
  let themeMode = null;
  let themePresetInternal = null;

  // fallback kalau settings.json gagal
  const fallbackCategories = [
    {
      name: "Contoh",
      items: [
        {
          name: "Status API (contoh)",
          desc: "Contoh endpoint kalau settings.json belum terbaca.",
          method: "GET",
          path: "https://httpbin.org/status/200",
          status: "online",
        },
      ],
    },
  ];

  // ================================
  // UTIL
  // ================================
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  function appendLog(line) {
    if (!DOM.logsConsole) return;
    const ts = new Date().toISOString().slice(11, 19);
    DOM.logsConsole.textContent += `[${ts}] ${line}\n`;
    DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
  }

  function beautifyJSON(text) {
    try {
      const obj = JSON.parse(text);
      return JSON.stringify(obj, null, 2);
    } catch {
      return text;
    }
  }

  // ================================
  // THEME MODE (LIGHT / DARK)
  // ================================
  function detectSystemMode() {
    try {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }
      return "light";
    } catch {
      return "light";
    }
  }

  function applyMode(mode) {
    const isDark = mode === "dark";
    DOM.body.classList.toggle("dark-mode", isDark);
    if (DOM.themeToggle) DOM.themeToggle.checked = isDark;
    themeMode = mode;
    saveJSON("ada-ui-mode", mode);
  }

  function initMode() {
    const stored = loadJSON("ada-ui-mode", null);
    if (stored === "dark" || stored === "light") {
      applyMode(stored);
    } else {
      applyMode(detectSystemMode());
      if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e) => applyMode(e.matches ? "dark" : "light");
        if (mq.addEventListener) mq.addEventListener("change", handler);
        else mq.addListener(handler);
      }
    }

    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener("change", () => {
        applyMode(DOM.themeToggle.checked ? "dark" : "light");
      });
    }
  }

  // ================================
  // THEME PRESET (data-theme)
  // ================================
  const presetMap = {
    emerald: "emerald-gold",
    noir: "noir",
    ivory: "royal-amber",
    cyber: "cyber-glow",
    olive: "emerald-gold",
  };

  const reversePresetMap = {
    "emerald-gold": "emerald",
    noir: "noir",
    "royal-amber": "ivory",
    "cyber-glow": "cyber",
  };

  function applyPreset(internalKey) {
    const allowed = ["emerald-gold", "noir", "royal-amber", "cyber-glow"];
    if (!allowed.includes(internalKey)) internalKey = "emerald-gold";
    DOM.body.setAttribute("data-theme", internalKey);
    themePresetInternal = internalKey;
    saveJSON("ada-ui-theme", internalKey);

    if (DOM.themePreset) {
      const selectValue = reversePresetMap[internalKey] || "emerald";
      DOM.themePreset.value = selectValue;
    }
  }

  function initPreset() {
    let stored = loadJSON("ada-ui-theme", null);
    if (!stored) stored = "emerald-gold";
    applyPreset(stored);

    if (DOM.themePreset) {
      DOM.themePreset.addEventListener("change", () => {
        const userValue = DOM.themePreset.value;
        const internalKey = presetMap[userValue] || "emerald-gold";
        applyPreset(internalKey);
      });
    }
  }

  // ================================
  // SIDEBAR
  // ================================
  function openSidebarMobile() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.add("open");
    DOM.body.classList.add("sidebar-open");
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add("show");
  }

  function closeSidebarMobile() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.remove("open");
    DOM.body.classList.remove("sidebar-open");
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove("show");
  }

  function toggleSidebarCollapsedDesktop() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.toggle("collapsed");
  }

  function initSidebar() {
    if (DOM.menuToggle) {
      DOM.menuToggle.addEventListener("click", () => {
        if (window.innerWidth < 992) {
          if (DOM.sideNav.classList.contains("open")) {
            closeSidebarMobile();
          } else {
            openSidebarMobile();
          }
        } else {
          toggleSidebarCollapsedDesktop();
        }
      });
    }

    if (DOM.navCollapseBtn) {
      DOM.navCollapseBtn.addEventListener("click", () => {
        toggleSidebarCollapsedDesktop();
      });
    }

    if (DOM.sidebarBackdrop) {
      DOM.sidebarBackdrop.addEventListener("click", () => {
        closeSidebarMobile();
      });
    }

    DOM.sideNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 992) closeSidebarMobile();
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992 && DOM.sidebarBackdrop) {
        DOM.sidebarBackdrop.classList.remove("show");
        DOM.body.classList.remove("sidebar-open");
      }
    });

    window.addEventListener("scroll", () => {
      const headerOffset = 72;
      const scrollY = window.scrollY + headerOffset;

      document.querySelectorAll("main section[id]").forEach((section) => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute("id");
        const link = document.querySelector(`.side-nav-link[href="#${id}"]`);
        if (!link) return;
        if (scrollY >= top && scrollY < bottom) {
          DOM.sideNavLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    });
  }

  // ================================
  // SEARCH
  // ================================
  function filterApis(query) {
    query = query.trim().toLowerCase();
    const itemEls = DOM.apiContent
      ? DOM.apiContent.querySelectorAll(".api-item")
      : [];

    itemEls.forEach((el) => {
      const name =
        el.querySelector(".api-card-title")?.textContent.toLowerCase() || "";
      const desc =
        el.querySelector(".api-card-desc")?.textContent.toLowerCase() || "";
      const path =
        el.querySelector(".api-path")?.textContent.toLowerCase() || "";

      const match =
        !query ||
        name.includes(query) ||
        desc.includes(query) ||
        path.includes(query);

      el.style.display = match ? "" : "none";
    });
  }

  function initSearch() {
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener("input", () => {
        filterApis(DOM.searchInput.value);
      });
    }
    if (DOM.clearSearch) {
      DOM.clearSearch.addEventListener("click", () => {
        DOM.searchInput.value = "";
        filterApis("");
      });
    }
  }

  // ================================
  // FAVORIT & HISTORY
  // ================================
  function isFav(path) {
    return favorites.includes(path);
  }

  function toggleFav(path, btn) {
    const idx = favorites.indexOf(path);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      btn.classList.remove("favorited");
    } else {
      favorites.push(path);
      btn.classList.add("favorited");
    }
    saveJSON("ada-api-fav", favorites);
  }

  function addHistory(item) {
    historyItems.unshift({
      name: item.name,
      path: item.path,
      ts: new Date().toISOString(),
    });
    historyItems = historyItems.slice(0, 20);
    saveJSON("ada-api-history", historyItems);
    renderHistory();
  }

  function renderHistory() {
    if (!DOM.requestHistoryList) return;
    DOM.requestHistoryList.innerHTML = "";
    historyItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "history-name";
      nameSpan.textContent = item.name;

      const pathSpan = document.createElement("span");
      pathSpan.className = "history-path";
      pathSpan.textContent = item.path;

      li.appendChild(nameSpan);
      li.appendChild(pathSpan);
      DOM.requestHistoryList.appendChild(li);
    });
  }

  // ================================
  // RENDER API CARD & FILTER
  // ================================
  function buildApiCard(categoryName, item) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4 api-item";
    col.dataset.category = categoryName;

    const card = document.createElement("article");
    card.className = "api-card";

    const header = document.createElement("div");
    header.className = "api-card-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h4");
    title.className = "api-card-title";
    title.textContent = item.name;

    const desc = document.createElement("p");
    desc.className = "api-card-desc";
    desc.textContent = item.desc || "";

    titleWrap.appendChild(title);
    titleWrap.appendChild(desc);

    const metaRight = document.createElement("div");
    metaRight.className = "card-meta-row";

    const methodBadge = document.createElement("span");
    methodBadge.className = "http-badge";
    const method = (item.method || "GET").toUpperCase();
    methodBadge.textContent = method;
    if (method === "POST") methodBadge.classList.add("http-post");
    else if (method === "PUT") methodBadge.classList.add("http-put");
    else if (method === "DELETE") methodBadge.classList.add("http-delete");
    else methodBadge.classList.add("http-get");

    const statusBadge = document.createElement("span");
    statusBadge.className = "endpoint-status-pill";
    const status = (item.status || "unknown").toLowerCase();
    if (status === "ready" || status === "online") {
      statusBadge.classList.add("status-ok");
      statusBadge.textContent = "Online";
    } else if (status === "error" || status === "down") {
      statusBadge.classList.add("status-error");
      statusBadge.textContent = "Error";
    } else {
      statusBadge.classList.add("status-unknown");
      statusBadge.textContent = "Unknown";
    }

    metaRight.appendChild(methodBadge);
    metaRight.appendChild(statusBadge);

    header.appendChild(titleWrap);
    header.appendChild(metaRight);

    const footer = document.createElement("div");
    footer.className = "api-card-footer";

    const pathEl = document.createElement("div");
    pathEl.className = "api-path";
    pathEl.textContent = item.path;

    const actions = document.createElement("div");
    actions.className = "api-card-actions";

    const tryBtn = document.createElement("button");
    tryBtn.type = "button";
    tryBtn.className = "api-open-btn";
    tryBtn.innerHTML = '<i class="fas fa-play me-1"></i>Try';

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-toggle-btn";
    favBtn.dataset.path = item.path;
    favBtn.innerHTML = '<i class="fas fa-star"></i>';

    if (isFav(item.path)) {
      favBtn.classList.add("favorited");
    }

    actions.appendChild(tryBtn);
    actions.appendChild(favBtn);

    footer.appendChild(pathEl);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(footer);
    col.appendChild(card);

    favBtn.addEventListener("click", () => toggleFav(item.path, favBtn));
    tryBtn.addEventListener("click", () => openApiModal(item));

    return col;
  }

  function renderFilters(categories) {
    if (!DOM.apiFilters) return;
    DOM.apiFilters.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "filter-chip active";
    allBtn.textContent = "Semua";
    allBtn.dataset.filter = "all";
    DOM.apiFilters.appendChild(allBtn);

    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-chip";
      btn.textContent = cat.name;
      btn.dataset.filter = cat.name;
      DOM.apiFilters.appendChild(btn);
    });

    DOM.apiFilters.onclick = (e) => {
      const btn = e.target.closest(".filter-chip");
      if (!btn) return;
      const filter = btn.dataset.filter;
      DOM.apiFilters
        .querySelectorAll(".filter-chip")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const items = DOM.apiContent
        ? DOM.apiContent.querySelectorAll(".api-item")
        : [];
      items.forEach((itemEl) => {
        const catName = itemEl.dataset.category;
        if (filter === "all" || filter === catName) {
          itemEl.style.display = "";
        } else {
          itemEl.style.display = "none";
        }
      });
    };
  }

  function renderApiCategories() {
    if (!DOM.apiContent) return;
    DOM.apiContent.innerHTML = "";

    const categories =
      settings &&
      Array.isArray(settings.categories) &&
      settings.categories.length
        ? settings.categories
        : fallbackCategories;

    renderFilters(categories);

    const row = document.createElement("div");
    row.className = "row";
    categories.forEach((cat) => {
      const catName = cat.name || "Tanpa Kategori";
      const items = Array.isArray(cat.items) ? cat.items : [];
      items.forEach((item) => {
        const col = buildApiCard(catName, item);
        row.appendChild(col);
      });
    });
    DOM.apiContent.appendChild(row);
  }

  // ================================
  // MODAL & REQUEST
  // ================================
  function openApiModal(item) {
    currentApiItem = item;
    if (!DOM.modalEl) return;

    const method = (item.method || "GET").toUpperCase();
    const url = item.path || "";

    if (DOM.modalTitle) DOM.modalTitle.textContent = item.name || "Endpoint";
    if (DOM.modalSubtitle)
      DOM.modalSubtitle.textContent = item.desc || url || "";
    if (DOM.endpointText) DOM.endpointText.textContent = url;
    if (DOM.modalStatusLine) DOM.modalStatusLine.textContent = "";
    if (DOM.apiResponseContent) DOM.apiResponseContent.textContent = "";
    if (DOM.modalLoading) DOM.modalLoading.classList.add("d-none");

    addHistory({ name: item.name || "Endpoint", path: url });
    appendLog(`Open modal for ${item.name} -> ${url}`);

    if (modalInstance) modalInstance.show();

    // langsung auto-request
    sendApiRequest();
  }

  async function sendApiRequest() {
    if (!currentApiItem) return;
    const method = (currentApiItem.method || "GET").toUpperCase();
    const url = currentApiItem.path || "";

    if (!url) return;

    if (DOM.modalStatusLine) {
      DOM.modalStatusLine.textContent = "Mengirim permintaan…";
    }
    if (DOM.modalLoading) DOM.modalLoading.classList.remove("d-none");
    if (DOM.apiResponseContent) DOM.apiResponseContent.textContent = "";

    appendLog(`Request ${method} ${url}`);

    try {
      const res = await fetch(url, { method });
      const text = await res.text();
      const pretty = beautifyJSON(text);

      if (DOM.apiResponseContent) {
        DOM.apiResponseContent.textContent = pretty;
      }
      if (DOM.modalStatusLine) {
        DOM.modalStatusLine.textContent = `Status: ${res.status} ${
          res.ok ? "(OK)" : "(Error)"
        }`;
      }
      appendLog(`Response ${res.status} untuk ${url}`);
    } catch (err) {
      if (DOM.apiResponseContent) {
        DOM.apiResponseContent.textContent = String(err);
      }
      if (DOM.modalStatusLine) {
        DOM.modalStatusLine.textContent = "Gagal melakukan request.";
      }
      appendLog(`Error: ${err.message}`);
    } finally {
      if (DOM.modalLoading) DOM.modalLoading.classList.add("d-none");
    }
  }

  function initModalEvents() {
    if (DOM.copyEndpointBtn && DOM.endpointText) {
      DOM.copyEndpointBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(DOM.endpointText.textContent);
        } catch {
          // ignore
        }
      });
    }

    if (DOM.copyCurlBtn) {
      DOM.copyCurlBtn.addEventListener("click", async () => {
        if (!currentApiItem) return;
        const method = (currentApiItem.method || "GET").toUpperCase();
        const url = currentApiItem.path || "";
        const curl = `curl -X ${method} "${url}"`;
        try {
          await navigator.clipboard.writeText(curl);
        } catch {
          // ignore
        }
      });
    }
  }

  // ================================
  // REQUEST BOX → WHATSAPP
  // ================================
  function initRequestBox() {
    if (!DOM.apiRequestInput || !DOM.sendApiRequest) return;

    DOM.sendApiRequest.addEventListener("click", () => {
      const text = DOM.apiRequestInput.value.trim();
      if (!text) return;
      const waNumber = "6287751121269";
      const url =
        "https://wa.me/" +
        waNumber +
        "?text=" +
        encodeURIComponent("[Request Endpoint Ada API]\n\n" + text);
      window.open(url, "_blank");
      appendLog("Request endpoint dikirim ke WhatsApp.");
      DOM.apiRequestInput.value = "";
    });
  }

  // ================================
  // FX: CURSOR GLOW & BANNER
  // ================================
  function initCursorGlow() {
    if (!DOM.cursorGlow) return;
    window.addEventListener("pointermove", (e) => {
      const x = e.clientX;
      const y = e.clientY;
      DOM.cursorGlow.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  function initBannerParallax() {
    if (!DOM.bannerParallax) return;
    DOM.bannerParallax.addEventListener("mousemove", (e) => {
      const rect = DOM.bannerParallax.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const img = DOM.bannerParallax.querySelector(".banner-oldmoney");
      if (!img) return;
      img.style.transform = `translate(${x * 12}px, ${y * 8}px) scale(1.02)`;
    });
    DOM.bannerParallax.addEventListener("mouseleave", () => {
      const img = DOM.bannerParallax.querySelector(".banner-oldmoney");
      if (!img) return;
      img.style.transform = "translate(0,0) scale(1)";
    });
  }

  function initScrollReveal() {
    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.08 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  // ================================
  // SETTINGS.JSON → HERO & API
  // ================================
  function applySettingsToHero() {
    if (!settings) return;
    if (DOM.versionBadge && settings.version) {
      DOM.versionBadge.textContent = settings.version;
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/src/settings.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      settings = await res.json();
      appendLog("settings.json loaded.");
      applySettingsToHero();
      renderApiCategories();
    } catch (err) {
      appendLog(`Gagal memuat settings.json: ${err.message}`);
      settings = null;
      renderApiCategories(); // fallback
    }
  }

  // ================================
  // INIT
  // ================================
  async function init() {
    // hapus placeholder log di HTML kalau ada
    if (DOM.logsConsole) DOM.logsConsole.textContent = "";

    initMode();
    initPreset();
    initSidebar();
    initSearch();
    initModalEvents();
    initRequestBox();
    initCursorGlow();
    initBannerParallax();
    initScrollReveal();
    renderHistory();

    appendLog("Menyiapkan konsol Ada API…");
    await loadSettings();
    appendLog("Ada API Console siap.");
  }

  init();
});