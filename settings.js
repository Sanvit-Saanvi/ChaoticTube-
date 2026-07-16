// ── Load saved settings ────────────────────────────
const DEFAULTS = {
  mode:             "dark",
  bg:               "#0f0f11",
  accent:           "#7c6af7",
  font:             "medium",
  card:             "normal",
  layout:           "grid",
  sort:             "newest",
  showPinned:       true,
  autoplay:         false,
  volume:           100,
  displayName:      "",
  avatar:           "🎭",
  profileColor:     "#7c6af7",
  newVideoNotif:    true,
  creatorPassword:  "",
  securityQuestion: "",
  securityAnswer:   "",
};

function loadSettings() {
  try {
    const theme = JSON.parse(localStorage.getItem("ct-theme")) || {};
    const prefs = JSON.parse(localStorage.getItem("ct-prefs")) || {};
    return { ...DEFAULTS, ...theme, ...prefs };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  const theme = {
    mode:   settings.mode,
    bg:     settings.bg,
    accent: settings.accent,
  };
  const prefs = {
    font:             settings.font,
    card:             settings.card,
    layout:           settings.layout,
    sort:             settings.sort,
    showPinned:       settings.showPinned,
    autoplay:         settings.autoplay,
    volume:           settings.volume,
    displayName:      settings.displayName,
    avatar:           settings.avatar,
    profileColor:     settings.profileColor,
    newVideoNotif:    settings.newVideoNotif,
    creatorPassword:  settings.creatorPassword,
    securityQuestion: settings.securityQuestion,
    securityAnswer:   settings.securityAnswer,
  };
  localStorage.setItem("ct-theme", JSON.stringify(theme));
  localStorage.setItem("ct-prefs", JSON.stringify(prefs));
}

// ── Apply theme to page ────────────────────────────
function applyTheme(settings) {
  document.documentElement.style.setProperty("--bg", settings.bg);
  document.documentElement.style.setProperty("--accent", settings.accent);
  document.documentElement.style.setProperty("--accent-h", darken(settings.accent, 12));
  document.body.style.background = settings.bg;
  document.body.classList.toggle("light", settings.mode === "light");
}

function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140;
}

// ── Show saved confirmation ────────────────────────
function showSaved() {
  const msg = document.getElementById("savedMsg");
  if (msg) {
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 2000);
  }
}

function showInlineSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2000);
}

// ── Sync UI to settings ────────────────────────────
function syncUI(settings) {
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === settings.mode);
  });
  document.querySelectorAll(".swatch:not(.accent-swatch):not(.swatch-custom)").forEach(sw => {
    sw.classList.toggle("active", sw.dataset.color === settings.bg);
  });
  document.querySelectorAll(".accent-swatch").forEach(sw => {
    sw.classList.toggle("active", sw.dataset.accent === settings.accent);
  });
  document.getElementById("customColorPicker").value = settings.bg;
  document.querySelectorAll(".opt-btn[data-font]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.font === settings.font);
  });
  document.querySelectorAll(".opt-btn[data-card]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.card === settings.card);
  });
  document.querySelectorAll(".opt-btn[data-layout]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.layout === settings.layout);
  });
  document.querySelectorAll(".opt-btn[data-sort]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.sort === settings.sort);
  });
  document.getElementById("showPinned").checked      = settings.showPinned;
  document.getElementById("autoplay").checked        = settings.autoplay;
  document.getElementById("newVideoNotif").checked   = settings.newVideoNotif;
  document.getElementById("volumeSlider").value      = settings.volume;
  document.getElementById("volumeValue").textContent = `${settings.volume}%`;
  document.getElementById("displayName").value       = settings.displayName || "";
  document.getElementById("avatarEmoji").value       = settings.avatar || "🎭";
  document.getElementById("profileColor").value      = settings.profileColor || "#7c6af7";

  const creatorPwdEl = document.getElementById("creatorPassword");
  if (creatorPwdEl) creatorPwdEl.placeholder = settings.creatorPassword ? "••••••••" : "Set a password…";

  const sqEl = document.getElementById("securityQuestion");
  if (sqEl) sqEl.value = settings.securityQuestion || "";

  const saEl = document.getElementById("securityAnswer");
  if (saEl) saEl.value = settings.securityAnswer || "";
}

