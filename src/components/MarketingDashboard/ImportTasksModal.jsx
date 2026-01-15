import React, { useState } from 'react';
import { FiX, FiUpload } from 'react-icons/fi';

const ImportTasksModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid JSON file.');
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate that it's an array of tasks
      if (!Array.isArray(data)) {
        throw new Error('JSON must contain an array of tasks.');
      }

      // Basic validation for each task
      for (const task of data) {
        if (!task.description && !task.title) {
          throw new Error('Each task must have a description or title.');
        }
      }

      await onImport(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to import tasks.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Import Tasks from JSON</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-light"
          >
            <FiX />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select JSON File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Importing...
              </>
            ) : (
              <>
                <FiUpload />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportTasksModal;