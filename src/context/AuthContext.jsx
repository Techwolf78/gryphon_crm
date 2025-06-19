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
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import { get, ref as dbRef } from 'firebase/database';

export const AuthContext = createContext();

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

  // 1. On Auth State Changed — fetch department by email from Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Email se user ko Firestore users collection se find karo
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log('User department (onAuthStateChanged):', userData.department);
            setUser({ ...firebaseUser, role: userData.department || 'guest' });
            setPhotoURL(userData.photoURL || '');
          } else {
            console.log('No user found with this email in Firestore (onAuthStateChanged)');
            setUser({ ...firebaseUser, role: 'guest' });
            setPhotoURL('');
          }
        } catch (error) {
          console.error('Error fetching user data by email:', error);
          setUser({ ...firebaseUser, role: 'guest' });
          setPhotoURL('');
        }
      } else {
        setUser(null);
        setPhotoURL('');
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Login function me bhi department fetch karke console me print karenge
  const login = async (email, password) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    try {
      const q = query(collection(db, 'users'), where('email', '==', userCred.user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        console.log('Department fetched from Firestore (login):', userData.department);
        setUser({ ...userCred.user, role: userData.department || 'guest' });
        setPhotoURL(userData.photoURL || '');
      } else {
        console.log('No user found with this email in Firestore (login)');
        setUser({ ...userCred.user, role: 'guest' });
        setPhotoURL('');
      }
    } catch (err) {
      console.error('Error fetching department from Firestore (login):', err);
      setUser({ ...userCred.user, role: 'guest' });
      setPhotoURL('');
    }

    // Log login IP in Firestore audit_logs
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
        setPhotoURL,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
