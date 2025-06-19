import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import {
  FaCloudUploadAlt,
  FaCamera,
  FaArrowRight,
  FaUserCircle,
  FaArrowLeft,
  FaTimes,
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
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

export default function UpdateProfile({ onClose }) {
  const { user, setPhotoURL } = useContext(AuthContext);
  const [currentImage, setCurrentImage] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      const fetchImage = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.photoURL) {
              setCurrentImage(data.photoURL);
              setSelectedImage(data.photoURL);
            }
          }
        } catch (error) {
          toast.error('Failed to load profile image');
          console.error('Error fetching image:', error);
        }
      };
      fetchImage();
    }
  }, [user]);

  const handleUpload = async (file) => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      toast.error(`Image must be less than ${MAX_SIZE_MB}MB`);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Invalid file format. Please upload JPEG, PNG, or WebP images.');
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
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error(data.error?.message || 'Image upload failed');
      }
    } catch (err) {
      toast.error(`Upload error: ${err.message}`);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
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
    if (!user || !selectedImage || selectedImage === currentImage) return;

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { photoURL: selectedImage },
        { merge: true }
      );
      setPhotoURL(selectedImage);
      setCurrentImage(selectedImage);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Update error:', error);
    }
  };

  const handleAvatarClick = (img) => {
    setSelectedImage(img);
    toast.info('Avatar selected');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 px-4 py-10">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="bg-white rounded-xl w-full max-w-md p-6 text-center shadow-lg relative"
      >
        {/* Header with Back and Close buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => window.history.back()}
            className="text-gray-500 hover:text-blue-600 text-2xl transition-colors"
            aria-label="Go back"
            title="Back"
          >
            <FaArrowLeft />
          </button>
          <button
            onClick={onClose || (() => window.history.back())}
            className="text-gray-500 hover:text-red-600 text-2xl transition-colors"
            aria-label="Close"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Upload Section */}
        <div className="flex flex-col items-center mb-6">
          <FaCloudUploadAlt className="text-blue-800 text-4xl mb-2" />
          <h2 className="text-lg font-semibold">Update Your Profile Picture</h2>
          <p className="text-sm text-gray-500">
            Drag & drop an image here, or click to browse files
          </p>
        </div>

        {/* Image Comparison */}
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
                      selectedImage !== currentImage ? 'border-blue-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="text-xs mt-2 text-gray-500">
                    {selectedImage !== currentImage ? 'New' : 'Same'}
                  </span>
                </>
              ) : (
                <FaUserCircle className="text-gray-400 w-24 h-24" />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => fileRef.current.click()}
            className="bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700 transition flex items-center gap-1"
          >
            Browse Files
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
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Or choose from our avatars:</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {avatars.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Avatar ${idx + 1}`}
                onClick={() => handleAvatarClick(img)}
                className={`h-12 w-12 rounded-full cursor-pointer border-2 transition ${
                  selectedImage === img
                    ? 'border-blue-800 scale-110'
                    : 'border-transparent hover:border-blue-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!selectedImage || selectedImage === currentImage || uploading}
          className={`w-full py-2 px-5 rounded transition text-white flex items-center justify-center gap-2 ${
            !selectedImage || selectedImage === currentImage || uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-800 hover:bg-green-700'
          }`}
        >
          {uploading ? 'Saving...' : 'Save Changes'}
        </button>

        {uploading && (
          <p className="mt-4 text-sm text-gray-500 animate-pulse">
            Uploading your new profile picture...
          </p>
        )}
      </div>
    </div>
  );
}
