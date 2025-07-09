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
        const errors = [];
        const cellErrors = {};

        const expectedHeader = [
            "SN", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.", "BIRTH DATE", "GENDER",
            "HOMETOWN", "10th PASSING YR", "10th OVERALL MARKS %", "12th PASSING YR", "12th OVERALL MARKS %",
            "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION", "DIPLOMA PASSING YR", "DIPLOMA OVERALL MARKS %",
            "GRADUATION COURSE", "GRADUATION SPECIALIZATION", "GRADUATION PASSING YR", "GRADUATION OVERALL MARKS %",
            "COURSE", "SPECIALIZATION", "PASSING YEAR", "OVERALL MARKS %"
        ];

        const headerRow = data[0] || [];
        const headerMismatch = expectedHeader.some((expected, index) => expected !== headerRow[index]);

        if (headerMismatch || headerRow.length !== expectedHeader.length) {
            errors.push("Header mismatch! Please use the correct sample file format.");
            setValidationErrors(errors);
            setErrorCells({});
            setHasFileErrors(true);
            setFileErrorMsg("Header mismatch! Please use the correct sample file format.");
            return false;
        }

        const columnRules = {
            "SN": { type: "number", mandatory: true },
            "FULL NAME OF STUDENT": { type: "string", mandatory: true },
            "CURRENT COLLEGE NAME": { type: "string", mandatory: true },
            "EMAIL ID": { type: "email", mandatory: true },
            "MOBILE NO.": { type: "phone", mandatory: true },
            "BIRTH DATE": { type: "date", mandatory: true },
            "GENDER": { type: "string", mandatory: true },
            "HOMETOWN": { type: "string", mandatory: false },
            "10th PASSING YR": { type: "year", mandatory: true },
            "10th OVERALL MARKS %": { type: "number", min: 0, max: 100, mandatory: true },
            "12th PASSING YR": { type: "year", mandatory: false },
            "12th OVERALL MARKS %": { type: "number", min: 0, max: 100, mandatory: false },
            "DIPLOMA COURSE": { type: "string", mandatory: false },
            "DIPLOMA SPECIALIZATION": { type: "string", mandatory: false },
            "DIPLOMA PASSING YR": { type: "year", mandatory: false },
            "DIPLOMA OVERALL MARKS %": { type: "number", min: 0, max: 100, mandatory: false },
            "GRADUATION COURSE": { type: "string", mandatory: false },
            "GRADUATION SPECIALIZATION": { type: "string", mandatory: false },
            "GRADUATION PASSING YR": { type: "year", mandatory: false },
            "GRADUATION OVERALL MARKS %": { type: "number", min: 0, max: 100, mandatory: false },
            "COURSE": { type: "string", mandatory: false },
            "SPECIALIZATION": { type: "string", mandatory: false },
            "PASSING YEAR": { type: "year", mandatory: false },
            "OVERALL MARKS %": { type: "number", min: 0, max: 100, mandatory: false }
        };

        data.slice(1).forEach((row, rowIndex) => {
            const rowNum = rowIndex + 2;
            Object.entries(columnRules).forEach(([colName, rules]) => {
                const colIndex = headerRow.indexOf(colName);
                if (colIndex === -1) return;
                const cellValue = row[colIndex];
                
                // Check mandatory fields
                if (rules.mandatory && (cellValue === undefined || cellValue === "")) {
                    errors.push(`Row ${rowNum}: ${colName} is mandatory`);
                    cellErrors[`${rowIndex}-${colIndex}`] = "Mandatory field";
                    return;
                }

                if (cellValue === undefined || cellValue === "") return;

                switch (rules.type) {
                    case "number":
                        if (isNaN(Number(cellValue))) {
                            errors.push(`Row ${rowNum}: ${colName} must be a number`);
                            cellErrors[`${rowIndex}-${colIndex}`] = "Must be a number";
                        } else if (rules.min !== undefined && Number(cellValue) < rules.min) {
                            errors.push(`Row ${rowNum}: ${colName} must be ≥ ${rules.min}`);
                            cellErrors[`${rowIndex}-${colIndex}`] = `Minimum ${rules.min}`;
                        } else if (rules.max !== undefined && Number(cellValue) > rules.max) {
                            errors.push(`Row ${rowNum}: ${colName} must be ≤ ${rules.max}`);
                            cellErrors[`${rowIndex}-${colIndex}`] = `Maximum ${rules.max}`;
                        }
                        break;
                    case "year":
                        if (isNaN(Number(cellValue))) {
                            errors.push(`Row ${rowNum}: ${colName} must be a valid year`);
                            cellErrors[`${rowIndex}-${colIndex}`] = "Must be a valid year";
                        } else {
                            const year = Number(cellValue);
                            const currentYear = new Date().getFullYear();
                            if (year < 1900 || year > currentYear + 5) {
                                errors.push(`Row ${rowNum}: ${colName} must be between 1900 and ${currentYear + 5}`);
                                cellErrors[`${rowIndex}-${colIndex}`] = `Year 1900-${currentYear + 5}`;
                            }
                        }
                        break;
                    case "string":
                        if (typeof cellValue !== "string") {
                            errors.push(`Row ${rowNum}: ${colName} must be text`);
                            cellErrors[`${rowIndex}-${colIndex}`] = "Must be text";
                        }
                        break;
                    case "email":
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(cellValue)) {
                            errors.push(`Row ${rowNum}: Invalid email format in ${colName}`);
                            cellErrors[`${rowIndex}-${colIndex}`] = "Invalid email format";
                        }
                        break;
                    case "phone":
                        const phoneRegex = /^[0-9]{10}$/;
                        if (!phoneRegex.test(String(cellValue))) {
                            errors.push(`Row ${rowNum}: ${colName} must be 10 digits`);
                            cellErrors[`${rowIndex}-${colIndex}`] = "Must be 10 digits";
                        }
                        break;
                    case "date":
                        if (isNaN(Date.parse(cellValue))) {
                            errors.push(`Row ${rowNum}: Invalid date format in ${colName} (use DD-MMM-YY)`);
                            cellErrors[`${rowIndex}-${colIndex}`] = "Invalid date format";
                        }
                        break;
                }
            });
        });

        setValidationErrors(errors);
        setErrorCells(cellErrors);
        const hasErrors = errors.length > 0;
        setHasFileErrors(hasErrors);
        setFileErrorMsg(hasErrors ? `File contains ${errors.length} validation error(s). Please check and correct them.` : "");
        return !hasErrors;
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
            validateStudentData(jsonData);
            setPreviewData(jsonData);
            onFileUpload(file);
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

        // Instructions Sheet
        const instructionsData = [
            ["STUDENT DATA FILE INSTRUCTIONS"],
            [""],
            ["FIELD NAME", "DATA TYPE", "MANDATORY", "VALIDATION RULES"],
            ["SN", "Number", "Yes", "Sequential number"],
            ["FULL NAME OF STUDENT", "Text", "Yes", "Full name of student"],
            ["CURRENT COLLEGE NAME", "Text", "Yes", "Name of current college"],
            ["EMAIL ID", "Email", "Yes", "Valid email format"],
            ["MOBILE NO.", "Phone", "Yes", "10 digits only"],
            ["BIRTH DATE", "Date", "Yes", "Date format (DD-MMM-YY)"],
            ["GENDER", "Text", "Yes", "MALE/FEMALE/OTHER"],
            ["HOMETOWN", "Text", "No", "Hometown/city"],
            ["10th PASSING YR", "Year", "Yes", "Valid year (1900-current year+5)"],
            ["10th OVERALL MARKS %", "Number", "Yes", "0-100"],
            ["12th PASSING YR", "Year", "No", "Valid year (1900-current year+5)"],
            ["12th OVERALL MARKS %", "Number", "No", "0-100"],
            ["DIPLOMA COURSE", "Text", "No", "Diploma course name if applicable"],
            ["DIPLOMA SPECIALIZATION", "Text", "No", "Diploma specialization if applicable"],
            ["DIPLOMA PASSING YR", "Year", "No", "Valid year if applicable"],
            ["DIPLOMA OVERALL MARKS %", "Number", "No", "0-100 if applicable"],
            ["GRADUATION COURSE", "Text", "No", "Graduation course name"],
            ["GRADUATION SPECIALIZATION", "Text", "No", "Graduation specialization"],
            ["GRADUATION PASSING YR", "Year", "No", "Valid year"],
            ["GRADUATION OVERALL MARKS %", "Number", "No", "0-100"],
            ["COURSE", "Text", "No", "Course name"],
            ["SPECIALIZATION", "Text", "No", "Specialization"],
            ["PASSING YEAR", "Year", "No", "Valid year"],
            ["OVERALL MARKS %", "Number", "No", "0-100"]
        ];

        const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
        instructionsSheet["!cols"] = [
            { wch: 25 }, // Field Name
            { wch: 15 }, // Data Type
            { wch: 10 }, // Mandatory
            { wch: 40 }  // Validation Rules
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
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }
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
                    <button onClick={() => setShowPreview(true)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md ${hasFileErrors ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
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
                                    <h3>Validation Errors ({validationErrors.length})</h3>
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