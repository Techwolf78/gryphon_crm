import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { FaUserCircle, FaEdit, FaSpinner, FaArrowLeft } from "react-icons/fa";
import defaultAvatar from "/home/profile1.png";
import ProfilePictureModal from "./ProfilePictureModal";
import { useNavigate } from "react-router-dom";

const avatars = [
  "/home/profile2.jpg",
  "/home/profile3.jpg",
  "/home/profile4.jpg",
  "/home/profile5.jpg",
  "/home/profile6.png",
  "/home/profile7.jpg",
  "/home/profile10.jpg",
];

export default function UpdateProfile({ onClose }) {
  const { user, setPhotoURL, photoURL } = useContext(AuthContext);
  const [currentImage, setCurrentImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [lastLogin, setLastLogin] = useState(null);
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const formatDisplayName = (email) => {
    const domain = "@gryphonacademy.co.in";
    if (email.endsWith(domain)) {
      const namePart = email.split("@")[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return email;
  };

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          setLoading(true);
          // Fetch profile data
          const profileRef = doc(db, "userprofile", user.uid);
          const profileSnap = await getDoc(profileRef);

          // Fetch user details
          const usersQuery = query(
            collection(db, "users"),
            where("uid", "==", user.uid)
          );
          const usersSnapshot = await getDocs(usersQuery);

          // Fetch last login from audit_logs
          const auditLogsQuery = query(
            collection(db, "audit_logs"),
            where("user", "==", user.email),
            where("action", "==", "Logged in"),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const auditLogsSnapshot = await getDocs(auditLogsQuery);

          if (!auditLogsSnapshot.empty) {
            const lastLoginData = auditLogsSnapshot.docs[0].data();
            setLastLogin(lastLoginData.timestamp.toDate());
          }

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            setProfileData(data);
            if (data.profilePicUrl) {
              setCurrentImage(data.profilePicUrl);
              setPhotoURL(data.profilePicUrl);
            }
          } else {
            const basicProfile = {
              uid: user.uid,
              email: user.email,
              name: formatDisplayName(user.email),
              createdAt: new Date().toISOString(),
              profilePicUrl: "",
            };
            await setDoc(profileRef, basicProfile);
            setProfileData(basicProfile);
          }

          if (!usersSnapshot.empty) {
            setUserDetails(usersSnapshot.docs[0].data());
          }
        } catch (error) {
          console.error("Error:", error);
          toast.error("Failed to load profile data");
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [user, setPhotoURL]);

  const handleSaveImage = async (imageUrl) => {
    if (!user || !imageUrl) return;

    try {
      const userProfileRef = doc(db, "userprofile", user.uid);
      await setDoc(
        userProfileRef,
        {
          profilePicUrl: imageUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setCurrentImage(imageUrl);
      setPhotoURL(imageUrl);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile picture");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-blue-600 text-4xl animate-spin mb-2" />
          <span className="text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (showUpdateModal) {
    return (
      <ProfilePictureModal
        currentImage={currentImage}
        onClose={() => setShowUpdateModal(false)}
        onSave={handleSaveImage}
        avatars={avatars}
        defaultIcon={defaultAvatar}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto ">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-blue-100 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-medium">Profile Settings</h1>
            <div className="w-8"></div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 flex flex-col items-center">
              <div className="relative group mb-4">
                <div className="relative h-48 w-48 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden shadow-inner">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FaUserCircle className="h-full w-full text-gray-300" />
                  )}
                </div>
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-md text-blue-600 hover:text-blue-800 hover:bg-gray-50 transition-all transform hover:scale-105"
                  title="Edit profile picture"
                >
                  <FaEdit className="text-lg" />
                </button>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  {userDetails?.name ||
                    profileData?.name ||
                    formatDisplayName(user.email)}
                </h2>
                <p className="text-gray-500 capitalize">
                  {userDetails?.role || "Role not specified"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Member since{" "}
                  {profileData?.createdAt
                    ? new Date(profileData.createdAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long" }
                      )
                    : new Date(user.metadata.creationTime).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long" }
                      )}
                </p>
              </div>
            </div>

            <div className="md:w-2/3">
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Full Name
                      </label>
                      <p className="text-gray-800">
                        {userDetails?.name ||
                          profileData?.name ||
                          formatDisplayName(user.email)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Email Address
                      </label>
                      <p className="text-gray-800">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-100 pb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Work Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Role
                      </label>
                      <p className="text-gray-800 capitalize">
                        {userDetails?.role || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Department
                      </label>
                      <p className="text-gray-800 capitalize">
                        {userDetails?.department || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Reporting Manager
                      </label>
                      <p className="text-gray-800 capitalize">
                        {userDetails?.reportingManager || "Not assigned"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Account Created
                      </label>
                      <p className="text-gray-800">
                        {profileData?.createdAt
                          ? new Date(profileData.createdAt).toLocaleDateString(
                              "en-US",
                              { year: "numeric", month: "long", day: "numeric" }
                            )
                          : new Date(
                              user.metadata.creationTime
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Last Login
                      </label>
                      <p className="text-gray-800">
                        {lastLogin
                          ? lastLogin.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }) +
                            " at " +
                            lastLogin.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No login records found"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
