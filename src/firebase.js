// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAECXwT5YZahSIRP5Ro7BZr33eVX1a6vjY",
  authDomain: "gryphoncrm-209a6.firebaseapp.com",
  projectId: "gryphoncrm-209a6",
  storageBucket: "gryphoncrm-209a6.firebasestorage.app",
  messagingSenderId: "938143262596",
  appId: "1:938143262596:web:4a98bb9569b1cc1d249fd1",
  measurementId: "G-Q8PWZV0R70"
};

// Primary Firebase app initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Firestore instance
const db = getFirestore(app);

// Secondary Firebase app (named "Secondary") for creating new users without signing out main user
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);
setPersistence(secondaryAuth, browserLocalPersistence);

export { app, auth, db, secondaryApp, secondaryAuth };
