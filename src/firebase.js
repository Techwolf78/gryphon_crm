// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAN10Fly6y1Xss16n5OubDsu_fT3DOGPQU",
  authDomain: "gryphon-crm.firebaseapp.com",
  projectId: "gryphon-crm",
  storageBucket: "gryphon-crm.firebasestorage.app",
  messagingSenderId: "738594324730",
  appId: "1:738594324730:web:47a05c8ac1b882b63b8943",
  measurementId: "G-TG10JFFRK4"


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
