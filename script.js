import { db } from "./firebase.js";

import {
  collection, addDoc, getDocs, deleteDoc, doc,
  serverTimestamp, query, orderBy, setDoc, updateDoc, increment, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Cloudinary config ──────────────────────────────
const CLOUD_NAME    = "uuw9obun";
const UPLOAD_PRESET = "ChaoticTube";

// ── Admin password ─────────────────────────────────
const ADMIN_PASSWORD = "1357";

// ── Elements ───────────────────────────────────────
const uploadBtn         = document.getElementById("uploadBtn");
const uploadBtnText     = document.getElementById("uploadBtnText");
const uploadSpinner     = document.getElementById("uploadSpinner");
const videoInput        = document.getElementById("videoInput");
const titleInput        = document.getElementById("titleInput");
const searchInput       = document.getElementById("searchInput");
const status            = document.getElementById("status");
const feed              = document.getElementById("videoFeed");
const feedTitle         = document.getElementById("feedTitle");
const feedCount         = document.getElementById("feedCount");
const emptyState        = document.getElementById("emptyState");
const dropZone          = document.getElementById("dropZone");
const fileNameDisplay   = document.getElementById("fileNameDisplay");
const youtubeBtn        = document.getElementById("youtubeBtn");
const youtubeBtnText    = document.getElementById("youtubeBtnText");
const youtubeSpinner    = document.getElementById("youtubeSpinner");
const youtubeUrl        = document.getElementById("youtubeUrl");
const youtubeTitleInput = document.getElementById("youtubeTitleInput");
const tabFile           = document.getElementById("tabFile");
const tabYoutube        = document.getElementById("tabYoutube");
const nominateModal     = document.getElementById("nominateModal");
const nominateVideoTitle = document.getElementById("nominateVideoTitle");
const modalClose        = document.getElementById("modalClose");

// ── State ──────────────────────────────────────────
let allVideos = [];
let nominatingVideo = null;

// ── Make sure modal is closed on load ─────────────
nominateModal.classList.add("hidden");

// ── Get user prefs ─────────────────────────────────
function getPrefs() {
  try { return JSON.parse(localStorage.getItem("ct-prefs")) || {}; } catch { return {}; }
}

// ── Tabs ───────────────────────────────────────────
document.querySelectorAll(".upload-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".upload-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    if (tab.dataset.tab === "file") {
      tabFile.classList.remove("hidden");
      tabYoutube.classList.add("hidden");
    } else if (tab.dataset.tab === "youtube") {
      tabFile.classList.add("hidden");
      tabYoutube.classList.remove("hidden");
    }
    setStatus("");
  });
});

// ── Drag-and-drop ──────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("video/")) {
    videoInput.files = e.dataTransfer.files;
    onFileSelected(file);
  }
});
videoInput.addEventListener("change", () => {
  if (videoInput.files[0]) onFileSelected(videoInput.files[0]);
});
function onFileSelected(file) {
  fileNameDisplay.textContent = `Selected: ${file.name}`;
  checkUploadReady();
}
titleInput.addEventListener("input", checkUploadReady);
function checkUploadReady() {
  const hasFile  = videoInput.files && videoInput.files[0];
  const hasTitle = titleInput.value.trim().length > 0;
  uploadBtn.disabled = !(hasFile && hasTitle);
}

// ── YouTube ready check ────────────────────────────
youtubeUrl.addEventListener("input", checkYoutubeReady);
youtubeTitleInput.addEventListener("input", checkYoutubeReady);
function checkYoutubeReady() {
  const hasUrl   = extractYoutubeId(youtubeUrl.value.trim()) !== null;
  const hasTitle = youtubeTitleInput.value.trim().length > 0;
  youtubeBtn.disabled = !(hasUrl && hasTitle);
}
function extractYoutubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ── Status helper ──────────────────────────────────
function setStatus(msg, type = "") {
  status.textContent = msg;
  status.className = "status-msg " + type;
}

