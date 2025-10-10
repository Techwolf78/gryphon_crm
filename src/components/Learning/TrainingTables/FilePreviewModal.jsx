import React, { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx-js-style";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

import { FaPencilAlt, FaTimes, FaCheck, FaFilePdf, FaExternalLinkAlt } from "react-icons/fa";
import { collection, getDocs } from "firebase/firestore";
import { FiDownload } from "react-icons/fi";

function FilePreviewModal({ fileUrl, type, trainingId, onClose }) {
  const [studentData, setStudentData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editedRowData, setEditedRowData] = useState({});
  const [error, setError] = useState(null); // Add this line

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (type === "student" && trainingId) {
      fetchStudentData();
    }

  }, [trainingId, type, fetchStudentData]);

  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const studentsRef = collection(db, "trainingForms", trainingId, "students");
      const snapshot = await getDocs(studentsRef);
      const students = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to readable strings
        Object.keys(data).forEach(key => {
          if (data[key] && typeof data[key] === 'object' && 'seconds' in data[key] && 'nanoseconds' in data[key]) {
            data[key] = new Date(data[key].seconds * 1000).toLocaleString();
          }
        });
        return { id: doc.id, ...data };
      });

      if (students.length > 0) {
        setHeaders(Object.keys(students[0]).filter(key => key !== 'id'));
      }
      setStudentData(students);
    } catch (err) {
      console.error("Error fetching student data:", err);
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

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

    setIsSaving(true);
    try {
      const updatedData = [...studentData];
      updatedData[editRowIndex] = { ...updatedData[editRowIndex], ...editedRowData };
      setStudentData(updatedData);
      await saveToFirestore(updatedData);
      setEditRowIndex(null);
    } catch (error) {
      console.error("Error saving changes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveToFirestore = async (data) => {
    if (!trainingId) {
      setError("No training ID provided - cannot save to database");
      return;
    }

    const batchUpdates = data.map(student => {
      const studentDocRef = doc(db, "trainingForms", trainingId, "students", student.id);
      return setDoc(studentDocRef, student);
    });

    await Promise.all(batchUpdates);
  };


  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(studentData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Data");

    // Apply some basic styling
    if (ws["!ref"]) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        ws[headerCell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "D3D3D3" } }
        };
      }
    }

    XLSX.writeFile(wb, `StudentData_${trainingId}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-54 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-50 to-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {type === "student" ? "Student Data" : "Document Viewer"}
            </h2>
            {type === "student" && studentData.length > 0 && (
              <p className="text-sm text-gray-500">
                Showing {studentData.length} records
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {type === "student" && studentData.length > 0 && (
              <button
                onClick={exportToExcel}
                className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <FiDownload className="mr-2" />
                Export
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Error display - added here */}
          {error && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {type === "student" ? (
            loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : studentData.length > 0 ? (
              <div className="relative overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                <table className="min-w-full text-sm text-left">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b">
                      {headers.map((header, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap"
                        >
                          {header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </th>
                      ))}
                      <th className="px-4 py-3 font-medium text-gray-700 w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {studentData.map((row, rowIndex) => (
                      <tr
                        key={row.id || rowIndex}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        {headers.map((header, idx) => (
                          <td
                            key={idx}
                            className="px-4 py-3 whitespace-nowrap"
                          >
                            {editRowIndex === rowIndex ? (
                              <input
                                type={typeof row[header] === 'string' && row[header].match(/^\d{1,2}\/\d{1,2}\/\d{4}/) ? "date" : "text"}
                                value={editedRowData[header] || ""}
                                onChange={(e) => handleEditChange(header, e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <span className={!row[header] ? "text-gray-400 italic" : ""}>
                                {(() => {
                                  const value = row[header];
                                  if (!value) return "N/A";
                                  if (typeof value === 'object') {
                                    return JSON.stringify(value); // fallback for unexpected objects
                                  }
                                  return value;
                                })()}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editRowIndex === rowIndex ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={saveChanges}

                                disabled={isSaving}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                aria-label="Save changes"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                aria-label="Cancel editing"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(rowIndex)}

                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              aria-label="Edit row"
                            >
                              <FaPencilAlt size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (

              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="mb-4">No student data available</p>
                <button
                  onClick={fetchStudentData}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >

                  Refresh Data
                </button>
              </div>
            )
          ) : (

            <div className="flex flex-col items-center justify-center h-full">
              {fileUrl?.endsWith(".pdf") || fileUrl?.includes("/raw/upload/") ? (
                <>
                  <div className="mb-4 text-blue-600">
                    <FaFilePdf size={48} />
                  </div>
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                    title="Document Viewer"
                    className="w-full h-[70vh] rounded-lg shadow border"
                  />
                </>
              ) : (
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <p className="mb-4">This file type cannot be previewed directly</p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <FaExternalLinkAlt className="mr-2" />
                    Open File
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {type === "student" && editRowIndex !== null && (
          <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 flex items-center"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


export default FilePreviewModal;
