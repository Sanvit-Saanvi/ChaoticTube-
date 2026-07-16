import { db } from "./firebase.js";

import {
  collection, getDocs, query, orderBy, deleteDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Get channel name from URL ──────────────────────
const params      = new URLSearchParams(window.location.search);
const channelName = params.get("name") || "Anonymous";

// ── Elements ───────────────────────────────────────
const channelAvatar = document.getElementById("channelAvatar");
const channelNameEl = document.getElementById("channelName");
const channelStats  = document.getElementById("channelStats");
const channelFeed   = document.getElementById("channelFeed");
const videoCount    = document.getElementById("videoCount");
const emptyState    = document.getElementById("emptyState");

// ── Set page title ─────────────────────────────────
document.title = `${channelName} — ChaoticTube`;
channelNameEl.textContent = channelName;

// ── Load channel videos ────────────────────────────
async function loadChannel() {
  try {
    const q        = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const allVideos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by display name
    const videos = allVideos.filter(v =>
      (v.displayName || "Anonymous") === channelName
    );

    // Set avatar from first video
    if (videos.length > 0 && videos[0].avatar) {
      channelAvatar.textContent = videos[0].avatar;
    }

    // Get profile color from Firestore
    const profileSnap = await getDoc(doc(db, "userProfiles", channelName));
    const profileColor = profileSnap.exists()
      ? profileSnap.data().profileColor || "#7c6af7"
      : (videos.length > 0 && videos[0].profileColor ? videos[0].profileColor : "#7c6af7");

    document.querySelector(".channel-hero").style.background =
      `linear-gradient(135deg, ${profileColor}66, var(--surface))`;
    channelAvatar.style.border = `3px solid ${profileColor}`;

    channelStats.textContent  = `${videos.length} video${videos.length !== 1 ? "s" : ""}`;
    videoCount.textContent    = `${videos.length} video${videos.length !== 1 ? "s" : ""}`;

    channelFeed.innerHTML = "";
    emptyState.classList.toggle("hidden", videos.length > 0);

    videos.forEach(video => {
      const card = document.createElement("div");
      card.className = "video-card";

      const mediaHtml = video.type === "youtube"
        ? `<iframe src="https://www.youtube.com/embed/${video.youtubeId}" allowfullscreen></iframe>`
        : `<video controls preload="metadata"><source src="${video.url}" type="video/mp4"></video>`;

      card.innerHTML = `
        ${mediaHtml}
        <div class="card-body">
          <p class="card-title">${escapeHtml(video.name)}</p>
        </div>
        <div class="card-footer">
          <button class="delete-btn">Delete</button>
        </div>
      `;

      card.querySelector(".delete-btn").addEventListener("click", async () => {
        const enteredPassword = prompt(`Enter admin password to delete "${video.name}":`);
        if (!enteredPassword) return;
        if (enteredPassword !== "1357") {
          alert("Wrong password!");
          return;
        }
        await deleteDoc(doc(db, "videos", video.id));
        card.remove();
        const remaining = channelFeed.querySelectorAll(".video-card").length;
        channelStats.textContent = `${remaining} video${remaining !== 1 ? "s" : ""}`;
        videoCount.textContent   = `${remaining} video${remaining !== 1 ? "s" : ""}`;
      });

      channelFeed.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    channelFeed.innerHTML = "";
    channelStats.textContent = "Failed to load channel";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

loadChannel();
