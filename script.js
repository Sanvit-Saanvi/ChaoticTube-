const uploadBtn = document.getElementById("uploadBtn");
const videoInput = document.getElementById("videoInput");
const status = document.getElementById("status");
const feed = document.getElementById("videoFeed");
const titleInput = document.getElementById("titleInput");
const searchInput = document.getElementById("searchInput");

const CLOUD_NAME = "uuw9obun";
const UPLOAD_PRESET = "ChaoticTube";

// Get saved videos from localStorage
function getVideos() {
  return JSON.parse(localStorage.getItem("videos")) || [];
}

// Save a new video to localStorage
function saveVideo(video) {
  const videos = getVideos();
  videos.push(video);
  localStorage.setItem("videos", JSON.stringify(videos));
}

function deleteVideo(videoUrl) {
  let videos = getVideos();

  videos = videos.filter(video => video.url !== videoUrl);

  localStorage.setItem("videos", JSON.stringify(videos));
}

function displayVideo(video) {
  const card = document.createElement("div");

  card.innerHTML = `
    <h3>${video.name}</h3>

    <video controls>
      <source src="${video.url}" type="video/mp4">
    </video>

    <button class="deleteBtn">Delete</button>

    <hr>
  `;

  const deleteBtn = card.querySelector(".deleteBtn");

  deleteBtn.addEventListener("click", () => {
  const confirmed = confirm("Are you sure you want to delete this video?");

  if (confirmed) {
    deleteVideo(video.url);
    card.remove();
  }
});

  feed.prepend(card);
}

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

const randomVideos = shuffleArray(getVideos());

randomVideos.forEach(video => {
  displayVideo(video);
});

// Upload button
uploadBtn.addEventListener("click", async () => {
  const file = videoInput.files[0];

  if (!file) {
  alert("Choose a video first!");
  return;
}

if (!titleInput.value.trim()) {
  alert("Please enter a video title!");
  return;
}

 status.textContent = "Uploading... Please wait";
console.log("Upload started");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    console.log("Sending upload...");

const response = await fetch(
  `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
  {
    method: "POST",
    body: formData
  }
);

console.log("Cloudinary responded:", response.status);

    const data = await response.json();

    console.log(data);

    if (!response.ok) {
      throw new Error(data.error.message);
    }

    status.textContent = "Upload successful!";

  const video = {
    name: titleInput.value,
    url: data.secure_url
  }; 

    saveVideo(video);
    displayVideo(video);
    titleInput.value = "";

  } catch (err) {
    console.error(err);
    status.textContent = "Error: " + err.message;
  }
});

function searchVideos() {
  const searchText = searchInput.value.toLowerCase();

  feed.innerHTML = "";

  const videos = getVideos();

  const filteredVideos = videos.filter(video =>
    video.name.toLowerCase().includes(searchText)
  );

  filteredVideos.forEach(video => {
    displayVideo(video);
  });
};

searchInput.addEventListener("input", searchVideos);