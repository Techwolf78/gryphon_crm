import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { FaPencilAlt } from "react-icons/fa";

function FilePreviewModal({ fileUrl, type, trainingId, onClose }) {
  const [studentData, setStudentData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editedRowData, setEditedRowData] = useState({});

  useEffect(() => {
    if (type === "student") {
      fetchStudentData();
    }
  }, [fileUrl]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "trainingForms", trainingId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().studentDataJson) {
        const data = docSnap.data().studentDataJson;
        setHeaders(Object.keys(data[0] || {}));
        setStudentData(data);
      } else {
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const headersRow = jsonDataRaw[0];
          const formattedData = jsonDataRaw.slice(1).map((row) => {
            const obj = {};
            headersRow.forEach((header, idx) => {
              obj[header] = row[idx] || "";
            });
            return obj;
          });

          setHeaders(headersRow);
          setStudentData(formattedData);
        };
        reader.readAsArrayBuffer(blob);
      }
    } catch (err) {
      console.error("Error fetching student data:", err);
      alert("Failed to load student data.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (rowIndex) => {
    setEditRowIndex(rowIndex);
    setEditedRowData({ ...studentData[rowIndex] });
  };

  const handleEditChange = (key, value) => {
    setEditedRowData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveChanges = async () => {
    const updatedData = [...studentData];
    updatedData[editRowIndex] = editedRowData;
    setStudentData(updatedData);
    setEditRowIndex(null);
    await saveToFirestore(updatedData);
  };

  const saveToFirestore = async (data) => {
    try {
      const cleanData = data.map((obj) => {
        const cleaned = {};
        for (let key in obj) {
          cleaned[key] = Array.isArray(obj[key]) ? obj[key].join(", ") : obj[key];
        }
        return cleaned;
      });

      const docRef = doc(db, "trainingForms", trainingId);
      await updateDoc(docRef, { studentDataJson: cleanData });
      alert("Student data saved successfully.");
    } catch (err) {
      console.error("Failed to save data to Firestore:", err);
      alert("Error saving data.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-54">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800">
            {type === "student" ? "Student Data" : "MOU File"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {type === "student" ? (
            loading ? (
              <p className="text-center text-gray-500">Loading student data...</p>
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
                                className="w-full border rounded px-2 py-1"
                              />
                            ) : (
                              row[header]
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2 border-b">
                          <button
                            onClick={() => startEditing(rowIndex)}
                            className="text-gray-600 hover:text-blue-800"
                          >
                            <FaPencilAlt />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500">No student data available.</p>
            )
          ) : (
            (fileUrl?.endsWith(".pdf") || fileUrl?.includes("/raw/upload/")) ? (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                title="MOU File"
                className="w-full h-[70vh] rounded-xl shadow"
              />
            ) : (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View File
              </a>
            )
          )}
        </div>

        {/* Save Changes Button */}
        {type === "student" && editRowIndex !== null && (
          <div className="pt-4">
            <button
              onClick={saveChanges}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilePreviewModal;
