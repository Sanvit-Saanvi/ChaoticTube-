import { db } from "./firebase.js";

import {
  collection, getDocs, doc, updateDoc, increment,
  query, where, setDoc, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CATEGORIES = [
  { id: "meme-year",       label: "👑 Meme of the Year" },
  { id: "meme-month",      label: "🏆 Meme of the Month" },
  { id: "most-chaotic",    label: "🌪️ Most Chaotic" },
  { id: "most-crazy",      label: "🤯 Most Crazy" },
  { id: "funniest",        label: "😂 Funniest Video" },
  { id: "most-underrated", label: "🏅 Most Underrated" },
];

const grid           = document.getElementById("categoriesGrid");
const monthLabel     = document.getElementById("monthLabel");
const motmList       = document.getElementById("motmList");
const motyList       = document.getElementById("motyList");
const motmPopup      = document.getElementById("motmPopup");
const popupNomList   = document.getElementById("popupNomList");
const popupClose     = document.getElementById("popupClose");
const hofModeToggle  = document.getElementById("hofModeToggle");

let isAdmin = false;

// ── Dark/Light toggle ──────────────────────────────
const savedTheme = (() => {
  try { return JSON.parse(localStorage.getItem("ct-theme")); } catch { return null; }
})();

if (savedTheme?.mode === "light") {
  document.body.classList.add("light");
  document.body.style.background = savedTheme.bg || "#f5f5f0";
  hofModeToggle.checked = true;
} else {
  document.body.style.background = savedTheme?.bg || "#0f0f11";
}

hofModeToggle.addEventListener("change", () => {
  const isLight = hofModeToggle.checked;
  document.body.classList.toggle("light", isLight);
  document.body.style.background = isLight ? (savedTheme?.bg || "#f5f5f0") : (savedTheme?.bg || "#0f0f11");
  try {
    const theme = JSON.parse(localStorage.getItem("ct-theme")) || {};
    theme.mode = isLight ? "light" : "dark";
    if (isLight && !theme.bg) theme.bg = "#f5f5f0";
    if (!isLight && !theme.bg) theme.bg = "#0f0f11";
    localStorage.setItem("ct-theme", JSON.stringify(theme));
  } catch {}
});

// ── Month helpers ──────────────────────────────────
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthName(key) {
  if (!key) return new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const [year, month] = key.split("-");
  return new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function isLastDayOfMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() === lastDay;
}

function isAfterNoon() {
  return new Date().getHours() >= 12;
}

// ── Popup show logic ───────────────────────────────
function shouldShowPopup() {
  const key = `ct-motm-popup-${getCurrentMonthKey()}`;
  return isLastDayOfMonth() && isAfterNoon() && !localStorage.getItem(key);
}

function markPopupSeen() {
  localStorage.setItem(`ct-motm-popup-${getCurrentMonthKey()}`, "1");
}

// ── Voted tracking ─────────────────────────────────
function getVotedKey(nomId) {
  return `ct-voted-${getCurrentMonthKey()}-${nomId}`;
}
function hasVoted(nomId) {
  return localStorage.getItem(getVotedKey(nomId)) === "1";
}
function markVoted(nomId) {
  localStorage.setItem(getVotedKey(nomId), "1");
}
function unmarkVoted(nomId) {
  localStorage.removeItem(getVotedKey(nomId));
}

// ── Vote handler ───────────────────────────────────
function wireVoteBtn(btn, nomId, votesEl, unvoteBtn) {
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "✓ Voted";
    btn.classList.add("voted");
    await updateDoc(doc(db, "nominations", nomId), { votes: increment(1) });
    const current = parseInt(votesEl.textContent) || 0;
    votesEl.textContent = `${current + 1} 👍`;
    markVoted(nomId);
    if (unvoteBtn) unvoteBtn.classList.add("visible");
  });
}

