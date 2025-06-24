import React, { createContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
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

const normalizeRole = (role) => {
  if (!role) return '';
  const lowerRole = role.toLowerCase().trim();
  
  // Special handling for "L & D" department
  if (lowerRole === 'l & d') return 'learning';
  
  // Default normalization for other departments
  return lowerRole
    .replace('&', 'and')
    .replace(/\s+/g, '-');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);

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
            setUser({ 
              ...firebaseUser, 
              role: normalizeRole(userData.department) || "guest" 
            });
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

const login = async (email, password) => {
  const userCred = await signInWithEmailAndPassword(auth, email, password);

  try {
    const q = query(collection(db, "users"), where("email", "==", userCred.user.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      setUser({ 
        ...userCred.user, 
        role: normalizeRole(userData.department) || "guest"  // Add normalization here
      });
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

  // Log login IP
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
      loading  // Add this line
    }}
  >
    {!loading && children}
  </AuthContext.Provider>
);
};
