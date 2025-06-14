import React, { createContext, useEffect, useState } from 'react';
import { auth, db, realtimeDb } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

import { get, ref as dbRef } from 'firebase/database'; // 🔁 Add this

export const AuthContext = createContext();

const getRoleByEmail = (email) => {
  const roleMap = {
    'gryphoncrm@gmail.com': 'admin',
    'gryphoncrm@gryphonacademy.co.in': 'admin',
    'nishad@gryphonacademy.co.in': 'sales',
    'shashikant@gryphonacademy.co.in': 'placement',
    'neha@gryphonacademy.co.in': 'learning',
    'nasim@gryphonacademy.co.in': 'marketing',
  };
  return roleMap[email.toLowerCase()] || 'guest';
};

const getUserIP = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (err) {
    return 'N/A';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const role = getRoleByEmail(firebaseUser.email);

        // 🔁 Fetch photoURL from Realtime DB
        let photo = '';
        try {
          const snap = await get(dbRef(realtimeDb, `users/${firebaseUser.uid}`));
          if (snap.exists()) {
            photo = snap.val().photoURL || '';
          }
        } catch (err) {
          console.error('Error fetching profile photo from RTDB:', err);
        }

        setUser({ ...firebaseUser, role });
        setPhotoURL(photo);
      } else {
        setUser(null);
        setPhotoURL('');
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async (email, password) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const role = getRoleByEmail(userCred.user.email);
    setUser({ ...userCred.user, role });

    // 🔁 Fetch photoURL from Realtime DB
    let photo = '';
    try {
      const snap = await get(dbRef(realtimeDb, `users/${userCred.user.uid}`));
      if (snap.exists()) {
        photo = snap.val().photoURL || '';
      }
    } catch (err) {
      console.error('Error fetching profile photo from RTDB (login):', err);
    }

    setPhotoURL(photo);

    // Log login to Firestore
    const ip = await getUserIP();
    await addDoc(collection(db, 'audit_logs'), {
      user: email,
      action: 'Logged in',
      ip,
      date: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
    setUser(null);
    setPhotoURL('');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        photoURL,
        setPhotoURL, // ✅ still exposed
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
