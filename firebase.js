import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1ZW-fvKAEz3pfyllQcwpE1brECsAMDd0",
  authDomain: "chaotictube-53940.firebaseapp.com",
  projectId: "chaotictube-53940",
  storageBucket: "chaotictube-53940.firebasestorage.app",
  messagingSenderId: "955507583562",
  appId: "1:955507583562:web:08ba775141deec0a7394b3",
  measurementId: "G-4QR75WKE3Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
