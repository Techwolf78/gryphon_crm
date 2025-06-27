import React from "react";
import { FaTimes } from "react-icons/fa";

function MOUFileModal({ fileUrl, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-3 right-3 text-red-500">
          <FaTimes size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-blue-800">MOU File</h2>

        {fileUrl ? (
          <iframe
            src={fileUrl}
            title="MOU File"
            className="w-full h-[70vh]"
          />
        ) : (
          <p>MOU file not available.</p>
        )}
      </div>
    </div>
  );
}

export default MOUFileModal;
