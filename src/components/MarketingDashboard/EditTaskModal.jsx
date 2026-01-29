import React, { useState, useEffect, useRef } from 'react';
import ImageCompressor from 'image-compressor.js';

const EditTaskModal = ({ task, isOpen, onClose, onSave, assignees }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [role, setRole] = useState('');
  const [images, setImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (dateStr.toDate) return dateStr.toDate();
    if (typeof dateStr === 'string') {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [p1, p2, p3] = parts.map(Number);
        if (p1 > 31) { // YYYY-MM-DD
          return new Date(p1, p2 - 1, p3);
        } else if (p3 > 31) { // DD-MM-YYYY
          return new Date(p3, p2 - 1, p1);
        }
      }
      return new Date(dateStr);
    }
    return null;
  };

  const formatDateForInput = (dateValue) => {
    const date = parseDate(dateValue);
    if (!date || isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (task) {
      setTitle(task.description || task.title || '');
      setStartDate(formatDateForInput(task.startDate));
      setDueDate(formatDateForInput(task.dueDate));
      setAssignedTo(task.assignedTo || '');
      setRole(task.role || '');
      setImages(task.images || []);
    }
  }, [task]);

  const uploadImage = async (file) => {
    if (!file) return null;

    try {
      setUploadingImage(true);

      // Compress the image
      const compressedFile = await new Promise((resolve, reject) => {
        new ImageCompressor(file, {
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
          success: resolve,
          error: reject,
        });
      });

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', 'react_profile_upload');
      formData.append('cloud_name', 'da0ypp61n');

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/da0ypp61n/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB
      const skippedSize = files.length - validFiles.length;
      const maxToAdd = 20 - images.length;
      const finalValidFiles = validFiles.slice(0, maxToAdd);
      const skippedTotal = validFiles.length - finalValidFiles.length;

      if (skippedSize > 0 || skippedTotal > 0) {
        let message = '';
        if (skippedSize > 0) {
          message += `${skippedSize} file${skippedSize > 1 ? 's' : ''} exceed${skippedSize > 1 ? '' : 's'} 10MB limit and were ignored. `;
        }
        if (skippedTotal > 0) {
          message += `${skippedTotal} file${skippedTotal > 1 ? 's' : ''} exceed${skippedTotal > 1 ? '' : 's'} the total limit of 20 images and were ignored. `;
        }
        message += `${finalValidFiles.length} file${finalValidFiles.length > 1 ? 's' : ''} accepted.`;
        alert(message);
      }

      setNewImageFiles(finalValidFiles);
      const previews = finalValidFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(previews).then(setNewImagePreviews);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addNewImage = async () => {
    if (newImageFiles.length === 0) return;

    try {
      setUploadingImage(true);
      const uploadPromises = newImageFiles.map(file => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      setImages([...images, ...urls]);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      alert('Failed to upload some images. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const clearNewImage = () => {
    setNewImageFiles([]);
    setNewImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (task) {
      const taskData = {
        description: title || null,
        startDate: startDate ? parseDate(startDate) : null,
        dueDate: dueDate ? parseDate(dueDate) : null,
        assignedTo: assignedTo || null,
        role: role || null,
        images: images,
      };
      onSave(task.id, taskData);
      onClose();
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-54 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-4 max-w-md w-full mx-4 max-h-[90vh] flex flex-col border border-gray-200">
        <div className="flex justify-center items-center mb-2 shrink-0 relative">
          <h2 className="text-base font-semibold text-gray-900">Edit Task</h2>
          <button
            onClick={onClose}
            className="absolute right-0 text-gray-400 hover:text-gray-600 text-lg font-light"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              placeholder="Enter task title"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select assignee...</option>
              {assignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select role (optional)</option>
              <option value="Video Editor">Video Editor</option>
              <option value="Graphic Designer">Graphic Designer</option>
              <option value="Manager">Manager</option>
              <option value="Developer">Developer</option>
              <option value="Content Writer">Content Writer</option>
            </select>
          </div>

          {/* Images Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images
            </label>

            {/* Existing Images */}
            {images.length > 0 && (
              <div className="mb-2">
                <p className="text-sm text-gray-600 mb-1">Current images:</p>
                <div className="grid grid-cols-4 gap-1 px-1">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Task image ${index + 1}`}
                        className="w-full h-12 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center shadow-md"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Image */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewImageChange}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-1 file:py-0.5 file:px-2 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 bg-white"
                />
                {newImagePreviews.length > 0 && (
                  <button
                    type="button"
                    onClick={clearNewImage}
                    className="px-2 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {newImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {newImagePreviews.map((preview, index) => (
                    <img
                      key={index}
                      src={preview}
                      alt={`New image ${index + 1}`}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                    />
                  ))}
                  <button
                    onClick={addNewImage}
                    disabled={uploadingImage}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadingImage ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </div>
                    ) : (
                      `Add ${newImagePreviews.length} image${newImagePreviews.length > 1 ? 's' : ''}`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2 shrink-0 pt-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-blue-600 bg-transparent rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={newImagePreviews.length > 0}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;