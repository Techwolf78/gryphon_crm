import React, { createContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const role = getRoleByEmail(firebaseUser.email);
        setUser({ ...firebaseUser, role });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const role = getRoleByEmail(userCred.user.email);
    setUser({ ...userCred.user, role });

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
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
