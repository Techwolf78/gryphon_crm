// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
<<<<<<< HEAD
  apiKey: "AIzaSyD9SBw0ZckY3ht0CwH39C5pPRWwkR2zR4M",
  authDomain: "authencation-39485.firebaseapp.com",
  databaseURL:
    "https://authencation-39485-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "authencation-39485",
  storageBucket: "authencation-39485.firebasestorage.app",
  messagingSenderId: "366538675183",
  appId: "1:366538675183:web:8504a18fce2d563c491c1a",
  measurementId: "G-0V7B973Q8T",
=======
  apiKey: "AIzaSyAN10Fly6y1Xss16n5OubDsu_fT3DOGPQU",
  authDomain: "gryphon-crm.firebaseapp.com",
  projectId: "gryphon-crm",
  storageBucket: "gryphon-crm.firebasestorage.app",
  messagingSenderId: "738594324730",
  appId: "1:738594324730:web:47a05c8ac1b882b63b8943",
  measurementId: "G-TG10JFFRK4"
>>>>>>> 9e4f5f84c9d8cbbe3e1606fe585ee53ca1c92c58
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
