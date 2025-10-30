import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 
  apiKey: "AIzaSyAN10Fly6y1Xss16n5OubDsu_fT3DOGPQU",
 
  authDomain: "gryphon-crm.firebaseapp.com",
 
  projectId: "gryphon-crm",
 
  storageBucket: "gryphon-crm.firebasestorage.app",
 
  messagingSenderId: "738594324730",
 
  appId: "1:738594324730:web:47a05c8ac1b882b63b8943",
 
  measurementId: "G-TG10JFFRK4"
 
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export const setAuthPersistence = async (rememberMe) => {
  try {
    await setPersistence(
      auth, 
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (error) {
    console.error("Failed to set auth persistence:", error);
  }
};

// Set default persistence
setPersistence(auth, browserSessionPersistence).catch(console.error);

const db = getFirestore(app);

// Secondary app for admin operations
let secondaryApp;
let secondaryAuth;

try {
  secondaryApp = initializeApp(firebaseConfig, "Secondary");
  secondaryAuth = getAuth(secondaryApp);
  setPersistence(secondaryAuth, browserSessionPersistence).catch(console.error);
} catch (error) {
  console.error("Secondary app initialization failed:", error);
}

export { app, auth, db, secondaryApp, secondaryAuth };