// ── Simple hash ────────────────────────────────────
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── File Upload ────────────────────────────────────
uploadBtn.addEventListener("click", async () => {
  const file  = videoInput.files[0];
  const title = titleInput.value.trim();
  if (!file || !title) return;

  const duplicate = allVideos.find(v => v.name.toLowerCase() === title.toLowerCase());
  if (duplicate) {
    setStatus("A video with this title already exists!", "error");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtnText.textContent = "Uploading…";
  uploadSpinner.classList.remove("hidden");
  setStatus("Uploading to Cloudinary…");
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    if (!data.secure_url) throw new Error("No URL returned from Cloudinary");
    setStatus("Saving to database…");
    const prefs = getPrefs();
    const passwordHash = prefs.creatorPassword
      ? await hashPassword(prefs.creatorPassword)
      : "";
    const docRef = await addDoc(collection(db, "videos"), {
      name:                title,
      url:                 data.secure_url,
      publicId:            data.public_id,
      type:                "file",
      createdAt:           serverTimestamp(),
      displayName:         prefs.displayName || "Anonymous",
      avatar:              prefs.avatar || "🎭",
      hearts:              0,
      creatorPasswordHash: passwordHash,
      profileColor:        prefs.profileColor || "#7c6af7",
    });
    const newVideo = {
      id: docRef.id, name: title, url: data.secure_url,
      type: "file",
      displayName: prefs.displayName || "Anonymous",
      avatar: prefs.avatar || "🎭",
      hearts: 0,
      creatorPasswordHash: passwordHash,
      profileColor: prefs.profileColor || "#7c6af7",
    };
    allVideos.unshift(newVideo);
    renderFeed(allVideos);
    setStatus("Video uploaded successfully!", "success");
    titleInput.value = "";
    videoInput.value = "";
    fileNameDisplay.textContent = "MP4, MOV, WebM";
  } catch (err) {
    console.error(err);
    setStatus("Upload failed: " + err.message, "error");
  } finally {
    uploadBtnText.textContent = "Upload";
    uploadSpinner.classList.add("hidden");
    checkUploadReady();
  }
});

// ── YouTube Add ────────────────────────────────────
youtubeBtn.addEventListener("click", async () => {
  const url     = youtubeUrl.value.trim();
  const title   = youtubeTitleInput.value.trim();
  const videoId = extractYoutubeId(url);
  if (!videoId || !title) return;

  const duplicate = allVideos.find(v => v.name.toLowerCase() === title.toLowerCase());
  if (duplicate) {
    setStatus("A video with this title already exists!", "error");
    return;
  }

  const dupYoutube = allVideos.find(v => v.youtubeId === videoId);
  if (dupYoutube) {
    setStatus("This YouTube video has already been added!", "error");
    return;
  }

  youtubeBtn.disabled = true;
  youtubeBtnText.textContent = "Adding…";
  youtubeSpinner.classList.remove("hidden");
  setStatus("Saving to database…");
  try {
    const prefs = getPrefs();
    const passwordHash = prefs.creatorPassword
      ? await hashPassword(prefs.creatorPassword)
      : "";
    const docRef = await addDoc(collection(db, "videos"), {
      name:                title,
      youtubeId:           videoId,
      type:                "youtube",
      createdAt:           serverTimestamp(),
      displayName:         prefs.displayName || "Anonymous",
      avatar:              prefs.avatar || "🎭",
      hearts:              0,
      creatorPasswordHash: passwordHash,
      profileColor:        prefs.profileColor || "#7c6af7",
    });
    const newVideo = {
      id: docRef.id, name: title, youtubeId: videoId,
      type: "youtube",
      displayName: prefs.displayName || "Anonymous",
      avatar: prefs.avatar || "🎭",
      hearts: 0,
      creatorPasswordHash: passwordHash,
      profileColor: prefs.profileColor || "#7c6af7",
    };
    allVideos.unshift(newVideo);
    renderFeed(allVideos);
    setStatus("Video added successfully!", "success");
    youtubeUrl.value = "";
    youtubeTitleInput.value = "";
  } catch (err) {
    console.error(err);
    setStatus("Failed to add video: " + err.message, "error");
  } finally {
    youtubeBtnText.textContent = "Add Video";
    youtubeSpinner.classList.add("hidden");
    checkYoutubeReady();
  }
});