// ── Unvote handler ─────────────────────────────────
async function handleUnvote(nomId, item, votesEl, voteBtn, unvoteBtn) {
  if (item.dataset.processing === "true") return;
  item.dataset.processing = "true";

  const confirmed = confirm("Are you sure you want to remove your vote?");
  if (!confirmed) {
    item.dataset.processing = "false";
    return;
  }

  const current = parseInt(votesEl.textContent) || 0;
  const newCount = Math.max(0, current - 1);

  await updateDoc(doc(db, "nominations", nomId), { votes: increment(-1) });
  unmarkVoted(nomId);

  if (newCount === 0) {
    // Delete the nomination entirely from Firestore
    await deleteDoc(doc(db, "nominations", nomId));
    const card = item.closest(".category-card");
    item.remove();
    if (card) {
      const remaining = card.querySelectorAll(".nom-item").length;
      const countEl = card.querySelector(".nom-count");
      if (countEl) countEl.textContent = `${remaining} nomination${remaining !== 1 ? "s" : ""}`;
    }
  } else {
    votesEl.textContent = `${newCount} 👍`;
    voteBtn.disabled = false;
    voteBtn.textContent = "👍 Vote";
    voteBtn.classList.remove("voted");
    if (!isAdmin) unvoteBtn.classList.remove("visible");
    item.dataset.processing = "false";
  }
}

// ── Load everything ────────────────────────────────
async function loadAll() {
  const monthKey = getCurrentMonthKey();
  monthLabel.textContent = `Voting for ${getMonthName()}`;

  const q = query(collection(db, "nominations"), where("monthKey", "==", monthKey));
  const snapshot = await getDocs(q);
  const noms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const winnersSnap = await getDocs(collection(db, "motmWinners"));
  const winners = winnersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderMotm(noms);
  renderMoty(winners);
  renderCategories(noms);

  if (shouldShowPopup()) {
    const motmNoms = noms
      .filter(n => n.category === "meme-month")
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));
    showMotmPopup(motmNoms);
  }

  if (isLastDayOfMonth() && isAfterNoon()) {
    await autoPickWinner(noms, monthKey);
  }
}

// ── Render Meme of the Month ───────────────────────
function renderMotm(noms) {
  const motmNoms = noms
    .filter(n => n.category === "meme-month")
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  if (motmNoms.length === 0) {
    motmList.innerHTML = `<p class="empty-section">No nominees yet — go nominate a video!</p>`;
    return;
  }

  motmList.innerHTML = motmNoms.map((nom, i) => {
    const voted = hasVoted(nom.id);
    return `
      <div class="motm-item" data-id="${nom.id}">
        <span class="motm-rank">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
        <span class="motm-title">${escapeHtml(nom.videoName)}</span>
        <span class="motm-votes">${nom.votes || 0} 👍</span>
        <button class="motm-vote-btn ${voted ? "voted" : ""}" data-nom-id="${nom.id}" ${voted ? "disabled" : ""}>
          ${voted ? "✓ Voted" : "👍 Vote"}
        </button>
        <button class="motm-unvote-btn ${voted || isAdmin ? "visible" : ""}" data-nom-id="${nom.id}">✕</button>
      </div>
    `;
  }).join("");

  motmList.querySelectorAll(".motm-item").forEach(item => {
    const nomId = item.dataset.id;
    const voteBtn = item.querySelector(".motm-vote-btn");
    const unvoteBtn = item.querySelector(".motm-unvote-btn");
    const votesEl = item.querySelector(".motm-votes");
    wireVoteBtn(voteBtn, nomId, votesEl, unvoteBtn);
    unvoteBtn.addEventListener("click", () => handleUnvote(nomId, item, votesEl, voteBtn, unvoteBtn));
  });
}

// ── Render Meme of the Year ────────────────────────
function renderMoty(winners) {
  if (winners.length === 0) {
    motyList.innerHTML = `<p class="empty-section">No monthly winners yet — check back at the end of the month!</p>`;
    return;
  }
  motyList.innerHTML = winners
    .sort((a, b) => a.monthKey > b.monthKey ? -1 : 1)
    .map(w => `
      <div class="moty-item">
        <span class="moty-month">${getMonthName(w.monthKey)}</span>
        <span class="moty-title">${escapeHtml(w.videoName)}</span>
        <span class="moty-votes">${w.votes || 0} votes</span>
      </div>
    `).join("");
}

