import React, { useEffect, useState, useRef } from "react";
import ImageCompressor from "image-compressor.js";
import { FiPaperclip, FiX, FiEdit2 } from "react-icons/fi";

const EditTaskModal = ({ task, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: task?.title || "",
    assignedTo: task?.assignedTo || "",
    role: task?.role || "",
    startDate: task?.startDate || "",
    dueDate: task?.dueDate || "",
    images: task?.images || []
  });
  const [newImages, setNewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        assignedTo: task.assignedTo || "",
        role: task.role || "",
        startDate: task.startDate || "",
        dueDate: task.dueDate || "",
        images: task.images || []
      });
      setNewImages([]);
      setImagePreviews([]);
    }
  }, [task]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPreviews = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setNewImages(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const removeImagePreview = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageIndex) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== imageIndex)
    }));
  };

  const uploadImages = async () => {
    if (newImages.length === 0) return [];

    setUploadingImages(true);
    try {
      const uploadPromises = newImages.map(async (file) => {
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
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      return uploadedUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Task title is required");
      return;
    }

    try {
      let uploadedImageUrls = [];
      if (newImages.length > 0) {
        uploadedImageUrls = await uploadImages();
      }

      const updatedTaskData = {
        ...formData,
        images: [...formData.images, ...uploadedImageUrls]
      };

      onSave(task.id, updatedTaskData);
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0  bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-54 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Edit Task</h2>
              <p className="text-blue-100 text-xs mt-1">Update task details and manage attachments</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-120px)]">
          <div className="space-y-4">
            {/* Basic Information Section */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
                    placeholder="Enter task title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
                    placeholder="Assignee name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
                  >
                    <option value="">Select role (optional)</option>
                    <option value="Video Editor">Video Editor</option>
                    <option value="Graphic Designer">Graphic Designer</option>
                    <option value="Manager">Manager</option>
                    <option value="Developer">Developer</option>
                    <option value="Content Writer">Content Writer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dates Section */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(formData.startDate)}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(formData.dueDate)}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
                Attachments
              </h3>

              {/* Existing Images */}
              {formData.images && formData.images.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Current Images:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images Preview */}
              {imagePreviews.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">New Images:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview.preview}
                          alt={`New ${index + 1}`}
                          className="w-full h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removeImagePreview(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex items-center justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImages ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <FiPaperclip className="w-3 h-3 text-gray-500" />
                      <span className="text-sm text-gray-600">Add Images</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={uploadingImages}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {uploadingImages ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiEdit2 className="w-3 h-3" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;