import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import * as XLSX from "xlsx";

function FilePreviewModal({ fileUrl, type, onClose }) {
  const [studentData, setStudentData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type === "student") fetchStudentData();
  }, [fileUrl]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setStudentData(jsonData);
      };
      reader.readAsArrayBuffer(blob);
    } catch (err) {
      console.error("Error fetching student data:", err);
      alert("Failed to load student data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-6xl relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-3 right-3 text-red-500">
          <FaTimes size={20} />
        </button>

        {type === "student" ? (
          <>
            <h2 className="text-xl font-bold mb-4 text-blue-800">Student Data</h2>
            {loading ? (
              <p>Loading...</p>
            ) : studentData.length > 0 ? (
              <div className="overflow-x-auto border border-gray-300 rounded">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      {studentData[0].map((header, idx) => (
                        <th key={idx} className="p-2 border">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex} className="odd:bg-white even:bg-gray-50">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="p-2 border">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No student data available.</p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-blue-800">MOU File</h2>
            <iframe
              src={fileUrl}
              title="MOU Preview"
              className="w-full h-[70vh] border rounded"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default FilePreviewModal;
