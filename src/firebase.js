import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxxJYJwEUDm4O5ZWRC2rLG3F0Q7f-icWA",
  authDomain: "gryphon-sync.firebaseapp.com",
  projectId: "gryphon-sync",
  storageBucket: "gryphon-sync.firebasestorage.app",
  messagingSenderId: "711708349362",
  appId: "1:711708349362:web:e69239dbaafc2971490aab",
  measurementId: "G-M8D2ECH5ZX"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export const setAuthPersistence = async (rememberMe) => {
  await setPersistence(
    auth, 
    rememberMe ? browserLocalPersistence : browserSessionPersistence
  );
};

setPersistence(auth, browserSessionPersistence);

const db = getFirestore(app);

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);
setPersistence(secondaryAuth, browserSessionPersistence);

export { app, auth, db, secondaryApp, secondaryAuth };