// ── Auto pick winner ───────────────────────────────
async function autoPickWinner(noms, monthKey) {
  const existingWinner = await getDocs(
    query(collection(db, "motmWinners"), where("monthKey", "==", monthKey))
  );
  if (!existingWinner.empty) return;

  const motmNoms = noms
    .filter(n => n.category === "meme-month")
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  if (motmNoms.length === 0) return;

  const winner = motmNoms[0];
  await setDoc(doc(db, "motmWinners", monthKey), {
    videoId:   winner.videoId,
    videoName: winner.videoName,
    votes:     winner.votes || 0,
    monthKey,
    createdAt: serverTimestamp()
  });
}

// ── End of Month Popup ─────────────────────────────
function showMotmPopup(motmNoms) {
  if (motmNoms.length === 0) return;

  popupNomList.innerHTML = motmNoms.map(nom => {
    const voted = hasVoted(nom.id);
    return `
      <div class="popup-nom-item" data-id="${nom.id}">
        <span class="popup-nom-title">${escapeHtml(nom.videoName)}</span>
        <span class="popup-nom-votes">${nom.votes || 0} 👍</span>
        <button class="popup-vote-btn ${voted ? "voted" : ""}" data-nom-id="${nom.id}" ${voted ? "disabled" : ""}>
          ${voted ? "✓ Voted" : "👍 Vote"}
        </button>
      </div>
    `;
  }).join("");

  popupNomList.querySelectorAll(".popup-vote-btn:not(:disabled)").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nomId = btn.dataset.nomId;
      btn.disabled = true;
      btn.textContent = "✓ Voted";
      btn.classList.add("voted");
      await updateDoc(doc(db, "nominations", nomId), { votes: increment(1) });
      const votesEl = btn.closest(".popup-nom-item").querySelector(".popup-nom-votes");
      votesEl.textContent = `${(parseInt(votesEl.textContent) || 0) + 1} 👍`;
      markVoted(nomId);
    });
  });

  motmPopup.classList.remove("hidden");
}

popupClose.addEventListener("click", () => {
  motmPopup.classList.add("hidden");
  markPopupSeen();
});

// ── Render All Categories ──────────────────────────
function renderCategories(noms) {
  grid.innerHTML = "";

  CATEGORIES.forEach(cat => {
    const catNoms = noms
      .filter(n => n.category === cat.id)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));

    const card = document.createElement("div");
    card.className = "category-card";

    const nominationsHtml = catNoms.length === 0
      ? `<p class="empty-category">No nominations yet!</p>`
      : catNoms.map(nom => {
          const voted = hasVoted(nom.id);
          return `
            <div class="nom-item" data-id="${nom.id}">
              <div class="nom-footer">
                <span class="nom-title">${escapeHtml(nom.videoName)}</span>
                <span class="vote-count">${nom.votes || 0} 👍</span>
                <button class="vote-btn ${voted ? "voted" : ""}" data-nom-id="${nom.id}" ${voted ? "disabled" : ""}>
                  ${voted ? "✓ Voted" : "👍 Vote"}
                </button>
                <button class="unvote-btn ${voted || isAdmin ? "visible" : ""}" data-nom-id="${nom.id}">✕</button>
              </div>
            </div>
          `;
        }).join("");

    card.innerHTML = `
      <div class="category-header">
        <h2>${cat.label}</h2>
        <p class="nom-count">${catNoms.length} nomination${catNoms.length !== 1 ? "s" : ""}</p>
      </div>
      <div class="nominations-list">${nominationsHtml}</div>
    `;

    card.querySelectorAll(".nom-item").forEach(item => {
      const nomId = item.dataset.id;
      const voteBtn = item.querySelector(".vote-btn");
      const unvoteBtn = item.querySelector(".unvote-btn");
      const countEl = item.querySelector(".vote-count");
      wireVoteBtn(voteBtn, nomId, countEl, unvoteBtn);
      unvoteBtn.addEventListener("click", () => handleUnvote(nomId, item, countEl, voteBtn, unvoteBtn));
    });

    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

loadAll();
