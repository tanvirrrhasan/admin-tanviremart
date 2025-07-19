import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js"; // Optional

const firebaseConfig = {
  apiKey: "AIzaSyBc7ROAuStlZv3VISrAyXAbjQXAkiAaq10",
  authDomain: "tanviremart.firebaseapp.com",
  projectId: "tanviremart",
  storageBucket: "tanviremart.firebasestorage.app",
  messagingSenderId: "1017569424765",
  appId: "1:1017569424765:web:aab1858e3f12e601488814",
  measurementId: "G-K6X7ZVBQRB"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// export const analytics = getAnalytics(app); // Optional 