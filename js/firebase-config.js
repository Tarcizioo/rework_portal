import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkT3ca4I1xWs1Pz1Rw02FgOQWoRMajxm0",
  authDomain: "portal-animes-rework.firebaseapp.com",
  projectId: "portal-animes-rework",
  storageBucket: "portal-animes-rework.firebasestorage.app",
  messagingSenderId: "882444952830",
  appId: "1:882444952830:web:5824aa7001ae0f3c62b1af"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };