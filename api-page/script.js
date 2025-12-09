// ADA API UI – script utama
document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // DOM CACHE
  // ==========================
  const DOM = {
    body: document.body,
    loadingScreen: document.getElementById("loadingScreen"),

    // layout / navigasi
    sideNav: document.querySelector(".side-nav"),
    sideNavLinks: document.querySelectorAll(".side-nav-link"),
    navCollapseBtn: document.querySelector(".nav-collapse-btn"),
    menuToggle: document.querySelector(".menu-toggle"),

    // search
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),

    // header / footer info
    pageTitle: document.getElementById("page"),
    wm: document.getElementById("wm"),
    appName: document.getElementById("name"),
    sideNavName: document.getElementById("sideNavName"),
    versionBadge: document.getElementById("version"),
    versionHeaderBadge: document.getElementById("versionHeader"),
    appDescription: document.getElementById("description"),
    dynamicImage: document.getElementById("dynamicImage"),
    apiLinks: document.getElementById("apiLinks"),

    // tema
    themeToggle: document.getElementById("themeToggle"),
    themePreset: document.getElementById("themePreset"),

    // api list
    apiContent: document.getElementById("apiContent"),

    // request box / history / logs (opsional)
    apiRequestInput: document.getElementById("apiRequestInput"),
    sendApiRequest: document.getElementById("sendApiRequest"),
    requestHistoryList: document.getElementById("requestHistoryList"),
    logsConsole: document.getElementById("logsConsole"),

    // notif
    notificationToast: document.getElementById("notificationToast"),
    notificationBell: document.getElementById("notificationBell"),
    notificationBadge: document.getElementById("notificationBadge"),

    // modal
    modalEl: document.getElementById("apiResponseModal"),
    modalLabel: document.getElementById("apiResponseModalLabel"),
    modalDesc: document.getElementById("apiResponseModalDesc"),
    modalEndpoint: document.getElementById("apiEndpoint"),
    modalResponseContainer: document.getElementById("responseContainer"),
    modalResponseContent: document.getElementById("apiResponseContent"),
    modalSpinner: document.getElementById("apiResponseLoading"),
    modalQueryInputContainer: document.getElementById("apiQueryInputContainer"),
    modalSubmitBtn: document.getElementById("submitQueryBtn"),
    modalCopyEndpointBtn: document.getElementById("copyEndpoint"),
    modalCopyResponseBtn: document.getElementById("copyResponse")
  };

  // =========================================
  // STATE
  // =========================================
  let settings = null;
  let currentApiItem = null;
  let favorites = loadJSON("ada-api-favorites", []);          // array of path
  let historyItems = loadJSON("ada-api-history", []);          // {name, path, ts}
  let themeMode = null;                                        // 'light'|'dark'
  let themePreset = null;                                      // 'noir','emerald-gold',...

  const modalInstance = DOM.modalEl ? new bootstrap.Modal(DOM.modalEl) : null;
  const toastInstance = DOM.notificationToast
    ? new bootstrap.Toast(DOM.notificationToast)
    : null;

  // =========================================
  // UTIL
  // =========================================
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

  function showToast(message, type = "info", title = "Notifikasi") {
    if (!DOM.notificationToast || !toastInstance) return;

    const bodyEl = DOM.notificationToast.querySelector(".toast-body");
    const titleEl = DOM.notificationToast.querySelector(".toast-title");
    const iconEl = DOM.notificationToast.querySelector(".toast-icon");

    bodyEl.textContent = message;
    titleEl.textContent = title;

    const typeConfig = {
      success: { icon: "fa-check-circle" },
      error: { icon: "fa-exclamation-circle" },
      info: { icon: "fa-info-circle" },
      notification: { icon: "fa-bell" }
    };
    const cfg = typeConfig[type] || typeConfig.info;

    if (iconEl) {
      iconEl.className = `toast-icon fas ${cfg.icon} me-2`;
    }

    toastInstance.show();
  }

  function hideLoading() {
    if (!DOM.loadingScreen) return;
    DOM.loadingScreen.classList.add("hidden");
    setTimeout(() => {
      DOM.loadingScreen.style.display = "none";
    }, 250);
  }

  function appendLog(line) {
    if (!DOM.logsConsole) return;
    const ts = new Date().toISOString().slice(11, 19);
    DOM.logsConsole.textContent += `[${ts}] ${line}\n`;
    DOM.logsConsole.scrollTop = DOM.logsConsole.scrollHeight;
  }

  function addHistory(entry) {
    if (!DOM.requestHistoryList) return;
    historyItems.unshift({
      name: entry.name,
      path: entry.path,
      ts: Date.now()
    });
    historyItems = historyItems.slice(0, 20);
    saveJSON("ada-api-history", historyItems);
    renderHistory();
  }

  function renderHistory() {
    if (!DOM.requestHistoryList) return;
    DOM.requestHistoryList.innerHTML = "";
    historyItems.forEach(item => {
      const li = document.createElement("li");
      const date = new Date(item.ts);
      li.textContent = `${date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
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

  // =========================================
  // TEMA: MODE & PRESET
  // =========================================
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
      // follow system until user override
      if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = e => applyMode(e.matches ? "dark" : "light");
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

  function applyPreset(preset) {
    const allowed = ["noir", "emerald-gold", "cyber-glow", "royal-amber"];
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
        applyPreset(DOM.themePreset.value);
      });
    }
  }

  // =========================================
  // SIDEBAR
  // =========================================
  let sidebarBackdrop = null;

  function ensureSidebarBackdrop() {
    if (sidebarBackdrop) return;
    sidebarBackdrop = document.createElement("div");
    sidebarBackdrop.className = "sidebar-backdrop";
    document.body.appendChild(sidebarBackdrop);
    sidebarBackdrop.addEventListener("click", () => {
      closeSidebarMobile();
    });
  }

  function openSidebarMobile() {
    if (!DOM.sideNav) return;
    ensureSidebarBackdrop();
    DOM.sideNav.classList.add("open");
    DOM.body.classList.add("sidebar-open");
    if (sidebarBackdrop) sidebarBackdrop.classList.add("show");
  }

  function closeSidebarMobile() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.remove("open");
    DOM.body.classList.remove("sidebar-open");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("show");
  }

  function toggleSidebarCollapsedDesktop() {
    if (!DOM.sideNav) return;
    DOM.sideNav.classList.toggle("collapsed");
  }

  function initSidebar() {
    if (DOM.menuToggle) {
      DOM.menuToggle.addEventListener("click", () => {
        // di mobile: slide in/out
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

    // klik link sidebar di mobile -> tutup
    DOM.sideNavLinks.forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 992) closeSidebarMobile();
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992) {
        if (sidebarBackdrop) sidebarBackdrop.classList.remove("show");
        DOM.body.classList.remove("sidebar-open");
      }
    });

    // highlight section aktif saat scroll
    window.addEventListener("scroll", () => {
      const headerOffset = 72;
      const scrollY = window.scrollY + headerOffset;

      document.querySelectorAll("main section[id]").forEach(section => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute("id");
        const link = document.querySelector(
          `.side-nav-link[href="#${id}"]`
        );
        if (!link) return;
        if (scrollY >= top && scrollY < bottom) {
          DOM.sideNavLinks.forEach(l => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    });
  }

  // =========================================
  // SETTINGS & RENDER
  // =========================================
  function setText(el, value, fallback = "") {
    if (!el) return;
    el.textContent = value || fallback;
  }

  function populateFromSettings() {
    if (!settings) return;

    const year = new Date().getFullYear();
    const creator = settings.apiSettings?.creator || "Ada";

    setText(DOM.pageTitle, settings.name || "Ada API");
    setText(
      DOM.wm,
      `© ${year} ${creator}. Semua hak dilindungi.`
    );
    setText(DOM.appName, settings.name || "Ada API");
    setText(DOM.sideNavName, settings.name || "API");
    setText(DOM.versionBadge, settings.version || "v1.0");
    setText(DOM.versionHeaderBadge, settings.header?.status || "Online");
    setText(
      DOM.appDescription,
      settings.description ||
        "Dokumentasi API simpel dan mudah digunakan."
    );

    // banner
    if (DOM.dynamicImage) {
      const src = settings.bannerImage || "/src/banner.gif";
      DOM.dynamicImage.src = src;
      DOM.dynamicImage.alt = `${settings.name || "Ada API"} Banner`;
      DOM.dynamicImage.onerror = () => {
        DOM.dynamicImage.src = "/src/banner.jpg";
      };
    }

    // link hero (GitHub)
    if (DOM.apiLinks) {
      DOM.apiLinks.innerHTML = "";
      const defaultLinks = [
        {
          url: "https://github.com/adamhasani",
          name: "Profil GitHub",
          icon: "fab fa-github"
        }
      ];
      const links = settings.links?.length ? settings.links : defaultLinks;

      links.forEach((linkCfg, idx) => {
        const a = document.createElement("a");
        a.href = linkCfg.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "api-link";
        a.style.animationDelay = `${idx * 0.08}s`;
        a.setAttribute("aria-label", linkCfg.name);

        const icon = document.createElement("i");
        icon.className = linkCfg.icon || "fas fa-external-link-alt";
        icon.setAttribute("aria-hidden", "true");

        a.appendChild(icon);
        a.appendChild(document.createTextNode(` ${linkCfg.name}`));
        DOM.apiLinks.appendChild(a);
      });
    }
  }

  function buildApiCard(categoryName, item) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4 api-item";

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
    methodBadge.className = "http-badge http-get";
    methodBadge.textContent = (item.method || "GET").toUpperCase();

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
    const favIcon = document.createElement("i");
    favIcon.className = "fas fa-star";
    favBtn.appendChild(favIcon);

    const favKey = item.path || `${categoryName}:${item.name}`;
    if (favorites.includes(favKey)) {
      favBtn.classList.add("favorited");
    }

    favBtn.addEventListener("click", () => {
      const idx = favorites.indexOf(favKey);
      if (idx >= 0) {
        favorites.splice(idx, 1);
        favBtn.classList.remove("favorited");
      } else {
        favorites.push(favKey);
        favBtn.classList.add("favorited");
      }
      saveJSON("ada-api-favorites", favorites);
    });

    tryBtn.addEventListener("click", () => {
      openApiModal(categoryName, item);
    });

    actions.appendChild(tryBtn);
    actions.appendChild(favBtn);

    footer.appendChild(pathEl);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(footer);

    col.appendChild(card);
    return col;
  }

  function renderApiCategories() {
    if (!DOM.apiContent) return;
    DOM.apiContent.innerHTML = "";

    if (!settings || !Array.isArray(settings.categories)) {
      DOM.apiContent.textContent = "Tidak ada kategori API.";
      return;
    }

    settings.categories.forEach((category, catIndex) => {
      const section = document.createElement("section");
      section.className = "category-section";
      section.id = `category-${category.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      const header = document.createElement("h3");
      header.className = "category-header section-title";
      header.textContent = category.name;

      const row = document.createElement("div");
      row.className = "row";

      const items = Array.isArray(category.items)
        ? [...category.items]
        : [];
      items.sort((a, b) => a.name.localeCompare(b.name));

      items.forEach(item => {
        const col = buildApiCard(category.name, item);
        row.appendChild(col);
      });

      section.appendChild(header);
      section.appendChild(row);

      DOM.apiContent.appendChild(section);
    });
  }

  // =========================================
  // SEARCH
  // =========================================
  function filterApis(query) {
    query = query.trim().toLowerCase();

    const itemEls = DOM.apiContent
      ? DOM.apiContent.querySelectorAll(".api-item")
      : [];

    itemEls.forEach(el => {
      const name =
        el.querySelector(".api-card-title")?.textContent.toLowerCase() ||
        "";
      const desc =
        el.querySelector(".api-card-desc")?.textContent.toLowerCase() ||
        "";
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

  // =========================================
  // MODAL / API REQUEST
  // =========================================
  function buildParamInputs(params) {
    DOM.modalQueryInputContainer.innerHTML = "";
    if (!params || typeof params !== "object") return;

    const wrapper = document.createElement("div");
    wrapper.className = "row g-2";

    Object.entries(params).forEach(([key, placeholder]) => {
      const col = document.createElement("div");
      col.className = "col-12 col-md-6";

      const group = document.createElement("div");
      group.className = "form-floating mb-1";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "form-control";
      input.id = `param-${key}`;
      input.placeholder = placeholder || key;
      input.dataset.paramKey = key;

      const label = document.createElement("label");
      label.setAttribute("for", input.id);
      label.textContent = key;

      group.appendChild(input);
      group.appendChild(label);
      col.appendChild(group);
      wrapper.appendChild(col);
    });

    DOM.modalQueryInputContainer.appendChild(wrapper);
  }

  function openApiModal(categoryName, item) {
    if (!modalInstance) return;

    currentApiItem = item;

    DOM.modalLabel.textContent = item.name;
    DOM.modalDesc.textContent = item.desc || categoryName;
    DOM.modalEndpoint.textContent = item.path || "";
    DOM.modalResponseContent.textContent = "";
    DOM.modalResponseContent.classList.add("d-none");
    DOM.modalResponseContainer.classList.add("d-none");
    DOM.modalSpinner.classList.add("d-none");
    DOM.modalSubmitBtn.disabled = false;

    buildParamInputs(item.params);

    modalInstance.show();
  }

  async function sendApiRequest() {
    if (!currentApiItem) return;
    const basePath = currentApiItem.path || "";
    if (!basePath) return;

    // kumpulkan param dari input
    let url = basePath;
    if (DOM.modalQueryInputContainer) {
      const inputs =
        DOM.modalQueryInputContainer.querySelectorAll("input[data-param-key]");
      inputs.forEach(input => {
        const key = input.dataset.paramKey;
        const value = input.value;
        if (value === "") return;
        // hanya untuk path dengan query ( ...?  )
        if (!url.includes("?")) url += "?";
        else if (!url.endsWith("&") && !url.endsWith("?")) url += "&";
        url += `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      });
    }

    DOM.modalSpinner.classList.remove("d-none");
    DOM.modalResponseContainer.classList.add("d-none");
    DOM.modalSubmitBtn.disabled = true;
    DOM.modalEndpoint.textContent = url;

    appendLog(`Request -> ${url}`);
    addHistory({ name: currentApiItem.name, path: url });

    try {
      const res = await fetch(url);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = beautifyJSON(text);
      } catch {
        // ignore
      }

      DOM.modalResponseContent.textContent = pretty;
      DOM.modalResponseContent.classList.remove("d-none");
      DOM.modalResponseContainer.classList.remove("d-none");
      showToast(
        `Status ${res.status}`,
        res.ok ? "success" : "error",
        currentApiItem.name
      );
    } catch (err) {
      DOM.modalResponseContent.textContent = String(err);
      DOM.modalResponseContent.classList.remove("d-none");
      DOM.modalResponseContainer.classList.remove("d-none");
      showToast(`Gagal request: ${err.message}`, "error");
    } finally {
      DOM.modalSpinner.classList.add("d-none");
      DOM.modalSubmitBtn.disabled = false;
    }
  }

  function initModalEvents() {
    if (!DOM.modalSubmitBtn) return;
    DOM.modalSubmitBtn.addEventListener("click", sendApiRequest);

    if (DOM.modalCopyEndpointBtn) {
      DOM.modalCopyEndpointBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(DOM.modalEndpoint.textContent);
          showToast("Endpoint disalin ke clipboard.", "success");
        } catch {
          showToast("Gagal menyalin endpoint.", "error");
        }
      });
    }

    if (DOM.modalCopyResponseBtn) {
      DOM.modalCopyResponseBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(
            DOM.modalResponseContent.textContent
          );
          showToast("Respons disalin ke clipboard.", "success");
        } catch {
          showToast("Gagal menyalin respons.", "error");
        }
      });
    }
  }

  // =========================================
  // REQUEST BOX → WA
  // =========================================
  function initRequestBox() {
    if (!DOM.apiRequestInput || !DOM.sendApiRequest) return;

    DOM.sendApiRequest.addEventListener("click", () => {
      const text = DOM.apiRequestInput.value.trim();
      if (!text) {
        showToast("Isi dulu ide endpoint yang mau kamu request.", "info");
        return;
      }
      const waNumber = "6287751121269";
      const url =
        "https://wa.me/" +
        waNumber +
        "?text=" +
        encodeURIComponent(
          "[Request Endpoint Ada API]\n\n" + text
        );
      window.open(url, "_blank");
      appendLog("Request endpoint dikirim ke WhatsApp.");
      DOM.apiRequestInput.value = "";
    });
  }

  // =========================================
  // NOTIFICATION BELL (sederhana)
  // =========================================
  function initNotificationBell() {
    if (!DOM.notificationBell) return;
    DOM.notificationBell.addEventListener("click", () => {
      showToast(
        "Tidak ada notifikasi baru saat ini.",
        "info",
        "Notifikasi"
      );
    });
  }

  // =========================================
  // INIT
  // =========================================
  async function init() {
    initMode();
    initPreset();
    initSidebar();
    initSearch();
    initModalEvents();
    initRequestBox();
    initNotificationBell();
    renderHistory();

    try {
      const res = await fetch("/src/settings.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      settings = await res.json();
      populateFromSettings();
      renderApiCategories();
      appendLog("settings.json loaded and endpoints rendered.");
    } catch (err) {
      console.error(err);
      showToast(`Gagal memuat konfigurasi API: ${err.message}`, "error");
      if (DOM.apiContent) {
        DOM.apiContent.textContent =
          "Tidak dapat memuat konfigurasi API. Periksa settings.json.";
      }
    } finally {
      hideLoading();
    }
  }

  init();
});