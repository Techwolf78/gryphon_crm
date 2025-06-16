import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { get, set, ref } from 'firebase/database';
import { realtimeDb } from '../firebase';
import { toast } from 'react-toastify';
import {
  FaCloudUploadAlt,
  FaCamera,
  FaArrowRight,
  FaUserCircle,
} from 'react-icons/fa';
import defaultIcon from '/home/profile1.png';

const avatars = [
  '/home/profile2.jpg',
  '/home/profile3.jpg',
  '/home/profile4.jpg',
  '/home/profile5.jpg',
  '/home/profile6.png',
  '/home/profile7.jpg',
  '/home/profile8.jpg',
  '/home/profile9.jpg',
  '/home/profile10.jpg',
];

const MAX_SIZE_MB = 10;

export default function UpdateProfile({ onClose }) {
  const { user, setPhotoURL } = useContext(AuthContext);
  const [currentImage, setCurrentImage] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      const fetchImage = async () => {
        const snapshot = await get(ref(realtimeDb, `users/${user.uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.photoURL) {
            setCurrentImage(data.photoURL);
            setSelectedImage(data.photoURL);
          }
        }
      };
      fetchImage();
    }
  }, [user]);

  const handleUpload = async (file) => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!types.includes(file.type)) {
      toast.error('Invalid file format');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'react_profile_upload');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/da0ypp61n/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.secure_url) {
        setSelectedImage(data.secure_url);
        toast.success('Image uploaded');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      toast.error('Upload error: ' + err.message);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await set(ref(realtimeDb, `users/${user.uid}`), {
        photoURL: selectedImage,
      });
      setPhotoURL(selectedImage);
      setCurrentImage(selectedImage);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleAvatarClick = (img) => {
    setSelectedImage(img);
    toast.success('Avatar selected');
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center bg-gray-100 px-4 py-10">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="bg-white rounded-xl w-full max-w-md p-6 text-center shadow-lg relative"
      >
        {/* ❌ Close Button */}
        <button
          onClick={onClose || (() => window.history.back())}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600 text-4xl font-bold"
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex flex-col items-center mb-6">
          <FaCloudUploadAlt className="text-blue-800 text-4xl mb-2" />
          <h2 className="text-lg font-semibold">Upload a file</h2>
          <p className="text-sm text-gray-500">
            Drag or paste a file here, or choose an option below.
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center border-2 border-dashed border-blue-300 p-4 rounded-xl shadow-inner w-full max-w-md mx-auto">
            {/* Current Image */}
            <div className="flex flex-col items-center">
              <img
                src={currentImage || defaultIcon}
                alt="Current"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
              <span className="text-xs mt-2 text-gray-500">Current</span>
            </div>

            {/* Arrow */}
            <div className="mx-4 text-3xl text-blue-800">
              <FaArrowRight />
            </div>

            {/* Selected Image */}
            <div className="flex flex-col items-center">
              {selectedImage && selectedImage !== currentImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                  />
                  <span className="text-xs mt-2 text-gray-500">Selected</span>
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
            className="bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Choose File
          </button>
          <button
            onClick={() => toast.info('Camera feature coming soon!')}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition flex items-center gap-1"
          >
            <FaCamera /> Take Photo
          </button>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Avatar Selection */}
        <h3 className="text-sm font-medium text-gray-700 mb-2">Choose Your Avatar Here</h3>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {avatars.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt="avatar"
              onClick={() => handleAvatarClick(img)}
              className={`h-10 w-10 rounded-full cursor-pointer border-2 transition ${
                selectedImage === img
                  ? 'border-blue-800 scale-110'
                  : 'hover:border-blue-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!selectedImage || selectedImage === currentImage}
          className={`py-2 px-5 rounded transition text-white ${
            !selectedImage || selectedImage === currentImage
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-800 hover:bg-green-700'
          }`}
        >
          Upload
        </button>

        {uploading && (
          <p className="mt-4 text-sm text-gray-500 animate-pulse">Uploading...</p>
        )}
      </div>
    </div>
  );
}
