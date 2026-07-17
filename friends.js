import { db } from "./firebase.js";

import {
  collection, getDocs, doc, setDoc, deleteDoc,
  query, where, serverTimestamp, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Get current user ───────────────────────────────
const prefs = (() => {
  try { return JSON.parse(localStorage.getItem("ct-prefs")) || {}; } catch { return {}; }
})();

const myName   = prefs.displayName || "Anonymous";
const myAvatar = prefs.avatar || "🎭";

document.getElementById("userLabel").textContent = `Logged in as: ${myName}`;

// ── Elements ───────────────────────────────────────
const friendSearchInput = document.getElementById("friendSearchInput");
const sendRequestBtn    = document.getElementById("sendRequestBtn");
const requestStatus     = document.getElementById("requestStatus");
const pendingList       = document.getElementById("pendingList");
const friendsList       = document.getElementById("friendsList");

// ── Status helper ──────────────────────────────────
function setStatus(msg, type = "") {
  requestStatus.textContent = msg;
  requestStatus.className   = `request-status ${type}`;
}

// ── Send friend request ────────────────────────────
sendRequestBtn.addEventListener("click", async () => {
  const targetName = friendSearchInput.value.trim();
  if (!targetName) { setStatus("Enter a display name!", "error"); return; }
  if (targetName === myName) { setStatus("You can't add yourself!", "error"); return; }

  // Check if already friends
  const friendRef = doc(db, "friends", `${myName}_${targetName}`);
  const friendSnap = await getDoc(friendRef);
  if (friendSnap.exists()) { setStatus("You're already friends!", "error"); return; }

  // Check if request already sent
  const reqRef = doc(db, "friendRequests", `${myName}_${targetName}`);
  const reqSnap = await getDoc(reqRef);
  if (reqSnap.exists()) { setStatus("Request already sent!", "error"); return; }

  // Check if target user exists (has uploaded a video or has a profile)
  const profileSnap = await getDoc(doc(db, "userProfiles", targetName));
  const videosSnap  = await getDocs(query(collection(db, "videos"), where("displayName", "==", targetName)));
  if (!profileSnap.exists() && videosSnap.empty) {
    setStatus("User not found!", "error");
    return;
  }

  // Send request
  await setDoc(reqRef, {
    from:      myName,
    fromAvatar: myAvatar,
    to:        targetName,
    status:    "pending",
    createdAt: serverTimestamp()
  });

  friendSearchInput.value = "";
  setStatus(`Friend request sent to ${targetName}! ✓`, "success");
});

// ── Load pending requests ──────────────────────────
async function loadPending() {
  const q = query(
    collection(db, "friendRequests"),
    where("to", "==", myName),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (requests.length === 0) {
    pendingList.innerHTML = `<p class="empty-msg">No pending requests!</p>`;
    return;
  }

  pendingList.innerHTML = requests.map(r => `
    <div class="friend-item" data-id="${r.id}" data-from="${r.from}">
      <div class="friend-avatar">${r.fromAvatar || "🎭"}</div>
      <div class="friend-info">
        <p class="friend-name">${r.from}</p>
        <p class="friend-meta">Wants to be your friend</p>
      </div>
      <div class="friend-actions">
        <button class="accept-btn">✓ Accept</button>
        <button class="deny-btn">✕ Deny</button>
      </div>
    </div>
  `).join("");

  pendingList.querySelectorAll(".friend-item").forEach(item => {
    const reqId   = item.dataset.id;
    const fromName = item.dataset.from;

    item.querySelector(".accept-btn").addEventListener("click", async () => {
      // Add friendship both ways
      await setDoc(doc(db, "friends", `${myName}_${fromName}`), {
        user1: myName, user2: fromName, createdAt: serverTimestamp()
      });
      await setDoc(doc(db, "friends", `${fromName}_${myName}`), {
        user1: fromName, user2: myName, createdAt: serverTimestamp()
      });
      // Delete request
      await deleteDoc(doc(db, "friendRequests", reqId));
      item.remove();
      if (pendingList.querySelectorAll(".friend-item").length === 0) {
        pendingList.innerHTML = `<p class="empty-msg">No pending requests!</p>`;
      }
      loadFriends();
    });

    item.querySelector(".deny-btn").addEventListener("click", async () => {
      await deleteDoc(doc(db, "friendRequests", reqId));
      item.remove();
      if (pendingList.querySelectorAll(".friend-item").length === 0) {
        pendingList.innerHTML = `<p class="empty-msg">No pending requests!</p>`;
      }
    });
  });
}

// ── Custom titles ──────────────────────────────────
function getCustomTitle(friendName) {
  return localStorage.getItem(`ct-title-${friendName}`) || "";
}

function setCustomTitle(friendName, title) {
  if (title) {
    localStorage.setItem(`ct-title-${friendName}`, title);
  } else {
    localStorage.removeItem(`ct-title-${friendName}`);
  }
}

// ── Load friends ───────────────────────────────────
async function loadFriends() {
  const q = query(
    collection(db, "friends"),
    where("user1", "==", myName)
  );
  const snap = await getDocs(q);
  const friends = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (friends.length === 0) {
    friendsList.innerHTML = `<p class="empty-msg">No friends yet — send a request!</p>`;
    return;
  }

  // Get avatars from userProfiles
  friendsList.innerHTML = "";
  for (const f of friends) {
    const friendName = f.user2;
    const profileSnap = await getDoc(doc(db, "userProfiles", friendName));
    const avatar = profileSnap.exists() ? profileSnap.data().avatar || "🎭" : "🎭";

    const item = document.createElement("div");
    item.className = "friend-item";
    const customTitle = getCustomTitle(friendName);
    item.innerHTML = `
      <div class="friend-avatar">${avatar}</div>
      <div class="friend-info">
        <p class="friend-name">${friendName}</p>
        <p class="friend-meta">${customTitle ? `🎖️ ${customTitle}` : "Friend"}</p>
      </div>
      <div class="friend-actions">
        <button class="title-btn" data-friend="${friendName}" title="Set custom title">✏️</button>
        <a href="channel.html?name=${encodeURIComponent(friendName)}" class="view-channel-btn">View Channel</a>
        <button class="remove-btn" data-id="${f.id}" data-friend="${friendName}">Remove</button>
      </div>
    `;

    item.querySelector(".remove-btn").addEventListener("click", async () => {
      const friendName2 = item.querySelector(".remove-btn").dataset.friend;
      if (!confirm(`Remove ${friendName2} as a friend?`)) return;
      await deleteDoc(doc(db, "friends", `${myName}_${friendName2}`));
      await deleteDoc(doc(db, "friends", `${friendName2}_${myName}`));
      item.remove();
      if (friendsList.querySelectorAll(".friend-item").length === 0) {
        friendsList.innerHTML = `<p class="empty-msg">No friends yet — send a request!</p>`;
      }
    });

    item.querySelector(".title-btn").addEventListener("click", () => {
      const current = getCustomTitle(friendName);
      const newTitle = prompt(`Set a custom title for ${friendName}:`, current);
      if (newTitle === null) return; // cancelled
      setCustomTitle(friendName, newTitle.trim());
      item.querySelector(".friend-meta").textContent = newTitle.trim()
        ? `🎖️ ${newTitle.trim()}`
        : "Friend";
    });

    friendsList.appendChild(item);
  }
}

// ── Boot ───────────────────────────────────────────
loadPending();
loadFriends();

// ── Challenges ─────────────────────────────────────
const CHALLENGE_TYPES = {
  hearts:   "❤️ Heart Challenge",
  theme:    "🎭 Theme Challenge",
  rating:   "⭐ Rating Challenge",
  trending: "🔥 Trending Challenge",
  title:    "🏆 Best Title Challenge",
};

const challengeTypeSelect   = document.getElementById("challengeType");
const challengeFriendSelect = document.getElementById("challengeFriend");
const challengeDeadline     = document.getElementById("challengeDeadline");
const sendChallengeBtn      = document.getElementById("sendChallengeBtn");
const challengeStatus       = document.getElementById("challengeStatus");
const themeInputWrap        = document.getElementById("themeInputWrap");
const themeInput            = document.getElementById("themeInput");
const challengesList        = document.getElementById("challengesList");

// Show theme input only for theme challenge
challengeTypeSelect.addEventListener("change", () => {
  themeInputWrap.classList.toggle("hidden", challengeTypeSelect.value !== "theme");
});

// Populate friends dropdown
async function populateChallengeFriends() {
  const snap = await getDocs(query(
    collection(db, "friends"),
    where("user1", "==", myName)
  ));
  snap.docs.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.data().user2;
    opt.textContent = d.data().user2;
    challengeFriendSelect.appendChild(opt);
  });
}

