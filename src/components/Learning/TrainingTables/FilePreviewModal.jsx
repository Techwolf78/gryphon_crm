import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { FaPencilAlt, FaTimes } from "react-icons/fa";
import PropTypes from 'prop-types';

function FilePreviewModal({ fileUrl, type, trainingId, onClose }) {
  const [studentData, setStudentData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editedRowData, setEditedRowData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (type === "student") {
      fetchStudentData();
    }
  }, [fileUrl, type, trainingId]);

  const fetchStudentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to fetch from Firestore if trainingId exists
      if (trainingId) {
        const docRef = doc(db, "trainingForms", trainingId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().studentDataJson) {
          const data = docSnap.data().studentDataJson;
          setHeaders(Object.keys(data[0] || {}));
          setStudentData(data);
          return; // Exit if data is successfully loaded from Firestore
        }
      }

      // Fallback to fetching from file URL
      if (!fileUrl) {
        throw new Error("No file URL provided");
      }

      const res = await fetch(fileUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch file: ${res.statusText}`);
      }

      const blob = await res.blob();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (!jsonDataRaw.length) {
            throw new Error("Empty Excel file");
          }

          const headersRow = jsonDataRaw[0] || [];
          const formattedData = jsonDataRaw.slice(1).map((row) => {
            const obj = {};
            headersRow.forEach((header, idx) => {
              obj[header] = row[idx] ?? "";
            });
            return obj;
          });

          setHeaders(headersRow);
          setStudentData(formattedData);
        } catch (parseError) {
          console.error("Error parsing Excel file:", parseError);
          setError(`Failed to parse file: ${parseError.message}`);
        }
      };

      reader.onerror = () => {
        throw new Error("Failed to read file");
      };

      reader.readAsArrayBuffer(blob);
    } catch (err) {
      console.error("Error fetching student data:", err);
      setError(err.message || "Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (rowIndex) => {
    setEditRowIndex(rowIndex);
    setEditedRowData({ ...studentData[rowIndex] });
  };

  const cancelEditing = () => {
    setEditRowIndex(null);
    setEditedRowData({});
  };

  const handleEditChange = (key, value) => {
    setEditedRowData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveChanges = async () => {
    if (editRowIndex === null) return;

    try {
      const updatedData = [...studentData];
      updatedData[editRowIndex] = editedRowData;
      setStudentData(updatedData);
      setEditRowIndex(null);
      await saveToFirestore(updatedData);
    } catch (err) {
      console.error("Error saving changes:", err);
      setError("Failed to save changes");
    }
  };

  const saveToFirestore = async (data) => {
    if (!trainingId) {
      setError("No training ID provided - cannot save to database");
      return;
    }

    try {
      const cleanData = data.map((obj) => {
        const cleaned = {};
        for (let key in obj) {
          cleaned[key] = Array.isArray(obj[key]) ? obj[key].join(", ") : obj[key];
        }
        return cleaned;
      });

      const docRef = doc(db, "trainingForms", trainingId);
      await updateDoc(docRef, { 
        studentDataJson: cleanData,
        lastUpdated: new Date() 
      });
    } catch (err) {
      console.error("Failed to save data to Firestore:", err);
      throw err;
    }
  };

  const renderError = () => (
    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700">{error}</span>
        </div>
        <button 
          onClick={() => setError(null)} 
          className="text-red-500 hover:text-red-700"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800">
            {type === "student" ? "Student Data" : "MOU File"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {error && renderError()}

          {type === "student" ? (
            loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : studentData.length > 0 ? (
              <div className="overflow-auto border border-gray-300 rounded-lg shadow">
                <table className="min-w-[1000px] text-sm text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                    <tr>
                      {headers.map((header, idx) => (
                        <th key={idx} className="px-4 py-2 border-b text-gray-700 font-medium whitespace-nowrap bg-gray-100">
                          {header}
                        </th>
                      ))}
                      <th className="px-4 py-2 border-b bg-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition">
                        {headers.map((header, idx) => (
                          <td key={idx} className="px-4 py-2 border-b whitespace-nowrap">
                            {editRowIndex === rowIndex ? (
                              <input
                                type="text"
                                value={editedRowData[header] || ""}
                                onChange={(e) => handleEditChange(header, e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-gray-800">{row[header]}</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2 border-b">
                          {editRowIndex === rowIndex ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={saveChanges}
                                className="text-green-600 hover:text-green-800"
                                aria-label="Save changes"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-red-600 hover:text-red-800"
                                aria-label="Cancel editing"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(rowIndex)}
                              className="text-gray-600 hover:text-blue-800"
                              aria-label="Edit row"
                            >
                              <FaPencilAlt />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No student data available.</p>
                <button
                  onClick={fetchStudentData}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry Loading Data
                </button>
              </div>
            )
          ) : (
            (fileUrl?.endsWith(".pdf") || fileUrl?.includes("/raw/upload/")) ? (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                title="MOU File"
                className="w-full h-[70vh] rounded-xl shadow"
                frameBorder="0"
              />
            ) : (
              <div className="flex justify-center items-center h-32">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View File in New Tab
                </a>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

FilePreviewModal.propTypes = {
  fileUrl: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['student', 'mou']).isRequired,
  trainingId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default FilePreviewModal;