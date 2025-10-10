import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";

export const AuthContext = createContext();

const getUserIP = async () => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    return (await res.json()).ip;
  } catch (err) {
    console.error("Error fetching user IP:", err);
    return "N/A";
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      // Force token refresh and check auth time
      const token = await currentUser.getIdTokenResult(true);
      const authTime = new Date(token.authTime).getTime();
      const sessionAge = Date.now() - authTime;
      
      // Max session duration (12 hours)
      if (sessionAge > 12 * 60 * 60 * 1000) {
        await logout();
        return false;
      }

      // Verify user in Firestore (original functionality)
      const q = query(collection(db, "users"), where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUser({
          ...currentUser,
          role: userData.role || "guest",
          department: userData.department || "guest",
          reportingManager: userData.reportingManager || null,
        });
        setPhotoURL(userData.photoURL || "");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing session:", error);
      logout();
      return false;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check session age immediately (new)
          const token = await firebaseUser.getIdTokenResult();
          const authTime = new Date(token.authTime).getTime();
          
          if (Date.now() - authTime > 12 * 60 * 60 * 1000) {
            await logout();
            return;
          }

          // Original user data lookup
          const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUser({
              ...firebaseUser,
              role: userData.role || "guest",
              department: userData.department || userData.departments || "guest", // Handle both old single department and new array format
              departments: userData.departments || (userData.department ? [userData.department] : []), // Store departments as array
              reportingManager: userData.reportingManager || null,
            });
            setPhotoURL(userData.photoURL || "");
          } else {
            // Guest user handling (original)
            setUser({ ...firebaseUser, role: "guest" });
            setPhotoURL("");
          }
        } catch (error) {
          console.error("Error loading user data:", error);
          setUser({ ...firebaseUser, role: "guest" });
          setPhotoURL("");
        }
      } else {
        setUser(null);
        setPhotoURL("");
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    // Original audit logging, now using userCred.user.uid and email
    const ip = await getUserIP();
    await addDoc(collection(db, "audit_logs"), {
      user: email,
      uid: userCred.user.uid, // <-- use userCred here
      action: "Logged in",
      ip,
      timestamp: serverTimestamp(),
    });

    await refreshSession();
  };

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
        refreshSession,
        isAuthenticated: !!user,
        photoURL,
        setPhotoURL,
        loading
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
