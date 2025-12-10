// ADA API UI – script utama (versi diringkas + fix sidebar Beranda)
// Semua logika: tema, sidebar, search, koleksi endpoint, modal respons, history, WA request.

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // DOM CACHE
  // ==========================
  const DOM = {
    body: document.body,

    // layout / nav
    sideNav: document.querySelector(".side-nav"),
    sideNavLinks: document.querySelectorAll(".side-nav-link"),
    menuToggle: document.querySelector(".menu-toggle"),
    navCollapseBtn: document.querySelector(".nav-collapse-btn"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),

    mainWrapper: document.querySelector(".main-wrapper"),

    // header
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),

    // tema
    themeToggle: document.getElementById("themeToggle"),
    themePreset: document.getElementById("themePreset"),

    // hero
    versionBadge: document.getElementById("versionBadge"),
    bannerParallax: document.getElementById("bannerParallax"),
    cursorGlow: document.getElementById("cursorGlow"),

    // koleksi endpoint
    apiFilters: document.getElementById("apiFilters"),
    apiContent: document.getElementById("apiContent"),

    // request box / history / logs
    apiRequestInput: document.getElementById("apiRequestInput"),
    sendApiRequest: document.getElementById("sendApiRequest"),
    requestHistoryList: document.getElementById("requestHistoryList"),
    logsConsole: document.getElementById("liveLogs"),

    // modal respons
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

  // ==========================
  // STATE
  // ==========================
  let settings = null;
  let favorites = loadJSON("ada-api-favorites", []);   // array of endpoint path
  let historyItems = loadJSON("ada-api-history", []);  // {name,path,ts}
  let themeMode = null;                                // 'light' | 'dark'
  let themePreset = null;                              // 'emerald-gold' | 'noir' | ...

  // fallback kalau settings.json gagal dimuat
  const fallbackCategories = [
    {
      name: "General",
      items: [
        {
          name: "Status API",
          desc: "Contoh endpoint status Ada API.",
          method: "GET",
          path: "https://example.com/status",
          status: "online",
        },
      ],
    },
  ];

  // ==========================
  // UTIL
  // ==========================
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
      // abaikan
    }
  }

  function appendLog(line) {
    if (!DOM.logsConsole) return;
    const ts = new Date().toISOString().slice(11, 19);
    DOM.logsConsole.textContent += `[${ts}] ${line}\n`;
    DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
  }

  function addHistory(entry) {
    historyItems.unshift({
      name: entry.name,
      path: entry.path,
      ts: Date.now(),
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
      const date = new Date(item.ts);
      li.textContent = `${date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })} — ${item.name} (${item.path})`;
      DOM.requestHistoryList.appendChild(li);
    });
  }

  function beautifyJSON(json) {
    try {
      if (typeof json === "string") json = JSON.parse(json);
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json);
    }
  }

  // ==========================
  // MODE TERANG / GELAP
  // ==========================
  function detectSystemMode() {
    try {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
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
    }

    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener("change", () => {
        applyMode(DOM.themeToggle.checked ? "dark" : "light");
      });
    }
  }

  // ==========================
  // THEME PRESET
  // ==========================
  function applyPreset(preset) {
    const allowed = ["emerald-gold", "noir", "cyber-glow", "royal-amber"];
    if (!allowed.includes(preset)) preset = "emerald-gold";
    DOM.body.setAttribute("data-theme", preset);
    themePreset = preset;
    saveJSON("ada-ui-theme", preset);
    if (DOM.themePreset) DOM.themePreset.value = preset;
  }

  function initPreset() {
    let stored = loadJSON("ada-ui-theme", null);
    if (!stored) stored = "emerald-gold";
    applyPreset(stored);

    if (DOM.themePreset) {
      DOM.themePreset.addEventListener("change", () => {
        const v = DOM.themePreset.value;
        applyPreset(v);
      });
    }
  }

  // ==========================
  // SIDEBAR
  // ==========================
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
    // tombol burger
    if (DOM.menuToggle) {
      DOM.menuToggle.addEventListener("click", (e) => {
        e.preventDefault();
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

    // tombol panah collapse (desktop)
    if (DOM.navCollapseBtn) {
      DOM.navCollapseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleSidebarCollapsedDesktop();
      });
    }

    // backdrop mobile
    if (DOM.sidebarBackdrop) {
      DOM.sidebarBackdrop.addEventListener("click", () => {
        closeSidebarMobile();
      });
    }

    // klik link di sidebar
    DOM.sideNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const href = link.getAttribute("href") || "";

        if (window.innerWidth < 992) {
          // mobile → tutup overlay
          closeSidebarMobile();
        } else {
          // DESKTOP:
          // FIX #1: kalau klik "Beranda" (section id="home"), paksa sidebar balik normal
          if (href === "#home" && DOM.sideNav) {
            DOM.sideNav.classList.remove("collapsed");
          }
        }
      });
    });

    // sync ketika resize
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992 && DOM.sidebarBackdrop) {
        DOM.sidebarBackdrop.classList.remove("show");
        DOM.body.classList.remove("sidebar-open");
      }
    });

    // highlight menu aktif saat scroll
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

  // ==========================
  // SEARCH
  // ==========================
  function filterApis(query) {
    query = query.trim().toLowerCase();
    const cards = DOM.apiContent
      ? DOM.apiContent.querySelectorAll(".api-card")
      : [];

    if (!query) {
      cards.forEach((card) => (card.style.display = ""));
      return;
    }

    cards.forEach((card) => {
      const text = (card.textContent || "").toLowerCase();
      card.style.display = text.includes(query) ? "" : "none";
    });
  }

  function initSearch() {
    if (!DOM.searchInput) return;
    DOM.searchInput.addEventListener("input", () => {
      filterApis(DOM.searchInput.value);
    });

    if (DOM.clearSearch) {
      DOM.clearSearch.addEventListener("click", () => {
        DOM.searchInput.value = "";
        filterApis("");
      });
    }
  }

  // ==========================
  // FAVORITES
  // ==========================
  function toggleFav(key, button) {
    const idx = favorites.indexOf(key);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      button.classList.remove("favorited");
    } else {
      favorites.push(key);
      button.classList.add("favorited");
    }
    saveJSON("ada-api-favorites", favorites);
  }

  // ==========================
  // BUILD KARTU API
  // ==========================
  function buildApiCard(item) {
    const col = document.createElement("div");
    col.className = "api-item";

    const card = document.createElement("article");
    card.className = "api-card";

    // header
    const header = document.createElement("div");
    header.className = "api-card-header";

    const title = document.createElement("h3");
    title.className = "api-card-title";
    title.textContent = item.name || "Endpoint";

    const metaRow = document.createElement("div");
    metaRow.className = "card-meta-row";

    const methodBadge = document.createElement("span");
    methodBadge.className = "http-badge";
    const method = (item.method || "GET").toUpperCase();
    methodBadge.textContent = method;
    methodBadge.classList.add(
      method === "POST"
        ? "http-post"
        : method === "PUT"
        ? "http-put"
        : method === "DELETE"
        ? "http-delete"
        : "http-get"
    );

    const statusBadge = document.createElement("span");
    statusBadge.className = "endpoint-status-pill";
    const status = (item.status || "unknown").toLowerCase();

    if (status === "online" || status === "ok") {
      statusBadge.classList.add("status-ok");
      statusBadge.textContent = "Online";
    } else if (status === "error" || status === "down") {
      statusBadge.classList.add("status-error");
      statusBadge.textContent = "Error";
    } else {
      statusBadge.classList.add("status-unknown");
      statusBadge.textContent = "Unknown";
    }

    metaRow.appendChild(methodBadge);
    metaRow.appendChild(statusBadge);

    header.appendChild(title);
    header.appendChild(metaRow);

    // deskripsi
    const desc = document.createElement("p");
    desc.className = "api-card-desc";
    desc.textContent = item.desc || "";

    // path
    const pathEl = document.createElement("div");
    pathEl.className = "api-path";
    pathEl.textContent = item.path || "";

    // footer
    const footer = document.createElement("div");
    footer.className = "api-card-footer";

    const actions = document.createElement("div");
    actions.className = "api-card-actions";

    const tryBtn = document.createElement("button");
    tryBtn.type = "button";
    tryBtn.className = "api-open-btn";
    tryBtn.innerHTML = '<i class="fas fa-play me-1"></i>Try';

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "fav-toggle-btn";
    const favIcon = document.createElement("i");
    favIcon.className = "fas fa-star";
    favBtn.appendChild(favIcon);

    const favKey = item.path || item.name;
    if (favorites.includes(favKey)) {
      favBtn.classList.add("favorited");
    }

    favBtn.addEventListener("click", () => toggleFav(favKey, favBtn));
    tryBtn.addEventListener("click", () => openApiModal(item));

    actions.appendChild(tryBtn);
    actions.appendChild(favBtn);

    footer.appendChild(pathEl);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(footer);
    col.appendChild(card);
    col.insertBefore(desc, footer);

    return col;
  }

  // ==========================
  // RENDER KATEGORI + FILTER
  // ==========================
  function renderFilters(categories) {
    if (!DOM.apiFilters) return;
    DOM.apiFilters.innerHTML = "";

    // chip default: Favorites
    const favChip = document.createElement("button");
    favChip.type = "button";
    favChip.className = "filter-chip";
    favChip.textContent = "Favorites";
    favChip.addEventListener("click", () => {
      if (!DOM.apiContent) return;
      const cards = DOM.apiContent.querySelectorAll(".api-card");
      cards.forEach((card) => {
        const path = card.querySelector(".api-path")?.textContent || "";
        card.style.display = favorites.includes(path) ? "" : "none";
      });
    });
    DOM.apiFilters.appendChild(favChip);

    categories.forEach((cat) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.textContent = cat.name;
      chip.addEventListener("click", () => {
        const targetId = `category-${cat.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        const section = document.getElementById(targetId);
        if (section) {
          window.scrollTo({
            top: section.offsetTop - 80,
            behavior: "smooth",
          });
        }
      });
      DOM.apiFilters.appendChild(chip);
    });
  }

  function renderApiCategories() {
    if (!DOM.apiContent) return;
    DOM.apiContent.innerHTML = "";

    let categories =
      settings && Array.isArray(settings.categories) && settings.categories.length
        ? settings.categories
        : fallbackCategories;

    renderFilters(categories);

    categories.forEach((category) => {
      const section = document.createElement("section");
      section.className = "category-section";
      section.id = `category-${category.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      const header = document.createElement("h3");
      header.className = "category-header section-title-oldmoney";
      header.textContent = category.name;

      const row = document.createElement("div");
      row.className = "row";

      const items = Array.isArray(category.items) ? [...category.items] : [];
      items.sort((a, b) => a.name.localeCompare(b.name));

      items.forEach((item) => {
        const col = buildApiCard(item);
        row.appendChild(col);
      });

      section.appendChild(header);
      section.appendChild(row);
      DOM.apiContent.appendChild(section);
    });
  }

  // ==========================
  // SETTINGS.JSON
  // ==========================
  function populateFromSettings() {
    if (!settings) return;
    if (DOM.versionBadge && settings.version) {
      DOM.versionBadge.textContent = settings.version;
    }
  }

  function loadSettings() {
    fetch("/src/settings.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) {
          appendLog("settings.json tidak ditemukan, pakai fallback.");
          settings = null;
        } else {
          settings = json;
          appendLog("settings.json dimuat.");
        }
        populateFromSettings();
        renderApiCategories();
      })
      .catch(() => {
        appendLog("Gagal memuat settings.json, pakai fallback.");
        settings = null;
        renderApiCategories();
      });
  }

  // ==========================
  // MODAL API
  // ==========================
  function openApiModal(item) {
    if (!modalInstance) return;

    const path = item.path || "";
    const desc = item.desc || "";

    DOM.modalTitle.textContent = item.name || "Respons API";
    DOM.modalSubtitle.textContent = desc;
    DOM.endpointText.textContent = path;
    DOM.apiResponseContent.textContent = "";
    DOM.modalStatusLine.textContent = "";
    DOM.modalLoading.classList.remove("d-none");

    modalInstance.show();

    if (!path) {
      DOM.modalLoading.classList.add("d-none");
      DOM.apiResponseContent.textContent = "Endpoint tidak tersedia.";
      return;
    }

    appendLog(`Request: ${path}`);
    addHistory({ name: item.name || "Unknown", path });

    fetch(path)
      .then(async (res) => {
        let bodyText;
        try {
          const clone = res.clone();
          bodyText = await clone.text();
        } catch {
          bodyText = null;
        }

        let parsed;
        try {
          parsed = await res.json();
        } catch {
          parsed = bodyText || "Tidak dapat membaca respons.";
        }

        DOM.modalLoading.classList.add("d-none");
        DOM.modalStatusLine.textContent = `Status: ${res.status} ${res.statusText}`;
        DOM.apiResponseContent.textContent = beautifyJSON(parsed);
        appendLog(`Response ${res.status} untuk ${path}`);
      })
      .catch((err) => {
        DOM.modalLoading.classList.add("d-none");
        DOM.modalStatusLine.textContent = "Gagal menghubungi server.";
        DOM.apiResponseContent.textContent = String(err);
        appendLog(`ERROR request ${path}: ${err}`);
      });
  }

  if (DOM.copyEndpointBtn) {
    DOM.copyEndpointBtn.addEventListener("click", () => {
      const text = DOM.endpointText.textContent || "";
      if (!text) return;
      navigator.clipboard.writeText(text).catch(() => {});
    });
  }

  if (DOM.copyCurlBtn) {
    DOM.copyCurlBtn.addEventListener("click", () => {
      const endpoint = DOM.endpointText.textContent || "";
      if (!endpoint) return;
      const curl = `curl -X GET "${endpoint}"`;
      navigator.clipboard.writeText(curl).catch(() => {});
    });
  }

  // ==========================
  // REQUEST BOX → WHATSAPP
  // ==========================
  function initRequestBox() {
    if (!DOM.apiRequestInput || !DOM.sendApiRequest) return;

    DOM.sendApiRequest.addEventListener("click", () => {
      const text = DOM.apiRequestInput.value.trim();
      if (!text) {
        alert("Isi dulu ide endpoint yang mau kamu request.");
        return;
      }
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

  // ==========================
  // FX: PARALLAX & CURSOR GLOW (optional)
  // ==========================
  function initFx() {
    if (DOM.bannerParallax) {
      DOM.bannerParallax.addEventListener("mousemove", (e) => {
        const rect = DOM.bannerParallax.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        DOM.bannerParallax.style.transform = `translateY(-2px) perspective(800px) rotateX(${
          y * -4
        }deg) rotateY(${x * 4}deg)`;
      });

      DOM.bannerParallax.addEventListener("mouseleave", () => {
        DOM.bannerParallax.style.transform = "";
      });
    }

    if (DOM.cursorGlow) {
      document.addEventListener("pointermove", (e) => {
        DOM.cursorGlow.style.transform = `translate(${e.clientX - 180}px, ${
          e.clientY - 180
        }px)`;
      });
    }
  }

  // ==========================
  // INIT
  // ==========================
  function init() {
    initMode();
    initPreset();
    initSidebar();
    initSearch();
    initRequestBox();
    initFx();
    renderHistory();
    loadSettings();
  }

  init();
});