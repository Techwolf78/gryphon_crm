import React, { useState, useRef } from "react";
import { FaDownload, FaEye, FaTimes, FaExclamationTriangle, FaCheckCircle, FaSpinner, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx-js-style";
 
const FileUploader = ({
    onFileUpload,
    onFileClear,
    fileError,
    initialFileName = ""
}) => {
    const [fileName, setFileName] = useState(initialFileName);
    const [isProcessing, setIsProcessing] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [errorCells, setErrorCells] = useState({});
    const [hasFileErrors, setHasFileErrors] = useState(false);
    const [fileErrorMsg, setFileErrorMsg] = useState("");
    const [previewData, setPreviewData] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef(null);
 
    const readFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };
 
    const calculateColumnWidths = (data) => {
        const colWidths = [];
        data.forEach((row) => {
            row.forEach((cell, index) => {
                const cellLength = cell ? cell.toString().length : 0;
                colWidths[index] = Math.max(colWidths[index] || 10, cellLength + 5);
            });
        });
        return colWidths.map((width) => ({ wch: width }));
    };
 
    const validateStudentData = (data) => {
        // No validation rules - just check if file has data
        const errors = [];
        const cellErrors = {};
 
        // Check if file has data
        if (!data || data.length === 0) {
            errors.push("File is empty or contains no data");
            setValidationErrors(errors);
            setErrorCells({});
            setHasFileErrors(true);
            setFileErrorMsg("File is empty or contains no data");
            return false;
        }
 
        setValidationErrors(errors);
        setErrorCells(cellErrors);
        setHasFileErrors(false);
        setFileErrorMsg("");
        return true;
    };
 
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return clearFile();
 
        if (file.size > 5 * 1024 * 1024) {
            setHasFileErrors(true);
            setFileErrorMsg("File size exceeds 5MB limit");
            return;
        }
 
        setIsProcessing(true);
        setFileName(file.name);
 
        try {
            const data = await readFile(file);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
           
            // Always call onFileUpload regardless of validation status
            onFileUpload(file, jsonData);
           
            // Validate but don't block upload (no validation rules now)
            validateStudentData(jsonData);
            setPreviewData(jsonData);
        } catch (error) {
            setHasFileErrors(true);
            setFileErrorMsg("Error reading file. Please check the format.");
        } finally {
            setIsProcessing(false);
        }
    };
 
    const clearFile = () => {
        setFileName("");
        setPreviewData([]);
        setValidationErrors([]);
        setErrorCells({});
        setHasFileErrors(false);
        setFileErrorMsg("");
        onFileClear();
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
 
    const generateSampleFile = () => {
        const workbook = XLSX.utils.book_new();
 
        // Main Data Sheet (only headers)
        const header = [
            "SN", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.", "BIRTH DATE", "GENDER",
            "HOMETOWN", "10th PASSING YR", "10th OVERALL MARKS %", "12th PASSING YR", "12th OVERALL MARKS %",
            "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION", "DIPLOMA PASSING YR", "DIPLOMA OVERALL MARKS %",
            "GRADUATION COURSE", "GRADUATION SPECIALIZATION", "GRADUATION PASSING YR", "GRADUATION OVERALL MARKS %",
            "COURSE", "SPECIALIZATION", "PASSING YEAR", "OVERALL MARKS %"
        ];
 
        const data = [header]; // Only headers, no sample data
 
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet["!cols"] = calculateColumnWidths(data);
 
        // Format headers
        header.forEach((_, index) => {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
            worksheet[cellAddress].s = {
                fill: {
                    fgColor: { rgb: (index >= 8 && index <= 19) ? "D9EAD3" : "FAC090" }
                },
                font: { bold: true },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                },
                alignment: { horizontal: "center", vertical: "center" }
            };
        });
 
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Data");
 
        // Instructions Sheet (simplified without validation rules)
        const instructionsData = [
            ["STUDENT DATA FILE INSTRUCTIONS"],
            [""],
            ["FIELD NAME", "DESCRIPTION"],
            ["SN", "Sequential number"],
            ["FULL NAME OF STUDENT", "Full name of student"],
            ["CURRENT COLLEGE NAME", "Name of current college"],
            ["EMAIL ID", "Email address"],
            ["MOBILE NO.", "Mobile number"],
            ["BIRTH DATE", "Date of birth"],
            ["GENDER", "Gender"],
            ["HOMETOWN", "Hometown/city"],
            ["10th PASSING YR", "10th passing year"],
            ["10th OVERALL MARKS %", "10th overall marks percentage"],
            ["12th PASSING YR", "12th passing year"],
            ["12th OVERALL MARKS %", "12th overall marks percentage"],
            ["DIPLOMA COURSE", "Diploma course name if applicable"],
            ["DIPLOMA SPECIALIZATION", "Diploma specialization if applicable"],
            ["DIPLOMA PASSING YR", "Diploma passing year if applicable"],
            ["DIPLOMA OVERALL MARKS %", "Diploma overall marks percentage if applicable"],
            ["GRADUATION COURSE", "Graduation course name"],
            ["GRADUATION SPECIALIZATION", "Graduation specialization"],
            ["GRADUATION PASSING YR", "Graduation passing year"],
            ["GRADUATION OVERALL MARKS %", "Graduation overall marks percentage"],
            ["COURSE", "Course name"],
            ["SPECIALIZATION", "Specialization"],
            ["PASSING YEAR", "Passing year"],
            ["OVERALL MARKS %", "Overall marks percentage"]
        ];
 
        const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
        instructionsSheet["!cols"] = [
            { wch: 25 }, // Field Name
            { wch: 40 }  // Description
        ];
 
        // Format instructions sheet
        const instructionsRange = XLSX.utils.decode_range(instructionsSheet["!ref"]);
        for (let R = 0; R <= instructionsRange.e.r; ++R) {
            for (let C = 0; C <= instructionsRange.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!instructionsSheet[cellAddress]) continue;
               
                instructionsSheet[cellAddress].s = {
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    },
                    alignment: { vertical: "center" }
                };
 
                if (R === 0) {
                    // Title row
                    instructionsSheet[cellAddress].s.font = { bold: true, size: 16 };
                    instructionsSheet[cellAddress].s.alignment = { horizontal: "center" };
                } else if (R === 2) {
                    // Header row
                    instructionsSheet[cellAddress].s.font = { bold: true };
                    instructionsSheet[cellAddress].s.fill = { fgColor: { rgb: "D9EAD3" } };
                }
            }
        }
 
        // Merge title row
        instructionsSheet["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
        ];
 
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
        XLSX.writeFile(workbook, "Student_Data_Template.xlsx");
    };
 
    return (
        <div className="space-y-2 mt-4">
            {/* Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-blue-700 transition">
                    <FaFileExcel />
                    {fileName ? "Replace File" : "Upload Student Excel"}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>
                <button onClick={generateSampleFile} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                    <FaDownload className="text-blue-600" />
                    Download Template
                </button>
                {fileName && (
                    <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200">
                        <FaEye />
                        Preview
                    </button>
                )}
            </div>
 
            {fileName && (
                <div className="text-sm text-gray-700 flex items-center gap-4 mt-1">
                    <div><strong>File:</strong> {fileName}</div>
                    <div>
                        <strong>Size:</strong>{" "}
                        {(
                            (fileInputRef.current?.files?.[0]?.size || 0) / 1024
                        ).toFixed(2)}{" "}
                        KB
                    </div>
                </div>
            )}
 
            {/* Status */}
            {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                    <FaSpinner className="animate-spin" />
                    Processing file...
                </div>
            )}
            {fileError && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                    <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                    <span>{fileError}</span>
                </div>
            )}
            {hasFileErrors && !isProcessing && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                    <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                    <span>{fileErrorMsg}</span>
                </div>
            )}
            {fileName && !hasFileErrors && !isProcessing && (
                <div className="flex items-start gap-2 text-sm text-green-600">
                    <FaCheckCircle className="mt-0.5 flex-shrink-0" />
                    <span>File is ready for upload</span>
                </div>
            )}
 
            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white max-h-[80vh] max-w-6xl overflow-auto p-6 rounded-lg shadow-lg relative">
                        <button className="absolute top-3 right-3 text-red-600 hover:text-red-800" onClick={() => setShowPreview(false)}>
                            <FaTimes size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Student File Preview</h2>
                        {validationErrors.length > 0 && (
                            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500">
                                <div className="flex items-center gap-2 text-red-700 font-bold">
                                    <FaExclamationTriangle />
                                    <h3>File Issues ({validationErrors.length})</h3>
                                </div>
                                <ul className="list-disc pl-5 text-red-600 mt-2">
                                    {validationErrors.map((error, index) => (
                                        <li key={index} className="py-1">{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="overflow-auto">
                            <table className="table-auto border-collapse w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-200">
                                        {previewData[0]?.map((header, index) => (
                                            <th key={index} className="border px-3 py-2 font-bold">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.slice(1).map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, colIndex) => {
                                                const cellKey = `${rowIndex}-${colIndex}`;
                                                const hasError = errorCells[cellKey];
                                                return (
                                                    <td key={colIndex} className={`border px-3 py-2 text-center ${hasError ? "bg-red-100 border-red-500" : ""}`}>
                                                        {cell || ""}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
 
export default FileUploader;