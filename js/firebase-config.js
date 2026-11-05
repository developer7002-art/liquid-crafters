
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB31FNzhGP7LxTHyCyl5VWZd0yHR8EiqTU",
  authDomain: "liquid-crafters.firebaseapp.com",
  projectId: "liquid-crafters",
  storageBucket: "liquid-crafters.firebasestorage.app",
  messagingSenderId: "953711661058",
  appId: "1:953711661058:web:2903407ce4060794b5571b"
};

const app = initializeApp(firebaseConfig);


const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
