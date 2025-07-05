import React, { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import {
  FaCloudUploadAlt,
  FaCamera,
  FaArrowRight,
  FaUserCircle,
  FaEdit,
  FaTimes,
} from "react-icons/fa";
import defaultIcon from "/home/profile1.png";

const avatars = [
  "/home/profile2.jpg",
  "/home/profile3.jpg",
  "/home/profile4.jpg",
  "/home/profile5.jpg",
  "/home/profile6.png",
  "/home/profile7.jpg",
  "/home/profile8.jpg",
  "/home/profile9.jpg",
  "/home/profile10.jpg",
];

const MAX_SIZE_MB = 10;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

export default function UpdateProfile({ onClose }) {
  const { user, setPhotoURL, photoURL } = useContext(AuthContext);
  const [currentImage, setCurrentImage] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [profileData, setProfileData] = useState(null); // From userprofile collection
  const [userDetails, setUserDetails] = useState(null); // From users collection
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          // Fetch from both collections in parallel
          const [profileSnap, userSnap] = await Promise.all([
            getDoc(doc(db, "userprofile", user.uid)),
            getDoc(doc(db, "users", user.uid))
          ]);

          // Process userprofile data
          if (profileSnap.exists()) {
            const data = profileSnap.data();
            setProfileData(data);
            if (data.profilePicUrl) {
              setCurrentImage(data.profilePicUrl);
              setSelectedImage(data.profilePicUrl);
              setPhotoURL(data.profilePicUrl);
            }
          } else {
            // Create basic profile if doesn't exist
            const basicProfile = {
              uid: user.uid,
              email: user.email,
              name: formatDisplayName(user.email),
              createdAt: new Date().toISOString(),
              profilePicUrl: "",
            };
            await setDoc(doc(db, "userprofile", user.uid), basicProfile);
            setProfileData(basicProfile);
          }

          // Process users collection data
          if (userSnap.exists()) {
            setUserDetails(userSnap.data());
          }
        } catch (error) {
          toast.error("Failed to load profile data");
          console.error("Error fetching profile:", error);
        }
      };
      fetchUserData();
    }
  }, [user]);

  const formatDisplayName = (email) => {
    const domain = "@gryphonacademy.co.in";
    if (email.endsWith(domain)) {
      const namePart = email.split("@")[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return email;
  };

  const handleUpload = async (file) => {
    try {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_SIZE_MB) {
        throw new Error(`Image must be less than ${MAX_SIZE_MB}MB`);
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error("Invalid file format. Please upload JPEG, PNG, or WebP images.");
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "react_profile_upload");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/da0ypp61n/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Image upload failed");
      }

      const data = await res.json();
      if (!data.secure_url) {
        throw new Error("No URL returned from upload");
      }

      setSelectedImage(data.secure_url);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error(`Upload error: ${err.message}`);
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !selectedImage || selectedImage === currentImage) return;

    try {
      const userProfileRef = doc(db, "userprofile", user.uid);
      const updateData = {
        profilePicUrl: selectedImage,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userProfileRef, updateData, { merge: true });

      setPhotoURL(selectedImage);
      setCurrentImage(selectedImage);
      setShowUpdateModal(false);
      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile picture");
    }
  };

  const handleAvatarClick = (img) => {
    setSelectedImage(img);
    toast.info("Avatar selected");
  };

  if (showUpdateModal) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 px-4 py-10">
        <div className="bg-white rounded-xl w-full max-w-md p-6 text-center shadow-lg relative">
          <button
            onClick={() => setShowUpdateModal(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <FaTimes className="text-xl" />
          </button>

          <div className="flex flex-col items-center mb-6">
            <FaCloudUploadAlt className="text-blue-800 text-4xl mb-2" />
            <h2 className="text-lg font-semibold">Update Profile Picture</h2>
            <p className="text-sm text-gray-500">
              Upload a new image or choose from avatars
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center border-2 border-dashed border-blue-300 p-4 rounded-xl shadow-inner w-full max-w-md mx-auto">
              <div className="flex flex-col items-center">
                <img
                  src={currentImage || defaultIcon}
                  alt="Current profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                />
                <span className="text-xs mt-2 text-gray-500">Current</span>
              </div>

              <div className="mx-4 text-3xl text-blue-800">
                <FaArrowRight />
              </div>

              <div className="flex flex-col items-center">
                {selectedImage ? (
                  <>
                    <img
                      src={selectedImage}
                      alt="New profile"
                      className={`w-24 h-24 rounded-full object-cover border-2 ${
                        selectedImage !== currentImage
                          ? "border-blue-500"
                          : "border-gray-300"
                      }`}
                    />
                    <span className="text-xs mt-2 text-gray-500">
                      {selectedImage !== currentImage ? "New" : "Same"}
                    </span>
                  </>
                ) : (
                  <FaUserCircle className="text-gray-400 w-24 h-24" />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={() => fileRef.current.click()}
              className="bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700 transition flex items-center gap-1"
            >
              Upload Photo
            </button>
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleUpload(file);
              }}
              className="hidden"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Choose from avatars:
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {avatars.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Avatar ${idx + 1}`}
                  onClick={() => handleAvatarClick(img)}
                  className={`h-12 w-12 rounded-full cursor-pointer border-2 transition ${
                    selectedImage === img
                      ? "border-blue-800 scale-110"
                      : "border-transparent hover:border-blue-400"
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={
              !selectedImage || selectedImage === currentImage || uploading
            }
            className={`w-full py-2 px-5 rounded transition text-white flex items-center justify-center gap-2 ${
              !selectedImage || selectedImage === currentImage || uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-800 hover:bg-green-700"
            }`}
          >
            {uploading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-blue-900 p-6 text-white">
          <h1 className="text-2xl font-bold">User Profile</h1>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Profile"
                  className="h-40 w-40 rounded-full object-cover border-4 border-blue-100 shadow-md"
                />
              ) : (
                <FaUserCircle className="text-gray-400 h-40 w-40" />
              )}
              <button
                onClick={() => setShowUpdateModal(true)}
                className="absolute bottom-2 right-2 bg-blue-800 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-blue-700"
                title="Edit profile picture"
              >
                <FaEdit className="text-lg" />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {userDetails?.name || profileData?.name || formatDisplayName(user.email)}
                </h2>
                <p className="text-gray-600 capitalize">
                  {userDetails?.role || "Role not specified"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="mt-1 text-gray-900">
                    {userDetails?.name || profileData?.name || formatDisplayName(user.email)}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-gray-900">{user.email}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Role</h3>
                  <p className="mt-1 text-gray-900 capitalize">
                    {userDetails?.role || "Not specified"}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">
                    Department
                  </h3>
                  <p className="mt-1 text-gray-900 capitalize">
                    {userDetails?.department || "Not specified"}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">
                    Reporting Manager
                  </h3>
                  <p className="mt-1 text-gray-900 capitalize">
                    {userDetails?.reportingManager || "Not assigned"}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">
                    Account Created
                  </h3>
                  <p className="mt-1 text-gray-900">
                    {profileData?.createdAt
                      ? new Date(profileData.createdAt).toLocaleDateString()
                      : new Date(user.metadata.creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}