import React, { createContext, useEffect, useState } from "react";
import { auth, db } from "../firebase"; // removed realtimeDb import
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export const AuthContext = createContext();

const getUserIP = async () => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch (err) {
    return "N/A";
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes and fetch user role from Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", firebaseUser.email)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUser({ ...firebaseUser, role: userData.department || "guest" });
            setPhotoURL(userData.photoURL || "");
          } else {
            setUser({ ...firebaseUser, role: "guest" });
            setPhotoURL("");
          }
        } catch (error) {
          console.error("Error fetching user data by email:", error);
          setUser({ ...firebaseUser, role: "guest" });
          setPhotoURL("");
        }
      } else {
        setUser(null);
        setPhotoURL("");
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Login function fetches user role & logs IP audit to Firestore
  const login = async (email, password) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    try {
      const q = query(collection(db, "users"), where("email", "==", userCred.user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUser({ ...userCred.user, role: userData.department || "guest" });
        setPhotoURL(userData.photoURL || "");
      } else {
        setUser({ ...userCred.user, role: "guest" });
        setPhotoURL("");
      }
    } catch (err) {
      console.error("Error fetching department from Firestore (login):", err);
      setUser({ ...userCred.user, role: "guest" });
      setPhotoURL("");
    }

    // Log login IP to Firestore audit_logs
    const ip = await getUserIP();
    await addDoc(collection(db, "audit_logs"), {
      user: email,
      action: "Logged in",
      ip,
      date: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
  };

  // Logout clears user info & local storage
  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
    setUser(null);
    setPhotoURL("");
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
