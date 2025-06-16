import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { get, set, ref } from 'firebase/database';
import { realtimeDb } from '../firebase';
import { toast } from 'react-toastify';
import { FaCloudUploadAlt, FaCamera } from 'react-icons/fa';
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

export default function UpdateProfile() {
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

  const handleRemove = () => {
    setSelectedImage('');
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
        className="bg-white border-2 border-dashed border-purple-300 rounded-xl w-full max-w-md p-6 text-center shadow-lg"
      >
        <div className="flex flex-col items-center mb-6">
          <FaCloudUploadAlt className="text-purple-600 text-4xl mb-2" />
          <h2 className="text-lg font-semibold">Upload a file</h2>
          <p className="text-sm text-gray-500">
            Drag or paste a file here, or choose an option below.
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => fileRef.current.click()}
            className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition"
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

        {selectedImage && (
          <div className="mb-6">
            <img
              src={selectedImage}
              alt="Preview"
              className="w-32 h-32 mx-auto rounded-full object-cover object-top border-4 border-purple-400"
            />
            <p className="text-sm text-gray-600 mt-2">Selected Image Preview</p>
          </div>
        )}

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
                selectedImage === img ? 'border-purple-600 scale-110' : 'hover:border-purple-400'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleSave}
            className="bg-green-600 text-white py-2 px-5 rounded hover:bg-green-700 transition"
          >
            Save
          </button>
          <button
            onClick={handleRemove}
            className="bg-red-500 text-white py-2 px-5 rounded hover:bg-red-600 transition"
          >
            Remove
          </button>
        </div>

        {uploading && (
          <p className="mt-4 text-sm text-gray-500 animate-pulse">Uploading...</p>
        )}
      </div>
    </div>
  );
}
