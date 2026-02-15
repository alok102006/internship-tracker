/* ============================================
   Internship Daily Tracker - Logic
   Vanilla JS: streak, progress, theme, apply counter, PWA install
   ============================================ */

(function () {
  "use strict";

  // --- Constants: platform data ---
  const PLATFORMS = [
    { id: "linkedin", name: "LinkedIn", url: "https://www.linkedin.com/jobs" },
    { id: "internshala", name: "Internshala", url: "https://internshala.com" },
    { id: "unstop", name: "Unstop", url: "https://unstop.com" },
    { id: "indeed", name: "Indeed", url: "https://indeed.com" },
    { id: "naukri", name: "Naukri", url: "https://www.naukri.com" },
    { id: "wellfound", name: "Wellfound", url: "https://wellfound.com" },
  ];

  const TOTAL_PLATFORMS = PLATFORMS.length;
  const STORAGE_KEY = "internship-daily-tracker";
  const THEME_KEY = "internship-tracker-theme";
  const NOTIFICATION_TITLE = "Internship Daily Tracker";
  const NOTIFICATION_BODY = "🔥 All platforms checked! Great job!";

  // --- Helpers: date as YYYY-MM-DD (local) ---
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // --- Human-readable date: e.g. "15 Feb 2026" ---
  function formatDisplayDate(isoDateStr) {
    if (!isoDateStr) return "";
    const parts = isoDateStr.split("-");
    if (parts.length !== 3) return isoDateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const year = parts[0];
    return day + " " + (months[monthIndex] || "") + " " + year;
  }

  // --- Load / Save state ---
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  // --- Get initial state: date change resets checklist + apply counter, keeps streak ---
  function getInitialState() {
    const today = todayStr();
    const saved = loadState();

    if (!saved) {
      return {
        lastCheckedDate: null,
        checkedPlatforms: {},
        streak: 0,
        applicationsToday: 0,
        _lastSavedDate: today,
      };
    }

    const lastSavedDate = saved._lastSavedDate || saved.lastCheckedDate || null;
    let streak = typeof saved.streak === "number" ? saved.streak : 0;
    let checkedPlatforms = saved.checkedPlatforms && typeof saved.checkedPlatforms === "object" ? { ...saved.checkedPlatforms } : {};
    let applicationsToday = typeof saved.applicationsToday === "number" ? saved.applicationsToday : 0;

    if (lastSavedDate !== today) {
      checkedPlatforms = {};
      applicationsToday = 0;
    }

    return {
      lastCheckedDate: saved.lastCheckedDate || null,
      checkedPlatforms,
      streak,
      applicationsToday,
      _lastSavedDate: today,
    };
  }

  // --- DOM refs ---
  const reminderBanner = document.getElementById("reminder-banner");
  const streakValueEl = document.getElementById("streak-value");
  const lastCompletedEl = document.getElementById("last-completed");
  const progressWrap = document.getElementById("progress-wrap");
  const progressBar = progressWrap ? progressWrap.querySelector(".progress-bar") : null;
  const progressText = document.getElementById("progress-text");
  const platformListEl = document.getElementById("platform-list");
  const resetTodayBtn = document.getElementById("reset-today");
  const openAllBtn = document.getElementById("open-all");
  const applyCountEl = document.getElementById("apply-count");
  const applyIncrementBtn = document.getElementById("apply-increment");
  const applyDecrementBtn = document.getElementById("apply-decrement");
  const themeToggle = document.getElementById("theme-toggle");
  const installWrap = document.getElementById("install-wrap");
  const installAppBtn = document.getElementById("install-app");

  let state = getInitialState();
  let deferredInstallPrompt = null;

  // --- Progress: count checked, update bar and text ---
  function getCheckedCount() {
    return PLATFORMS.filter(function (p) { return state.checkedPlatforms[p.id] === true; }).length;
  }

  function updateProgressBar() {
    const count = getCheckedCount();
    const pct = TOTAL_PLATFORMS === 0 ? 0 : Math.round((count / TOTAL_PLATFORMS) * 100);
    if (progressText) progressText.textContent = count + " / " + TOTAL_PLATFORMS + " completed";
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", pct);
      progressBar.style.setProperty("--progress-width", pct + "%");
    }
  }

  // --- Last completed date display ---
  function updateLastCompleted() {
    if (!lastCompletedEl) return;
    if (state.lastCheckedDate) {
      lastCompletedEl.textContent = "✅ Last completed: " + formatDisplayDate(state.lastCheckedDate);
    } else {
      lastCompletedEl.textContent = "";
    }
  }

  // --- Apply counter: render and persist ---
  function renderApplyCount() {
    if (applyCountEl) applyCountEl.textContent = state.applicationsToday;
  }

  function persistApplyCount() {
    saveState({
      lastCheckedDate: state.lastCheckedDate,
      checkedPlatforms: state.checkedPlatforms,
      streak: state.streak,
      applicationsToday: state.applicationsToday,
      _lastSavedDate: state._lastSavedDate,
    });
  }

  // --- Render streak ---
  function renderStreak() {
    if (streakValueEl) streakValueEl.textContent = state.streak;
  }

  // --- Check if all platforms are checked for today ---
  function allChecked() {
    return PLATFORMS.every(function (p) { return state.checkedPlatforms[p.id] === true; });
  }

  // --- Persist and optionally complete day (increase streak + notification + last completed) ---
  function persist() {
    const today = todayStr();
    state._lastSavedDate = today;

    if (allChecked()) {
      const lastCompleted = state.lastCheckedDate;
      if (lastCompleted !== today) {
        state.streak = (state.streak || 0) + 1;
        state.lastCheckedDate = today;
        renderStreak();
        updateLastCompleted();
        showBrowserNotification();
      }
    }

    saveState({
      lastCheckedDate: state.lastCheckedDate,
      checkedPlatforms: state.checkedPlatforms,
      streak: state.streak,
      applicationsToday: state.applicationsToday,
      _lastSavedDate: state._lastSavedDate,
    });
    updateProgressBar();
  }

  // --- Browser notification (with permission) ---
  function showBrowserNotification() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY });
      } catch (_) {}
      return;
    }
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (p) {
        if (p === "granted") {
          try {
            new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY });
          } catch (_) {}
        }
      });
    }
  }

  // --- Toggle reminder banner (show if today incomplete) ---
  function updateReminderBanner() {
    if (allChecked()) {
      reminderBanner.classList.add("hidden");
    } else {
      reminderBanner.classList.remove("hidden");
    }
  }

  // --- Open all platform URLs in new tabs (no state change) ---
  function openAllPlatforms() {
    PLATFORMS.forEach(function (p) {
      window.open(p.url, "_blank", "noopener,noreferrer");
    });
  }

  // --- Build one platform row: checkbox + link ---
  function createPlatformItem(platform) {
    const li = document.createElement("li");
    li.className = "platform-item";
    li.setAttribute("role", "listitem");
    li.dataset.platformId = platform.id;

    const id = "platform-" + platform.id;
    const checked = state.checkedPlatforms[platform.id] === true;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.checked = checked;
    checkbox.setAttribute("aria-label", "Check " + platform.name);

    const link = document.createElement("a");
    link.href = platform.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = platform.name;

    if (checked) li.classList.add("checked");

    checkbox.addEventListener("change", function () {
      state.checkedPlatforms[platform.id] = checkbox.checked;
      li.classList.toggle("checked", checkbox.checked);
      persist();
      updateReminderBanner();
    });

    li.appendChild(checkbox);
    li.appendChild(link);
    return li;
  }

  // --- Render full checklist ---
  function renderChecklist() {
    if (!platformListEl) return;
    platformListEl.innerHTML = "";
    PLATFORMS.forEach(function (p) {
      platformListEl.appendChild(createPlatformItem(p));
    });
    updateProgressBar();
  }

  // --- Reset today: clear only today's progress (checkboxes), keep streak ---
  function resetToday() {
    const today = todayStr();
    state.checkedPlatforms = {};
    state._lastSavedDate = today;
    saveState({
      lastCheckedDate: state.lastCheckedDate,
      checkedPlatforms: state.checkedPlatforms,
      streak: state.streak,
      applicationsToday: state.applicationsToday,
      _lastSavedDate: state._lastSavedDate,
    });
    renderChecklist();
    updateReminderBanner();
  }

  // --- Theme: load preference and apply ---
  function getTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return t === "light" ? "light" : "dark";
    } catch (_) {
      return "dark";
    }
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {}
  }

  function initTheme() {
    var theme = getTheme();
    applyTheme(theme);
    if (themeToggle) {
      themeToggle.addEventListener("click", function () {
        var next = getTheme() === "dark" ? "light" : "dark";
        applyTheme(next);
      });
    }
  }

  // --- PWA Install: beforeinstallprompt ---
  function initInstallPrompt() {
    if (!installWrap || !installAppBtn) return;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      installWrap.classList.remove("hidden");
    });

    installAppBtn.addEventListener("click", function () {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function (choice) {
        if (choice.outcome === "accepted") installWrap.classList.add("hidden");
        deferredInstallPrompt = null;
      });
    });
  }

  // --- PWA: register service worker ---
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  // --- Init ---
  function init() {
    initTheme();
    renderStreak();
    updateLastCompleted();
    renderChecklist();
    updateReminderBanner();
    updateProgressBar();
    renderApplyCount();

    if (resetTodayBtn) resetTodayBtn.addEventListener("click", resetToday);
    if (openAllBtn) openAllBtn.addEventListener("click", openAllPlatforms);

    // Apply counter: event delegation not needed (only two buttons)
    if (applyIncrementBtn) {
      applyIncrementBtn.addEventListener("click", function () {
        state.applicationsToday = (state.applicationsToday || 0) + 1;
        renderApplyCount();
        persistApplyCount();
      });
    }
    if (applyDecrementBtn) {
      applyDecrementBtn.addEventListener("click", function () {
        var n = state.applicationsToday || 0;
        state.applicationsToday = n <= 0 ? 0 : n - 1;
        renderApplyCount();
        persistApplyCount();
      });
    }

    initInstallPrompt();

    document.body.addEventListener("click", function requestNotificationOnce() {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      document.body.removeEventListener("click", requestNotificationOnce);
    }, { once: true });
  }

  init();
})();
