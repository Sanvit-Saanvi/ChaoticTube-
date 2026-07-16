// ── Default theme ──────────────────────────────────
const DEFAULTS = {
  mode:    "dark",
  bg:      "#0f0f11",
  accent:  "#7c6af7"
};

// ── Load saved or defaults ─────────────────────────
function loadTheme() {
  try {
    return JSON.parse(localStorage.getItem("ct-theme")) || { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveTheme(theme) {
  localStorage.setItem("ct-theme", JSON.stringify(theme));
}

// ── Apply theme to DOM ─────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;

  // Background
  root.style.setProperty("--bg", theme.bg);
  document.body.style.background = theme.bg;

  // Accent (+ computed hover shade)
  root.style.setProperty("--accent",   theme.accent);
  root.style.setProperty("--accent-h", darken(theme.accent, 12));

  // Light / dark mode class
  document.body.classList.toggle("light", theme.mode === "light");
}

// Darken a hex colour by `amount` (0-255 per channel)
function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ── Sync UI controls to current theme ─────────────
function syncControls(theme) {
  // Mode buttons
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === theme.mode);
  });

  // BG swatches
  document.querySelectorAll(".swatch:not(.accent-swatch):not(.swatch-custom)").forEach(sw => {
    sw.classList.toggle("active", sw.dataset.color === theme.bg);
  });

  // Accent swatches
  document.querySelectorAll(".accent-swatch").forEach(sw => {
    sw.classList.toggle("active", sw.dataset.accent === theme.accent);
  });

  // Custom colour picker value
  const picker = document.getElementById("customColorPicker");
  if (picker) picker.value = theme.bg;
}

// ── Wire up controls ───────────────────────────────
function initControls(theme) {
  const toggleBtn  = document.getElementById("themeToggleBtn");
  const themePanel = document.getElementById("themePanel");

  // Open / close panel
  toggleBtn.addEventListener("click", () => {
    const open = !themePanel.classList.contains("hidden");
    themePanel.classList.toggle("hidden", open);
    toggleBtn.classList.toggle("active", !open);
  });

  // Mode buttons
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      theme.mode = btn.dataset.mode;
      applyTheme(theme);
      syncControls(theme);
      saveTheme(theme);
    });
  });

  // BG swatches
  document.querySelectorAll(".swatch:not(.accent-swatch):not(.swatch-custom)").forEach(sw => {
    sw.addEventListener("click", () => {
      theme.bg = sw.dataset.color;
      // Auto-switch mode based on brightness
      theme.mode = isLight(theme.bg) ? "light" : "dark";
      applyTheme(theme);
      syncControls(theme);
      saveTheme(theme);
    });
  });

  // Custom colour picker
  const picker = document.getElementById("customColorPicker");
  picker.addEventListener("input", () => {
    theme.bg   = picker.value;
    theme.mode = isLight(theme.bg) ? "light" : "dark";
    applyTheme(theme);
    syncControls(theme);
    saveTheme(theme);
  });

  // Accent swatches
  document.querySelectorAll(".accent-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      theme.accent = sw.dataset.accent;
      applyTheme(theme);
      syncControls(theme);
      saveTheme(theme);
    });
  });
}

// Returns true if hex colour is perceptually light
function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8)  & 0xff;
  const b =  n        & 0xff;
  // Perceived luminance formula
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140;
}

// ── Boot ───────────────────────────────────────────
const theme = loadTheme();
applyTheme(theme);          // apply before first paint
document.addEventListener("DOMContentLoaded", () => {
  syncControls(theme);
  initControls(theme);
});
