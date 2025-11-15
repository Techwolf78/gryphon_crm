import { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";

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

const getUserLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ error: "Geolocation not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        console.warn("Location access denied or failed:", error);
        resolve({ error: error.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

const reverseGeocode = async (lat, lng) => {
  try {
    // Using a free geocoding service (you might want to use Google Maps API or similar for production)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const data = await response.json();
    return {
      city: data.city || "Unknown",
      country: data.countryName || "Unknown",
      region: data.principalSubdivision || "Unknown",
      address: `${data.city}, ${data.principalSubdivision}, ${data.countryName}`
    };
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return { city: "Unknown", country: "Unknown", region: "Unknown", address: "Location unavailable" };
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const inactivityTimerRef = useRef(null);
  const updateTimerRef = useRef(null);

  const startSession = async (userId, locationData = null) => {
    try {
      const sessionDoc = await addDoc(collection(db, "user_sessions"), {
        userId,
        startTime: serverTimestamp(),
        lastActive: serverTimestamp(),
        isActive: true,
        location: locationData,
      });
      setSessionId(sessionDoc.id);
      // Start update timer every 5 minutes
      updateTimerRef.current = setInterval(() => updateLastActive(sessionDoc.id), 5 * 60 * 1000);
      // Add event listeners
      document.addEventListener('mousemove', handleActivity);
      document.addEventListener('keydown', handleActivity);
      // Reset inactivity timer
      resetInactivityTimer();
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => endSession(), 30 * 60 * 1000);
  };

  const handleActivity = () => {
    resetInactivityTimer();
  };

  const updateLastActive = async (id) => {
    try {
      await updateDoc(doc(db, "user_sessions", id), {
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating last active:", error);
    }
  };

  const endSession = async () => {
    if (!sessionId) return 0;
    try {
      const sessionRef = doc(db, "user_sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const start = data.startTime.toDate();
        const end = new Date();
        const duration = Math.floor((end - start) / 1000); // seconds
        await updateDoc(sessionRef, {
          endTime: serverTimestamp(),
          isActive: false,
          duration,
        });
        setSessionId(null);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (updateTimerRef.current) clearInterval(updateTimerRef.current);
        document.removeEventListener('mousemove', handleActivity);
        document.removeEventListener('keydown', handleActivity);
        return duration;
      }
    } catch (error) {
      console.error("Error ending session:", error);
    }
    setSessionId(null);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (updateTimerRef.current) clearInterval(updateTimerRef.current);
    document.removeEventListener('mousemove', handleActivity);
    document.removeEventListener('keydown', handleActivity);
    return 0;
  };

  const refreshSession = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      // Check auth time without forcing refresh (less aggressive)
      const token = await currentUser.getIdTokenResult();
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
      // Don't logout on refresh errors - just return false
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
              department: userData.department || (Array.isArray(userData.departments) ? userData.departments[0] : "guest"), // Handle both old single department and new array format
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
        endSession();
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    // Get location data
    const location = await getUserLocation();
    let locationData = { error: "Location unavailable" };
    
    if (!location.error) {
      const geoData = await reverseGeocode(location.latitude, location.longitude);
      locationData = {
        coordinates: { lat: location.latitude, lng: location.longitude },
        address: geoData.address,
        city: geoData.city,
        region: geoData.region,
        country: geoData.country,
        accuracy: location.accuracy
      };
    }

    // Original audit logging with location data
    const ip = await getUserIP();
    await addDoc(collection(db, "audit_logs"), {
      user: email,
      uid: userCred.user.uid,
      action: "Logged in",
      ip,
      location: locationData,
      timestamp: serverTimestamp(),
    });

    await refreshSession();
    await startSession(userCred.user.uid, locationData);
  };

  const logout = async () => {
    const lastDuration = await endSession();
    await signOut(auth);
    localStorage.clear();
    
    // Get location data for logout
    const location = await getUserLocation();
    let locationData = { error: "Location unavailable" };
    
    if (!location.error) {
      const geoData = await reverseGeocode(location.latitude, location.longitude);
      locationData = {
        coordinates: { lat: location.latitude, lng: location.longitude },
        address: geoData.address,
        city: geoData.city,
        region: geoData.region,
        country: geoData.country,
        accuracy: location.accuracy
      };
    }
    
    // Audit log with duration and location
    if (user) {
      const ip = await getUserIP();
      await addDoc(collection(db, "audit_logs"), {
        user: user.email,
        uid: user.uid,
        action: "Logged out",
        duration: lastDuration,
        ip,
        location: locationData,
        timestamp: serverTimestamp(),
      });
    }
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