// ── Nominate Modal ─────────────────────────────────
function openNominateModal(video) {
  nominatingVideo = video;
  nominateVideoTitle.textContent = `"${video.name}"`;
  nominateModal.classList.remove("hidden");
}

function closeNominateModal() {
  nominateModal.classList.add("hidden");
  nominatingVideo = null;
}

modalClose.addEventListener("click", closeNominateModal);

nominateModal.addEventListener("click", (e) => {
  if (e.target === nominateModal) closeNominateModal();
});

document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!nominatingVideo) return;
    const category = btn.dataset.cat;
    const monthKey = getCurrentMonthKey();
    try {
      const nomRef = doc(db, "nominations", `${monthKey}_${category}_${nominatingVideo.id}`);
      await setDoc(nomRef, {
        videoId:     nominatingVideo.id,
        videoName:   nominatingVideo.name,
        youtubeId:   nominatingVideo.youtubeId || null,
        url:         nominatingVideo.url || null,
        type:        nominatingVideo.type,
        category,
        monthKey,
        votes:       0,
        createdAt:   serverTimestamp()
      }, { merge: true });
      closeNominateModal();
      setStatus(`Nominated! Go to Hall of Fame to vote 🏆`, "success");
    } catch (err) {
      console.error(err);
      setStatus("Nomination failed: " + err.message, "error");
    }
  });
});

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Firestore helpers ──────────────────────────────
async function getVideos() {
  const q        = query(collection(db, "videos"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function deleteVideo(id) {
  await deleteDoc(doc(db, "videos", id));
}

// ── Hearts ─────────────────────────────────────────
function isHearted(videoId) {
  return localStorage.getItem(`ct-heart-${videoId}`) === "1";
}

function toggleHeart(videoId) {
  const key = `ct-heart-${videoId}`;
  if (localStorage.getItem(key) === "1") {
    localStorage.removeItem(key);
    return false;
  } else {
    localStorage.setItem(key, "1");
    return true;
  }
}

// ── Watch History ──────────────────────────────────
function getHistory() {
  try { return JSON.parse(localStorage.getItem("ct-history")) || []; } catch { return []; }
}

function addToHistory(video) {
  let history = getHistory();
  history = history.filter(h => h.id !== video.id);
  history.unshift({
    id:          video.id,
    name:        video.name,
    type:        video.type,
    url:         video.url || null,
    youtubeId:   video.youtubeId || null,
    displayName: video.displayName || "Anonymous",
    avatar:      video.avatar || "🎭",
    watchedAt:   new Date().toISOString(),
    progress:    0
  });
  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem("ct-history", JSON.stringify(history));
}

function updateProgress(videoId, progress) {
  const history = getHistory();
  const entry = history.find(h => h.id === videoId);
  if (entry) {
    entry.progress = progress;
    localStorage.setItem("ct-history", JSON.stringify(history));
  }
}

function getProgress(videoId) {
  const history = getHistory();
  const entry = history.find(h => h.id === videoId);
  return entry ? entry.progress : 0;
}

// ── Reactions ──────────────────────────────────────
const REACTIONS = ["😂", "🔥", "💀", "🤯"];

function getMyReaction(videoId) {
  return localStorage.getItem(`ct-reaction-${videoId}`) || null;
}

function setMyReaction(videoId, emoji) {
  if (emoji) {
    localStorage.setItem(`ct-reaction-${videoId}`, emoji);
  } else {
    localStorage.removeItem(`ct-reaction-${videoId}`);
  }
}

// ── Render ─────────────────────────────────────────
function renderFeed(videos) {
  feed.innerHTML = "";

  // Apply layout
  const prefs = getPrefs();
  if (prefs.layout === "list") {
    feed.classList.add("list-layout");
  } else {
    feed.classList.remove("list-layout");
  }

  emptyState.classList.toggle("hidden", videos.length > 0);
  const searchTerm = searchInput.value.trim().toLowerCase();
  feedTitle.textContent = searchTerm ? `Results for "${searchInput.value.trim()}"` : "All Videos";
  feedCount.textContent = `${videos.length} video${videos.length !== 1 ? "s" : ""}`;

  videos.forEach(video => {
    const card = document.createElement("div");
    card.className = "video-card";

    const progress = getProgress(video.id);
    const progressBar = progress > 0 && progress < 95
      ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>`
      : "";

    const pinBadge = video.pinned ? `<div class="pin-badge">📌 Pinned</div>` : "";

    const mediaHtml = video.type === "youtube"
      ? `<div class="video-media-wrap">${pinBadge}<iframe src="https://www.youtube.com/embed/${video.youtubeId}" allowfullscreen></iframe>${progressBar}</div>`
      : `<div class="video-media-wrap">${pinBadge}<video controls preload="metadata"><source src="${video.url}" type="video/mp4"></video>${progressBar}</div>`;

    card.innerHTML = `
      ${mediaHtml}
      <div class="card-body">
        <div class="card-title-row">
          <p class="card-title">${escapeHtml(video.name)}</p>
          <button class="heart-btn ${isHearted(video.id) ? "hearted" : ""}" data-id="${video.id}">
            ${isHearted(video.id) ? "❤️" : "🤍"}
          </button>
        </div>
        <a class="card-uploader" href="channel.html?name=${encodeURIComponent(video.displayName || 'Anonymous')}">
          ${video.avatar || "🎭"} ${escapeHtml(video.displayName || "Anonymous")}
        </a>
        <div class="reactions-row">
          ${REACTIONS.map(emoji => {
            const count = (video.reactions && video.reactions[emoji]) || 0;
            const mine  = getMyReaction(video.id) === emoji;
            return `<button class="reaction-btn ${mine ? "active" : ""}" data-emoji="${emoji}" data-video-id="${video.id}">
              ${emoji} <span class="reaction-count">${count > 0 ? count : ""}</span>
            </button>`;
          }).join("")}
        </div>
      </div>
      <div class="card-footer">
        <button class="nominate-btn">🏆 Nominate</button>
        ${(video.hearts || 0) >= 5 ? `<span class="viewers-fav">⭐ Viewer's Fav</span>` : ""}
        <button class="edit-btn">✏️ Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    card.querySelector(".nominate-btn").addEventListener("click", () => openNominateModal(video));

    card.querySelector(".heart-btn").addEventListener("click", async () => {
      const hearted = toggleHeart(video.id);
      const btn = card.querySelector(".heart-btn");
      btn.textContent = hearted ? "❤️" : "🤍";
      btn.classList.toggle("hearted", hearted);
      await updateDoc(doc(db, "videos", video.id), {
        hearts: increment(hearted ? 1 : -1)
      });
      video.hearts = (video.hearts || 0) + (hearted ? 1 : -1);
      const existingBadge = card.querySelector(".viewers-fav");
      if (video.hearts >= 5 && !existingBadge) {
        const badge = document.createElement("span");
        badge.className = "viewers-fav";
        badge.textContent = "⭐ Viewer's Fav";
        card.querySelector(".card-footer").insertBefore(badge, card.querySelector(".delete-btn"));
      } else if (video.hearts < 5 && existingBadge) {
        existingBadge.remove();
      }
    });

    // Reactions
    card.querySelectorAll(".reaction-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const emoji   = btn.dataset.emoji;
        const videoId = btn.dataset.videoId;
        const current = getMyReaction(videoId);
        const updates = {};

        if (current === emoji) {
          updates[`reactions.${emoji}`] = increment(-1);
          setMyReaction(videoId, null);
          video.reactions = video.reactions || {};
          video.reactions[emoji] = Math.max(0, (video.reactions[emoji] || 0) - 1);
        } else {
          if (current) {
            updates[`reactions.${current}`] = increment(-1);
            video.reactions = video.reactions || {};
            video.reactions[current] = Math.max(0, (video.reactions[current] || 0) - 1);
          }
          updates[`reactions.${emoji}`] = increment(1);
          setMyReaction(videoId, emoji);
          video.reactions = video.reactions || {};
          video.reactions[emoji] = (video.reactions[emoji] || 0) + 1;
        }

        await updateDoc(doc(db, "videos", videoId), updates);

        card.querySelectorAll(".reaction-btn").forEach(b => {
          const e = b.dataset.emoji;
          const count = (video.reactions && video.reactions[e]) || 0;
          b.classList.toggle("active", getMyReaction(videoId) === e);
          b.querySelector(".reaction-count").textContent = count > 0 ? count : "";
        });
      });
    });

    const videoEl = card.querySelector("video");
    if (videoEl) {
      const prefs = getPrefs();
      videoEl.volume = (prefs.volume || 100) / 100;

      if (prefs.autoplay) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              videoEl.play().catch(() => {});
            } else {
              videoEl.pause();
            }
          });
        }, { threshold: 0.7 });
        observer.observe(videoEl);
      }

      videoEl.addEventListener("play", () => addToHistory(video));
      videoEl.addEventListener("timeupdate", () => {
        if (videoEl.duration) {
          const pct = (videoEl.currentTime / videoEl.duration) * 100;
          updateProgress(video.id, pct);
          const fill = card.querySelector(".progress-fill");
          if (fill) fill.style.width = `${pct}%`;
        }
      });
      if (progress > 0 && progress < 95) {
        videoEl.addEventListener("loadedmetadata", () => {
          videoEl.currentTime = (progress / 100) * videoEl.duration;
        });
      }
    }

    card.querySelector(".edit-btn").addEventListener("click", async () => {
      const enteredPassword = prompt(`Enter your creator password to edit "${video.name}":`);
      if (!enteredPassword) return;

      if (enteredPassword !== ADMIN_PASSWORD) {
        if (!video.creatorPasswordHash) {
          setStatus("This video has no creator password set. Go to ⚙️ Settings → Personal to set one.", "error");
          return;
        }
        const enteredHash = await hashPassword(enteredPassword);
        if (enteredHash !== video.creatorPasswordHash) {
          setStatus("Wrong password!", "error");
          return;
        }
      }

      const newTitle = prompt("Enter new title:", video.name);
      if (!newTitle || !newTitle.trim()) return;
      if (newTitle.trim() === video.name) return;

      await updateDoc(doc(db, "videos", video.id), { name: newTitle.trim() });
      video.name = newTitle.trim();
      card.querySelector(".card-title").textContent = newTitle.trim();
      setStatus("Title updated!", "success");
    });

    card.querySelector(".delete-btn").addEventListener("click", async () => {
      const enteredPassword = prompt(`Enter your creator password or admin password to delete "${video.name}":`);
      if (!enteredPassword) return;

      if (enteredPassword === ADMIN_PASSWORD) {
        await deleteVideo(video.id);
        allVideos = allVideos.filter(v => v.id !== video.id);
        card.remove();
        feedCount.textContent = `${allVideos.length} video${allVideos.length !== 1 ? "s" : ""}`;
        emptyState.classList.toggle("hidden", allVideos.length > 0);
        return;
      }

      if (!video.creatorPasswordHash) {
        setStatus("This video has no creator password set. Go to ⚙️ Settings → Personal to set one.", "error");
        return;
      }

      const enteredHash = await hashPassword(enteredPassword);
      if (enteredHash !== video.creatorPasswordHash) {
        setStatus("Wrong password!", "error");
        return;
      }

      await deleteVideo(video.id);
      allVideos = allVideos.filter(v => v.id !== video.id);
      card.remove();
      feedCount.textContent = `${allVideos.length} video${allVideos.length !== 1 ? "s" : ""}`;
      emptyState.classList.toggle("hidden", allVideos.length > 0);
    });

    feed.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Search ─────────────────────────────────────────
searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim().toLowerCase();
  const filtered = term ? allVideos.filter(v =>
    v.name.toLowerCase().includes(term) ||
    (v.displayName || "").toLowerCase().includes(term)
  ) : allVideos;
  renderFeed(filtered);

  const channelMatch = allVideos.find(v =>
    (v.displayName || "").toLowerCase() === term
  );

  const existingBanner = document.getElementById("channelBanner");
  if (existingBanner) existingBanner.remove();

  if (channelMatch && term.length > 0) {
    const banner = document.createElement("div");
    banner.id = "channelBanner";
    banner.className = "channel-banner";
    banner.innerHTML = `
      <span>${channelMatch.avatar || "🎭"} <strong>${escapeHtml(channelMatch.displayName)}</strong>'s channel</span>
      <a href="channel.html?name=${encodeURIComponent(channelMatch.displayName)}" class="channel-banner-btn">View Channel →</a>
    `;
    document.querySelector(".feed-header").before(banner);
  }
});

// ── For You ────────────────────────────────────────
async function loadForYou(allVideos) {
  try {
    const prefs = getPrefs();
    const forYouSection = document.getElementById("forYouSection");
    const forYouFeed    = document.getElementById("forYouFeed");
    const forYouCount   = document.getElementById("forYouCount");

    const friendNames = [];
    if (prefs.displayName) {
      const friendsSnap = await getDocs(query(
        collection(db, "friends"),
        where("user1", "==", prefs.displayName)
      ));
      friendsSnap.docs.forEach(d => friendNames.push(d.data().user2));
    }

    const forYouVideos = [];
    const seen = new Set();

    for (const video of allVideos) {
      if (friendNames.includes(video.displayName) && !seen.has(video.id)) {
        forYouVideos.push({ ...video, reason: `📨 Uploaded by ${video.displayName}` });
        seen.add(video.id);
      }
    }

    const popularVideos = [...allVideos]
      .filter(v => !seen.has(v.id))
      .map(v => {
        const reactionCount = Object.values(v.reactions || {}).reduce((a, b) => a + b, 0);
        const score = (v.hearts || 0) + reactionCount;
        return { ...v, score };
      })
      .filter(v => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    for (const video of popularVideos) {
      if (!seen.has(video.id)) {
        forYouVideos.push({ ...video, reason: `🌟 Popular on ChaoticTube` });
        seen.add(video.id);
      }
    }

    if (forYouVideos.length === 0) return;

    forYouSection.classList.remove("hidden");
    forYouCount.textContent = `${forYouVideos.length} video${forYouVideos.length !== 1 ? "s" : ""}`;
    forYouFeed.innerHTML = "";

    forYouVideos.slice(0, 8).forEach(video => {
      const card = document.createElement("div");
      card.className = "video-card";

      const progress = getProgress(video.id);
      const progressBar = progress > 0 && progress < 95
        ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>`
        : "";

      const mediaHtml = video.type === "youtube"
        ? `<div class="video-media-wrap"><iframe src="https://www.youtube.com/embed/${video.youtubeId}" allowfullscreen></iframe>${progressBar}</div>`
        : `<div class="video-media-wrap"><video controls preload="metadata"><source src="${video.url}" type="video/mp4"></video>${progressBar}</div>`;

      card.innerHTML = `
        ${mediaHtml}
        <div class="card-body">
          <div class="card-title-row">
            <p class="card-title">${escapeHtml(video.name)}</p>
          </div>
          <a class="card-uploader" href="channel.html?name=${encodeURIComponent(video.displayName || 'Anonymous')}">
            ${video.avatar || "🎭"} ${escapeHtml(video.displayName || "Anonymous")}
          </a>
          <p class="for-you-reason">${video.reason}</p>
        </div>
      `;

      forYouFeed.appendChild(card);
    });

  } catch (err) {
    console.error(err);
  }
}

// ── Friend upload notifications ────────────────────
async function checkFriendUploads(videos) {
  try {
    const prefs = getPrefs();
    if (!prefs.displayName || !prefs.newVideoNotif) return;

    const friendsSnap = await getDocs(query(
      collection(db, "friends"),
      where("user1", "==", prefs.displayName)
    ));
    const friendNames = friendsSnap.docs.map(d => d.data().user2);
    if (friendNames.length === 0) return;

    const lastChecked = localStorage.getItem("ct-last-notif-check");
    const checkFrom = lastChecked ? new Date(lastChecked) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const newFriendVideos = videos.filter(v => {
      if (!friendNames.includes(v.displayName)) return false;
      if (!v.createdAt?.toDate) return false;
      return v.createdAt.toDate() > checkFrom;
    });

    localStorage.setItem("ct-last-notif-check", new Date().toISOString());
    if (newFriendVideos.length === 0) return;

    showToast(`🎬 ${newFriendVideos[0].displayName} uploaded "${newFriendVideos[0].name}"!`);
  } catch (err) {
    console.error(err);
  }
}

function showToast(message) {
  const existing = document.getElementById("uploadToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "uploadToast";
  toast.className = "upload-toast";
  toast.innerHTML = `
    <span>${message}</span>
    <button id="closeToast">✕</button>
  `;
  document.body.appendChild(toast);

  document.getElementById("closeToast").addEventListener("click", () => toast.remove());
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 6000);
}

// ── Announcement Banner ────────────────────────────
async function checkAnnouncement() {
  try {
    const { doc: d, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const snap = await getDoc(d(db, "settings", "announcement"));
    if (!snap.exists()) return;

    const data = snap.data();

    if (!data.active && data.scheduledFor) {
      const scheduledTime = new Date(data.scheduledFor);
      if (new Date() < scheduledTime) return;
      await updateDoc(d(db, "settings", "announcement"), { active: true });
    }

    if (!data.active) return;

    const existing = document.getElementById("announcementBanner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "announcementBanner";
    banner.className = "announcement-banner";
    banner.innerHTML = `
      <span>📢 ${data.text}</span>
      <button id="closeAnnouncement">✕</button>
    `;
    document.querySelector("header").after(banner);

    document.getElementById("closeAnnouncement").addEventListener("click", () => {
      banner.remove();
    });
  } catch (err) {
    console.error(err);
  }
}

// ── Compress Modal ─────────────────────────────────
const compressBtn        = document.getElementById("compressBtn");
const compressModal      = document.getElementById("compressModal");
const compressModalClose = document.getElementById("compressModalClose");

compressBtn.addEventListener("click", () => {
  compressModal.classList.remove("hidden");
});

compressModalClose.addEventListener("click", () => {
  compressModal.classList.add("hidden");
});

compressModal.addEventListener("click", (e) => {
  if (e.target === compressModal) compressModal.classList.add("hidden");
});

// ── Initial load ───────────────────────────────────
async function loadVideos() {
  try {
    const pinnedSnap = await getDocs(collection(db, "pinned"));
    const pinnedIds  = pinnedSnap.docs.map(d => d.data().videoId);

    allVideos = await getVideos();

    allVideos.sort((a, b) => {
      const aPin = pinnedIds.indexOf(a.id);
      const bPin = pinnedIds.indexOf(b.id);
      if (aPin !== -1 && bPin !== -1) return aPin - bPin;
      if (aPin !== -1) return -1;
      if (bPin !== -1) return 1;
      return 0;
    });

    allVideos = allVideos.map(v => ({
      ...v,
      pinned: pinnedIds.includes(v.id)
    }));

    const prefs = getPrefs();
    const nonPinned = allVideos.filter(v => !v.pinned);
    const pinned    = allVideos.filter(v => v.pinned);

    if (prefs.sort === "oldest") {
      nonPinned.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return aTime - bTime;
      });
    } else if (prefs.sort === "random") {
      for (let i = nonPinned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nonPinned[i], nonPinned[j]] = [nonPinned[j], nonPinned[i]];
      }
    }

    allVideos = [...pinned, ...nonPinned];

    renderFeed(allVideos);
    checkAnnouncement();
    checkFriendUploads(allVideos);
    loadForYou(allVideos);
  } catch (err) {
    feed.innerHTML = "";
    setStatus("Failed to load videos: " + err.message, "error");
  }
}

// ── Force fresh load when coming back to page ──────
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    window.location.reload();
  }
});

loadVideos();
