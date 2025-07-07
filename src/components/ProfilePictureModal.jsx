import { useRef, useState } from "react";
import {
  FaCloudUploadAlt,
  FaArrowRight,
  FaUserCircle,
  FaTimes,
  FaSpinner,
  FaCheck,
} from "react-icons/fa";
import { toast } from "react-toastify";

const ProfilePictureModal = ({
  currentImage,
  onClose,
  onSave,
  avatars,
  defaultIcon,
}) => {
  const fileRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (file) => {
    const MAX_SIZE_MB = 10;
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];

    // Validate file
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      toast.error(`Image must be less than ${MAX_SIZE_MB}MB`);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        "Invalid file type. Please upload JPEG, PNG, or WebP images."
      );
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setSelectedImage(null); // Clear previous selection

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "react_profile_upload");

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            setSelectedImage(response.secure_url);
          } else {
            throw new Error("No URL returned from upload");
          }
        } else {
          throw new Error("Upload failed");
        }
      };

      xhr.onerror = () => {
        throw new Error("Upload error occurred");
      };

      xhr.open(
        "POST",
        "https://api.cloudinary.com/v1_1/da0ypp61n/image/upload"
      );
      xhr.send(formData);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (selectedImage) {
      onSave(selectedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-54 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="border-b border-gray-100 p-4 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">
            Update Profile Picture
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={uploading}
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          {/* Image Preview Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-center">
              <div className="relative h-20 w-20 rounded-full bg-gray-100 overflow-hidden mx-auto mb-2">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt="Current"
                    className="h-full w-full object-cover"
                  />
                ) : defaultIcon ? (
                  <img
                    src={defaultIcon}
                    alt="Default"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaUserCircle className="h-full w-full text-gray-300" />
                )}
              </div>
              <span className="text-xs text-gray-500">Current</span>
            </div>

            <FaArrowRight className="text-gray-400 mx-4" />

            <div className="text-center">
              <div className="relative h-20 w-20 rounded-full bg-gray-100 overflow-hidden mx-auto mb-2">
                {/* New image preview with upload indicator */}
                {uploading ? (
                  <>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full">
                      <div className="relative w-3/4">
                        <div className="w-full bg-gray-300 rounded-full h-1.5">
                          <div
                            className="bg-white h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="absolute -bottom-5 left-0 right-0 text-xs text-white font-medium">
                          {uploadProgress}%
                        </span>
                      </div>
                    </div>
                    {defaultIcon && (
                      <img
                        src={defaultIcon}
                        alt="Uploading"
                        className="h-full w-full object-cover opacity-50"
                      />
                    )}
                  </>
                ) : selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="h-full w-full object-cover ring-2 ring-blue-500"
                  />
                ) : defaultIcon ? (
                  <img
                    src={defaultIcon}
                    alt="Default"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaUserCircle className="h-full w-full text-gray-300" />
                )}
              </div>
              <span className="text-xs text-gray-500">
                {uploading ? "Uploading" : selectedImage ? "New" : "No change"}
              </span>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-6">
            <button
              onClick={() => fileRef.current.click()}
              className={`w-full py-3 px-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors flex flex-col items-center justify-center ${
                uploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    Uploading {uploadProgress}%
                  </span>
                </>
              ) : (
                <>
                  <FaCloudUploadAlt className="text-blue-500 text-2xl mb-2" />
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    JPG, PNG up to 10MB
                  </span>
                </>
              )}
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
              disabled={uploading}
            />
          </div>

          {/* Avatar Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Or select an avatar:
            </h4>
            <div className="grid grid-cols-5 gap-3">
              {avatars.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => !uploading && setSelectedImage(img)}
                  className={`aspect-square rounded-full overflow-hidden transition-all ${
                    selectedImage === img
                      ? "ring-2 ring-blue-500 scale-105"
                      : "hover:ring-1 hover:ring-gray-300"
                  } ${uploading ? "opacity-50" : ""}`}
                  disabled={uploading}
                >
                  <img
                    src={img}
                    alt={`Avatar ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedImage || uploading}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center ${
                !selectedImage || uploading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {uploading ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaCheck className="mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureModal;
