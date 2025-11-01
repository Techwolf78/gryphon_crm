import React, { useContext, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  FaHome,
  FaTachometerAlt,
  FaSignOutAlt,
  FaUserEdit,
  FaSpinner,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

const Navbar = ({ onImageClick = () => {} }) => {
  const { user, logout, photoURL, setPhotoURL } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profilePic, setProfilePic] = useState("");
  const [loadingProfilePic, setLoadingProfilePic] = useState(true);
  const dropdownRef = useRef();

  const isHome = location.pathname === "/";
  const isLogin = location.pathname === "/login";
  const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    let unsubscribeProfile = () => {};
    let unsubscribeUser = () => {};

    const fetchProfilePicture = async () => {
      if (user) {
        try {
          setLoadingProfilePic(true);

          // Set up real-time listener for userprofile collection
          const profileRef = doc(db, "userprofile", user.uid);
          unsubscribeProfile = onSnapshot(profileRef, (doc) => {
            if (doc.exists()) {
              const profileData = doc.data();
              if (profileData.profilePicUrl) {
                setProfilePic(profileData.profilePicUrl);
                setPhotoURL(profileData.profilePicUrl);
                return;
              }
            }

            // Fallback to users collection if not found in userprofile
            const usersQuery = query(
              collection(db, "users"),
              where("uid", "==", user.uid)
            );
            getDocs(usersQuery).then((usersSnapshot) => {
              if (!usersSnapshot.empty) {
                const userData = usersSnapshot.docs[0].data();
                if (userData.profilePicUrl) {
                  setProfilePic(userData.profilePicUrl);
                  setPhotoURL(userData.profilePicUrl);
                }
              }
            });
          });

          // Also set up listener for users collection as fallback
          const usersQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid)
          );
          unsubscribeUser = onSnapshot(usersQuery, (usersSnapshot) => {
            if (!usersSnapshot.empty) {
              const userData = usersSnapshot.docs[0].data();
              if (userData.profilePicUrl) {
                setProfilePic(userData.profilePicUrl);
                setPhotoURL(userData.profilePicUrl);
              }
            }
          });
        } catch {

          toast.error("Failed to load profile picture");
        } finally {
          setLoadingProfilePic(false);
        }
      }
    };

    fetchProfilePicture();

    return () => {
      unsubscribeProfile();
      unsubscribeUser();
    };
  }, [user, setPhotoURL]);

  // Rest of your component remains the same...
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDisplayName = (email) => {
    const domain = "@gryphonacademy.co.in";
    if (email.endsWith(domain)) {
      const namePart = email.split("@")[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return email;
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate("/login", { state: { showLogoutToast: true } });
  };

  const navItemClass =
    "group flex items-center gap-2 relative transition text-white hover:text-white";

  return (
    <nav className="bg-blue-900 text-white px-6 py-1 flex justify-between items-center sticky top-0 z-52">
      <Link to="/" className="flex items-center">
        <img
          src="https://res.cloudinary.com/dcjmaapvi/image/upload/v1740489025/ga-hori_ylcnm3.png"
          alt="Gryphon CRM Logo"
          className="h-20 w-auto"
        />
      </Link>

      <div className="flex items-center space-x-6">
        {isHome && !user && (
          <>
            <Link to="/login" className="relative group text-white transition">
              <span className="relative inline-block transition duration-300 group-hover:text-yellow-400">
                Login
                <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300"></span>
              </span>
            </Link>
          </>
        )}

        {isLogin && !user && (
          <div className="relative group">
            <Link to="/" className="text-white hover:text-white">
              <FaHome className="text-white text-4xl transition" />
            </Link>
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none">
              Home
            </div>
          </div>
        )}

        {user && (
          <>
            {user.role === "admin" && (
              <Link to="/dashboard" className={navItemClass}>
                <FaTachometerAlt
                  className={`transition ${
                    isDashboard
                      ? "text-green-400 animate-pulse"
                      : "text-white group-hover:text-yellow-400"
                  }`}
                />
                <span
                  className={`relative inline-block transition duration-300 ${
                    isDashboard
                      ? "text-green-400 font-semibold"
                      : "group-hover:text-yellow-400"
                  }`}
                >
                  Dashboard
                  <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-300"></span>
                </span>
              </Link>
            )}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-800 transition"
              >
                {loadingProfilePic ? (
                  <FaSpinner className="h-9 w-9 text-yellow-400 animate-spin" />
                ) : (
                  <img
                    src={profilePic || photoURL || "/home/profile1.png"}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover object-top border-2 bg-white"
                    onClick={onImageClick}
                  />
                )}
                <span className="font-medium">
                  {formatDisplayName(user.email)}
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded shadow-lg overflow-hidden z-50">
                  <Link
                    to="dashboard/profile"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <FaUserEdit /> View Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-100 text-red-600 transition"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