// Send challenge
sendChallengeBtn.addEventListener("click", async () => {
  const target   = challengeFriendSelect.value;
  const type     = challengeTypeSelect.value;
  const deadline = challengeDeadline.value;
  const theme    = themeInput.value.trim();

  if (!target) { challengeStatus.textContent = "Select a friend!"; challengeStatus.className = "request-status error"; return; }
  if (!deadline) { challengeStatus.textContent = "Set a deadline!"; challengeStatus.className = "request-status error"; return; }
  if (type === "theme" && !theme) { challengeStatus.textContent = "Enter a theme!"; challengeStatus.className = "request-status error"; return; }

  const challengeId = `${myName}_${target}_${Date.now()}`;
  await setDoc(doc(db, "challenges", challengeId), {
    from:      myName,
    to:        target,
    type,
    theme:     theme || null,
    deadline:  new Date(deadline).toISOString(),
    status:    "pending",
    createdAt: serverTimestamp()
  });

  challengeStatus.textContent = `Challenge sent to ${target}! ⚔️`;
  challengeStatus.className = "request-status success";
  challengeDeadline.value = "";
  themeInput.value = "";
  loadChallenges();
});

// Load challenges
async function loadChallenges() {
  const [sentSnap, receivedSnap] = await Promise.all([
    getDocs(query(collection(db, "challenges"), where("from", "==", myName))),
    getDocs(query(collection(db, "challenges"), where("to", "==", myName)))
  ]);

  const challenges = [
    ...sentSnap.docs.map(d => ({ id: d.id, ...d.data(), direction: "sent" })),
    ...receivedSnap.docs.map(d => ({ id: d.id, ...d.data(), direction: "received" }))
  ].sort((a, b) => new Date(b.deadline) - new Date(a.deadline));

  if (challenges.length === 0) {
    challengesList.innerHTML = `<p class="empty-msg">No challenges yet — challenge a friend!</p>`;
    return;
  }

  challengesList.innerHTML = "";

  challenges.forEach(ch => {
    const isIncoming = ch.direction === "received" && ch.status === "pending";
    const deadline   = new Date(ch.deadline);
    const expired    = deadline < new Date();
    const opponent   = ch.direction === "sent" ? ch.to : ch.from;

    const item = document.createElement("div");
    item.className = `challenge-item ${isIncoming ? "incoming" : ""}`;

    const statusBadge = ch.status === "pending"
      ? `<span class="challenge-status-badge pending">⏳ Pending</span>`
      : ch.status === "accepted"
        ? `<span class="challenge-status-badge active">⚔️ Active</span>`
        : `<span class="challenge-status-badge completed">🏆 Done</span>`;

    item.innerHTML = `
      <div class="challenge-top">
        <span class="challenge-type">${CHALLENGE_TYPES[ch.type]}</span>
        ${statusBadge}
      </div>
      <p class="challenge-vs">vs ${opponent}</p>
      ${ch.theme ? `<p class="challenge-theme">Theme: "${ch.theme}"</p>` : ""}
      <p class="challenge-deadline">${expired ? "⌛ Ended" : "⏰ Ends"}: ${deadline.toLocaleString()}</p>
    ${isIncoming ? `
        <div class="challenge-actions">
          <button class="accept-challenge-btn" data-id="${ch.id}">✓ Accept</button>
          <button class="decline-challenge-btn" data-id="${ch.id}">✕ Decline</button>
        </div>
      ` : ch.direction === "sent" ? `
        <div class="challenge-actions">
          <button class="cancel-challenge-btn" data-id="${ch.id}">✕ Cancel</button>
        </div>
      ` : ""}
    `;
    if (isIncoming) {
      item.querySelector(".accept-challenge-btn").addEventListener("click", async () => {
        await updateDoc(doc(db, "challenges", ch.id), { status: "accepted" });
        loadChallenges();
      });
      item.querySelector(".decline-challenge-btn").addEventListener("click", async () => {
        await deleteDoc(doc(db, "challenges", ch.id));
        loadChallenges();
      });
    }

    const cancelBtn = item.querySelector(".cancel-challenge-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", async () => {
        if (!confirm("Cancel this challenge?")) return;
        await deleteDoc(doc(db, "challenges", ch.id));
        loadChallenges();
      });
    }

    challengesList.appendChild(item);
  });
}

populateChallengeFriends();
loadChallenges();