// ── Wire up controls ───────────────────────────────
function initControls(settings) {

  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      settings.mode = btn.dataset.mode;
      applyTheme(settings);
      syncUI(settings);
      saveSettings(settings);
      showSaved();
    });
  });

  document.querySelectorAll(".swatch:not(.accent-swatch):not(.swatch-custom)").forEach(sw => {
    sw.addEventListener("click", () => {
      settings.bg = sw.dataset.color;
      settings.mode = isLight(settings.bg) ? "light" : "dark";
      applyTheme(settings);
      syncUI(settings);
      saveSettings(settings);
      showSaved();
    });
  });

  document.getElementById("customColorPicker").addEventListener("input", (e) => {
    settings.bg = e.target.value;
    settings.mode = isLight(settings.bg) ? "light" : "dark";
    applyTheme(settings);
    syncUI(settings);
    saveSettings(settings);
  });

  document.querySelectorAll(".accent-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      settings.accent = sw.dataset.accent;
      applyTheme(settings);
      syncUI(settings);
      saveSettings(settings);
      showSaved();
    });
  });

  document.querySelectorAll(".opt-btn[data-font]").forEach(btn => {
    btn.addEventListener("click", () => {
      settings.font = btn.dataset.font;
      applyFontSize(settings.font);
      syncUI(settings);
      saveSettings(settings);
      showSaved();
    });
  });

  document.querySelectorAll(".opt-btn[data-card]").forEach(btn => {
    btn.addEventListener("click", () => {
      settings.card = btn.dataset.card;
      syncUI(settings);
      saveSettings(settings);
      showSaved();
    });
  });

  document.querySelectorAll(".opt-btn[data-layout]").forEach(btn => {
    btn.addEventListener("click", () => {
      settings.layout = btn.dataset.layout;
      applyLayout(settings.layout);
      syncUI(settings);
      saveSettings(settings);
      showSaved();
    });
  });

  document.querySelectorAll(".opt-btn[data-sort]").forEach(btn => {
    btn.addEventListener("click", () => {
      settings.sort = btn.dataset.sort;
      syncUI(settings);
      saveSettings(settings);
      showSaved();
    });
  });

  document.getElementById("showPinned").addEventListener("change", (e) => {
    settings.showPinned = e.target.checked;
    saveSettings(settings);
    showSaved();
  });

  document.getElementById("autoplay").addEventListener("change", (e) => {
    settings.autoplay = e.target.checked;
    saveSettings(settings);
    showSaved();
  });

  document.getElementById("newVideoNotif").addEventListener("change", (e) => {
    settings.newVideoNotif = e.target.checked;
    saveSettings(settings);
    showSaved();
  });

  document.getElementById("volumeSlider").addEventListener("input", (e) => {
    settings.volume = parseInt(e.target.value);
    document.getElementById("volumeValue").textContent = `${settings.volume}%`;
    saveSettings(settings);
  });

  document.getElementById("saveNameBtn").addEventListener("click", async () => {
    settings.displayName = document.getElementById("displayName").value.trim();
    saveSettings(settings);
    showInlineSaved("savedName");

    // Save to Firestore userProfiles
    if (settings.displayName) {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const { db } = await import("./firebase.js");
      await setDoc(doc(db, "userProfiles", settings.displayName), {
        displayName:  settings.displayName,
        avatar:       settings.avatar || "🎭",
        profileColor: settings.profileColor || "#7c6af7"
      }, { merge: true });
    }
  });

  document.getElementById("saveAvatarBtn").addEventListener("click", () => {
    settings.avatar = document.getElementById("avatarEmoji").value.trim() || "🎭";
    saveSettings(settings);
    showInlineSaved("savedAvatar");
  });

  document.getElementById("profileColor").addEventListener("input", async (e) => {
    settings.profileColor = e.target.value;
    saveSettings(settings);

    if (settings.displayName) {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const { db } = await import("./firebase.js");
      await setDoc(doc(db, "userProfiles", settings.displayName), {
        displayName:  settings.displayName,
        avatar:       settings.avatar || "🎭",
        profileColor: settings.profileColor
      }, { merge: true });
    }
  });

  document.getElementById("savePasswordBtn").addEventListener("click", () => {
    const pwd = document.getElementById("creatorPassword").value.trim();
    if (!pwd) { alert("Please enter a password!"); return; }
    if (pwd.length < 4) { alert("Password must be at least 4 characters!"); return; }

    if (settings.creatorPassword) {
      const current = prompt("Enter your current password to change it:");
      if (!current) return;
      if (current !== settings.creatorPassword) {
        alert("Wrong current password!");
        return;
      }
    }

    settings.creatorPassword = pwd;
    saveSettings(settings);
    document.getElementById("creatorPassword").value = "";
    const creatorPwdEl = document.getElementById("creatorPassword");
    if (creatorPwdEl) creatorPwdEl.placeholder = "••••••••";
    showInlineSaved("savedPassword");
  });

  document.getElementById("saveSecurityBtn").addEventListener("click", () => {
    const question = document.getElementById("securityQuestion").value;
    const answer   = document.getElementById("securityAnswer").value.trim();
    if (!question) { alert("Please select a question!"); return; }
    if (!answer)   { alert("Please enter an answer!"); return; }
    settings.securityQuestion = question;
    settings.securityAnswer   = answer.toLowerCase();
    saveSettings(settings);
    showInlineSaved("savedSecurity");
  });

  document.getElementById("resetSecurityBtn").addEventListener("click", () => {
    if (!confirm("Reset your security question and answer?")) return;
    settings.securityQuestion = "";
    settings.securityAnswer   = "";
    saveSettings(settings);
    document.getElementById("securityQuestion").value = "";
    document.getElementById("securityAnswer").value   = "";
    showSaved();
  });

  const QUESTIONS = {
    "1": "🏙️ What city were you born in?",
    "2": "🍕 What is your favourite food?",
    "3": "🎬 What is your favourite movie?",
    "4": "🎵 What is your favourite song?",
    "5": "🌍 What is your favourite place?",
  };

  document.getElementById("forgotPasswordBtn").addEventListener("click", () => {
    if (!settings.securityQuestion || !settings.securityAnswer) {
      alert("You haven't set a security question yet! Set one above first.");
      return;
    }
    const question = QUESTIONS[settings.securityQuestion];
    const answer = prompt(`Security question: ${question}`);
    if (!answer) return;
    if (answer.trim().toLowerCase() !== settings.securityAnswer) {
      alert("Wrong answer! Password reset failed.");
      return;
    }
    const newPassword = prompt("Correct! Enter your new password:");
    if (!newPassword || !newPassword.trim()) {
      alert("Password cannot be empty!");
      return;
    }
    settings.creatorPassword = newPassword.trim();
    saveSettings(settings);
    alert("Password reset successfully! 🎉");
    showSaved();
  });

  // ── Watch History ──────────────────────────────
  const viewHistoryBtn  = document.getElementById("viewHistoryBtn");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const historyPanel    = document.getElementById("historyPanel");
  const historyList     = document.getElementById("historyList");

  viewHistoryBtn.addEventListener("click", () => {
    const isOpen = !historyPanel.classList.contains("hidden");
    historyPanel.classList.toggle("hidden", isOpen);
    viewHistoryBtn.textContent = isOpen ? "View History" : "Hide History";

    if (!isOpen) {
      const history = (() => {
        try { return JSON.parse(localStorage.getItem("ct-history")) || []; } catch { return []; }
      })();
      if (history.length === 0) {
        historyList.innerHTML = `<p class="history-empty">No watch history yet!</p>`;
        return;
      }
      historyList.innerHTML = history.map(h => `
        <div class="history-item">
          <div class="history-item-info">
            <p class="history-item-title">${h.name}</p>
            <p class="history-item-meta">${h.avatar} ${h.displayName} · ${new Date(h.watchedAt).toLocaleDateString()}</p>
          </div>
          <div class="history-progress">
            <div class="history-progress-fill" style="width:${h.progress || 0}%"></div>
          </div>
        </div>
      `).join("");
    }
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (!confirm("Clear all watch history?")) return;
    localStorage.removeItem("ct-history");
    historyList.innerHTML = `<p class="history-empty">History cleared!</p>`;
    showSaved();
  });

  // ── Your Stats ─────────────────────────────────
  function loadStats() {
    let heartsGiven = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ct-heart-") && localStorage.getItem(key) === "1") {
        heartsGiven++;
      }
    }
    const history = (() => {
      try { return JSON.parse(localStorage.getItem("ct-history")) || []; } catch { return []; }
    })();
    let nominations = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ct-nominated-")) nominations++;
    }
    const lastWatched = history.length > 0
      ? `${history[0].name} (${new Date(history[0].watchedAt).toLocaleDateString()})`
      : "Nothing yet";

    document.getElementById("statHearts").textContent      = heartsGiven;
    document.getElementById("statWatched").textContent     = history.length;
    document.getElementById("statNominations").textContent = nominations;
    document.getElementById("statLastWatched").textContent = lastWatched;

    const prefs = (() => {
      try { return JSON.parse(localStorage.getItem("ct-prefs")) || {}; } catch { return {}; }
    })();
    const displayName = prefs.displayName || "Anonymous";
    const uploaded = history.filter(h => h.displayName === displayName).length;
    document.getElementById("statUploads").textContent = uploaded;
  }

  loadStats();

  // ── Admin Panel ────────────────────────────────
  const ADMIN_PWD = "1357";

  document.getElementById("adminUnlockBtn").addEventListener("click", async () => {
    const pwd = document.getElementById("adminPwdInput").value;
    if (pwd !== ADMIN_PWD) {
      alert("Wrong admin password!");
      return;
    }
    document.getElementById("adminContent").classList.remove("hidden");
    document.getElementById("adminLockRow").classList.add("hidden");
    document.getElementById("adminHideRow").classList.remove("hidden");
    await loadAdminData();
  });

  document.getElementById("adminHideBtn").addEventListener("click", () => {
    document.getElementById("adminContent").classList.add("hidden");
    document.getElementById("adminHideRow").classList.add("hidden");
    document.getElementById("adminLockRow").classList.remove("hidden");
    document.getElementById("adminPwdInput").value = "";
  });

  async function loadAdminData() {
    try {
      const { collection, getDocs, query, orderBy, where,
              doc, updateDoc, deleteDoc, setDoc, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

      const { db } = await import("./firebase.js");

      const videosSnap = await getDocs(query(collection(db, "videos"), orderBy("createdAt", "desc")));
      const videos = videosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      document.getElementById("adminStatVideos").textContent = videos.length;

      const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const nomsSnap = await getDocs(query(collection(db, "nominations"), where("monthKey", "==", monthKey)));
      document.getElementById("adminStatNoms").textContent = nomsSnap.size;

      const mostHearted = videos.length > 0
        ? videos.reduce((a, b) => (b.hearts || 0) > (a.hearts || 0) ? b : a)
        : null;
      document.getElementById("adminStatHearted").textContent = mostHearted
        ? `${mostHearted.name} (${mostHearted.hearts || 0} ❤️)`
        : "None";

      // Get names from both videos and userProfiles
      const videoNames = videos.map(v => v.displayName || "Anonymous");
      const profilesSnap = await getDocs(collection(db, "userProfiles"));
      const profileNames = profilesSnap.docs.map(d => d.data().displayName).filter(Boolean);
      const names = [...new Set([...videoNames, ...profileNames])];

      document.getElementById("adminDisplayNames").innerHTML = names.length === 0
        ? `<p class="history-empty">No users yet!</p>`
        : names.map(name => `
          <div class="admin-list-item">
            <span class="admin-list-item-name">${name}</span>
            <span class="admin-list-item-meta">${videos.filter(v => (v.displayName || "Anonymous") === name).length} video(s)</span>
          </div>
        `).join("");

      document.getElementById("adminUploadHistory").innerHTML = videos.map(v => `
        <div class="admin-list-item">
          <span class="admin-list-item-name">${v.name}</span>
          <span class="admin-list-item-meta">${v.displayName || "Anonymous"} · ${v.createdAt?.toDate?.().toLocaleDateString() || "Unknown"}</span>
        </div>
      `).join("");

      const pinnedSnap = await getDocs(collection(db, "pinned"));
      const pinned = pinnedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderPinnedList(pinned);

      const catsSnap = await getDocs(collection(db, "customCategories"));
      const cats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCustomCategories(cats);

      document.getElementById("pinVideoBtn").onclick = async () => {
        const title = document.getElementById("pinVideoInput").value.trim();
        if (!title) { alert("Enter a video title!"); return; }
        const currentPinned = await getDocs(collection(db, "pinned"));
        if (currentPinned.size >= 3) { alert("Maximum 3 pinned videos! Remove one first."); return; }
        const video = videos.find(v => v.name.toLowerCase() === title.toLowerCase());
        if (!video) { alert("Video not found!"); return; }
        await setDoc(doc(db, "pinned", video.id), { videoId: video.id, name: video.name, pinnedAt: serverTimestamp() });
        document.getElementById("pinVideoInput").value = "";
        const newPinned = (await getDocs(collection(db, "pinned"))).docs.map(d => ({ id: d.id, ...d.data() }));
        renderPinnedList(newPinned);
        showSaved();
      };

      document.getElementById("editVideoBtn").onclick = async () => {
        const currentTitle = document.getElementById("editVideoSearch").value.trim();
        const newTitle     = document.getElementById("editVideoNew").value.trim();
        if (!currentTitle || !newTitle) { alert("Fill in both fields!"); return; }
        const video = videos.find(v => v.name.toLowerCase() === currentTitle.toLowerCase());
        if (!video) { alert("Video not found!"); return; }
        await updateDoc(doc(db, "videos", video.id), { name: newTitle });
        alert(`Title updated to "${newTitle}"!`);
        document.getElementById("editVideoSearch").value = "";
        document.getElementById("editVideoNew").value = "";
        showSaved();
      };

      document.getElementById("deleteVideoBtn").onclick = async () => {
        const title = document.getElementById("deleteVideoInput").value.trim();
        if (!title) { alert("Enter a video title!"); return; }
        const video = videos.find(v => v.name.toLowerCase() === title.toLowerCase());
        if (!video) { alert("Video not found!"); return; }
        if (!confirm(`Delete "${video.name}"? This cannot be undone!`)) return;
        await deleteDoc(doc(db, "videos", video.id));
        alert("Video deleted!");
        document.getElementById("deleteVideoInput").value = "";
      };

      document.getElementById("postAnnouncementBtn").onclick = async () => {
        const text = document.getElementById("announcementInput").value.trim();
        if (!text) { alert("Enter announcement text!"); return; }
        await setDoc(doc(db, "settings", "announcement"), { text, active: true, createdAt: serverTimestamp() });
        document.getElementById("announcementInput").value = "";
        alert("Announcement posted!");
        showSaved();
      };

      document.getElementById("scheduleAnnouncementBtn").onclick = async () => {
        const text = document.getElementById("announcementInput").value.trim();
        const date = document.getElementById("announcementDate").value;
        if (!text) { alert("Enter announcement text!"); return; }
        if (!date) { alert("Select a date and time!"); return; }
        await setDoc(doc(db, "settings", "announcement"), {
          text, active: false,
          scheduledFor: new Date(date).toISOString(),
          createdAt: serverTimestamp()
        });
        document.getElementById("announcementInput").value = "";
        document.getElementById("announcementDate").value = "";
        alert(`Announcement scheduled for ${new Date(date).toLocaleString()}!`);
        showSaved();
      };

      document.getElementById("clearAnnouncementBtn").onclick = async () => {
        if (!confirm("Clear the announcement?")) return;
        await deleteDoc(doc(db, "settings", "announcement"));
        alert("Announcement cleared!");
      };

      document.getElementById("addCategoryBtn").onclick = async () => {
        const emoji = document.getElementById("newCategoryEmoji").value.trim();
        const name  = document.getElementById("newCategoryName").value.trim();
        if (!emoji || !name) { alert("Fill in both emoji and name!"); return; }
        const id = name.toLowerCase().replace(/\s+/g, "-");
        await setDoc(doc(db, "customCategories", id), { id, emoji, name, label: `${emoji} ${name}`, createdAt: serverTimestamp() });
        document.getElementById("newCategoryEmoji").value = "";
        document.getElementById("newCategoryName").value = "";
        const newCats = (await getDocs(collection(db, "customCategories"))).docs.map(d => ({ id: d.id, ...d.data() }));
        renderCustomCategories(newCats);
        showSaved();
      };

      document.getElementById("resetVotesBtn").onclick = async () => {
        const category = document.getElementById("resetCategorySelect").value;
        if (!category) { alert("Select a category!"); return; }
        if (!confirm(`Reset all votes for ${category} this month?`)) return;
        const nomsToReset = await getDocs(query(
          collection(db, "nominations"),
          where("monthKey", "==", monthKey),
          where("category", "==", category)
        ));
        await Promise.all(nomsToReset.docs.map(d => updateDoc(doc(db, "nominations", d.id), { votes: 0 })));
        alert("Votes reset!");
        showSaved();
      };

      function renderPinnedList(pinned) {
        const el = document.getElementById("pinnedList");
        el.innerHTML = pinned.length === 0
          ? `<p class="history-empty">No pinned videos!</p>`
          : pinned.map(p => `
            <div class="admin-list-item">
              <span class="admin-list-item-name">📌 ${p.name}</span>
              <button class="admin-remove-btn" data-id="${p.id}">Unpin</button>
            </div>
          `).join("");
        el.querySelectorAll(".admin-remove-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            await deleteDoc(doc(db, "pinned", btn.dataset.id));
            const newPinned = (await getDocs(collection(db, "pinned"))).docs.map(d => ({ id: d.id, ...d.data() }));
            renderPinnedList(newPinned);
          });
        });
      }

      function renderCustomCategories(cats) {
        const el = document.getElementById("customCategoriesList");
        el.innerHTML = cats.length === 0
          ? `<p class="history-empty">No custom categories yet!</p>`
          : cats.map(c => `
            <div class="admin-list-item">
              <span class="admin-list-item-name">${c.label}</span>
              <button class="admin-remove-btn" data-id="${c.id}">Remove</button>
            </div>
          `).join("");
        el.querySelectorAll(".admin-remove-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            await deleteDoc(doc(db, "customCategories", btn.dataset.id));
            const newCats = (await getDocs(collection(db, "customCategories"))).docs.map(d => ({ id: d.id, ...d.data() }));
            renderCustomCategories(newCats);
          });
        });
      }

    } catch (err) {
      console.error(err);
      alert("Failed to load admin data: " + err.message);
    }
  }

} // ← closing brace of initControls

// ── Font size apply ────────────────────────────────
function applyFontSize(size) {
  if (size === "small") {
    document.body.style.zoom = "0.85";
  } else if (size === "large") {
    document.body.style.zoom = "1.15";
  } else {
    document.body.style.zoom = "1";
  }
}

// ── Layout apply ───────────────────────────────────
function applyLayout(layout) {
  const grid = document.getElementById("videoFeed");
  if (!grid) return;
  if (layout === "list") {
    grid.classList.add("list-layout");
  } else {
    grid.classList.remove("list-layout");
  }
}

// ── Boot ───────────────────────────────────────────
const settings = loadSettings();
applyTheme(settings);
applyFontSize(settings.font);

document.addEventListener("DOMContentLoaded", () => {
  syncUI(settings);
  initControls(settings);
});
