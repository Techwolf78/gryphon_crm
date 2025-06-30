import React, { useState } from "react";
import { FaPlus, FaTrash, FaDownload, FaEye, FaTimes, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import * as XLSX from "xlsx-js-style";
import { toast } from "react-toastify";
 
const inputClass = "w-full px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const selectClass = "w-full px-3 py-2 border rounded-lg border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const fileInputClass = "block text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100";
 
const courseOptions = ["Engineering", "MBA", "BBA", "BCA", "MCA", "Diploma", "BSC", "MSC", "Others"];
const courseYears = {
  Engineering: ["1st", "2nd", "3rd", "4th"],
  MBA: ["1st", "2nd"],
  BBA: ["1st", "2nd", "3rd"],
  BCA: ["1st", "2nd", "3rd"],
  BSC: ["1st", "2nd", "3rd"],
  MCA: ["1st", "2nd"],
  Diploma: ["1st", "2nd", "3rd"],
  MSC: ["1st", "2nd"],
  Others: ["1st", "2nd"]
};
 
const deliveryTypes = [
  { value: "TP", label: "TP - Training Placement" },
  { value: "OT", label: "OT - Only Training" },
  { value: "IP", label: "IP - Induction Program" },
  { value: "DM", label: "DM - Digital Marketing" },
  { value: "SNS", label: "SNS - SNS" }
];
 
const courseSpecializations = {
  Engineering: ["CS", "IT", "ENTC", "CS-Cyber Security", "Mechanical", "Civil", "Electrical", "Chemical", "CS-AI-ML", "CS-AI-DS", "Other"],
  MBA: ["Marketing", "Finance", "HR", "Operations", "Other"],
  BBA: ["International Business", "General", "Finance", "Other"],
  BCA: ["Computer Applications", "Other"],
  MCA: ["Computer Science", "Other"],
  Diploma: ["Mechanical", "Civil", "Electrical", "Computer", "Other"],
  BSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
  MSC: ["Physics", "Chemistry", "Mathematics", "CS", "Other"],
  Others: ["Other"]
};
 
const generatePassingYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => `${currentYear - 5 + i}-${currentYear - 4 + i}`);
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
 
const StudentBreakdownSection = ({ formData, setFormData, studentFile, setStudentFile, studentFileError }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [errorCells, setErrorCells] = useState({});
  const [hasFileErrors, setHasFileErrors] = useState(false);
  const [fileErrorMsg, setFileErrorMsg] = useState("");
 
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
 
  const updateCourseDetail = (index, field, value) => {
    const updated = [...formData.courses];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, courses: updated }));
  };
 
  const addCourseField = () => {
    setFormData(prev => ({ ...prev, courses: [...prev.courses, { specialization: "", othersSpecText: "", students: "" }] }));
  };
 
  const removeCourseField = (index) => {
    const updated = [...formData.courses];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, courses: updated }));
  };
 
  const validateStudentData = (data) => {
    const errors = [];
    const cellErrors = {};
    const headerRow = data[0] || [];
   
    // Define validation rules for each column
    const columnRules = {
      "SN": { type: "number" },
      "FULL NAME OF STUDENT": { type: "string" },
      "CURRENT COLLEGE NAME": { type: "string" },
      "EMAIL ID": { type: "email" },
      "MOBILE NO.": { type: "phone" },
      "BIRTH DATE": { type: "date" },
      "GENDER": { type: "string" },
      "HOMETOWN": { type: "string" },
      "10th PASSING YR": { type: "year" },
      "10th OVERALL MARKS %": { type: "number", min: 0, max: 100 },
      "12th PASSING YR": { type: "year" },
      "12th OVERALL MARKS %": { type: "number", min: 0, max: 100 },
      "DIPLOMA COURSE": { type: "string" },
      "DIPLOMA SPECIALIZATION": { type: "string" },
      "DIPLOMA PASSING YR": { type: "year" },
      "DIPLOMA OVERALL MARKS %": { type: "number", min: 0, max: 100 },
      "GRADUATION COURSE": { type: "string" },
      "GRADUATION SPECIALIZATION": { type: "string" },
      "GRADUATION PASSING YR": { type: "year" },
      "GRADUATION OVERALL MARKS %": { type: "number", min: 0, max: 100 },
      "COURSE": { type: "string" },
      "SPECIALIZATION": { type: "string" },
      "PASSING YEAR": { type: "year" },
      "OVERALL MARKS %": { type: "number", min: 0, max: 100 }
    };
 
    // Validate each data row
    data.slice(1).forEach((row, rowIndex) => {
      const rowNum = rowIndex + 2; // Account for header row
     
      Object.entries(columnRules).forEach(([colName, rules]) => {
        const colIndex = headerRow.indexOf(colName);
        if (colIndex === -1) return;
 
        const cellValue = row[colIndex];
        if (cellValue === undefined || cellValue === "") return;
 
        // Type validation
        switch (rules.type) {
          case "number":
            if (isNaN(Number(cellValue))) {
              errors.push(`Row ${rowNum}: ${colName} must be a number`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = "Must be a number";
            } else if (rules.min !== undefined && Number(cellValue) < rules.min) {
              errors.push(`Row ${rowNum}: ${colName} must be ≥ ${rules.min}`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = `Minimum ${rules.min}`;
            } else if (rules.max !== undefined && Number(cellValue) > rules.max) {
              errors.push(`Row ${rowNum}: ${colName} must be ≤ ${rules.max}`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = `Maximum ${rules.max}`;
            }
            break;
 
          case "year":
            if (isNaN(Number(cellValue))) {
              errors.push(`Row ${rowNum}: ${colName} must be a valid year`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = "Must be a valid year";
            } else {
              const year = Number(cellValue);
              const currentYear = new Date().getFullYear();
              if (year < 1900 || year > currentYear + 5) {
                errors.push(`Row ${rowNum}: ${colName} must be between 1900 and ${currentYear + 5}`);
                cellErrors[`${rowIndex+1}-${colIndex}`] = `Year 1900-${currentYear + 5}`;
              }
            }
            break;
 
          case "string":
            if (typeof cellValue !== "string") {
              errors.push(`Row ${rowNum}: ${colName} must be text`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = "Must be text";
            }
            break;
 
          case "email": {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cellValue)) {
              errors.push(`Row ${rowNum}: Invalid email format in ${colName}`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = "Invalid email format";
            }
            break;
          }
 
          case "phone": {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(String(cellValue))) {
              errors.push(`Row ${rowNum}: ${colName} must be 10 digits`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = "Must be 10 digits";
            }
            break;
          }
 
          case "date":
            if (isNaN(Date.parse(cellValue))) {
              errors.push(`Row ${rowNum}: Invalid date format in ${colName} (use DD-MMM-YY)`);
              cellErrors[`${rowIndex+1}-${colIndex}`] = "Invalid date format";
            }
            break;
        }
      });
    });
 
    setValidationErrors(errors);
    setErrorCells(cellErrors);
    const hasErrors = errors.length > 0;
    setHasFileErrors(hasErrors);
   
    if (hasErrors) {
      setFileErrorMsg(`File contains ${errors.length} validation error(s). Please check and correct them.`);
      toast.error(`File contains ${errors.length} validation error(s)`, {
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else {
      setFileErrorMsg("");
      toast.success("File validation successful!", {
        autoClose: 3000,
        hideProgressBar: true,
      });
    }
   
    return !hasErrors;
  };
 
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
 
    setStudentFile(file);
    setHasFileErrors(false);
    setFileErrorMsg("");
 
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
       
        validateStudentData(jsonData);
        setPreviewData(jsonData);
      } catch {
        setHasFileErrors(true);
        setFileErrorMsg("Error reading file. Please check the format.");
        toast.error("Error reading file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };
 
  const handleFilePreview = () => {
    if (!studentFile) return;
    setShowPreview(true);
  };
 
  const generateSampleFile = () => {
    const workbook = XLSX.utils.book_new();
 
    const header = [
      "SN", "FULL NAME OF STUDENT", "CURRENT COLLEGE NAME", "EMAIL ID", "MOBILE NO.", "BIRTH DATE", "GENDER",
      "HOMETOWN", "10th PASSING YR", "10th OVERALL MARKS %", "12th PASSING YR", "12th OVERALL MARKS %",
      "DIPLOMA COURSE", "DIPLOMA SPECIALIZATION", "DIPLOMA PASSING YR", "DIPLOMA OVERALL MARKS %",
      "GRADUATION COURSE", "GRADUATION SPECIALIZATION", "GRADUATION PASSING YR", "GRADUATION OVERALL MARKS %",
      "COURSE", "SPECIALIZATION", "PASSING YEAR", "OVERALL MARKS %"
    ];
 
    const data = [
      header,
      [1, "Ajay Pawar", "MIT", "XYZ@GMAIL.COM", "9999999999", "24-May-02", "MALE", "PUNE", 2018, 76, 2020, 87, "", "", "", "", "BE", "COMPUTER SCIENCE", 2024, 77, "MBA", "BUSINESS ANALYTICS", 2026, 85],
      [2, "Deep Mahire", "Symbiosis", "ABC@GMAIL.COM", "8888888888", "26-Jun-04", "FEMALE", "SHIRDI", 2020, 57, 2020, 64, "DIPLOMA", "MECHANICAL", 2023, 73, "BTECH", "MECHANICAL", 2026, 66, "MBA", "IT", 2027, 75],
      [3, "Sakshi Patil", "CEOP", "IJK@GMAIL.COM", "7777777777", "22-Sep-03", "FEMALE", "BALLARI", 2020, 62, 2022, "", "", "", "", "", "BE", "ELECTRICAL & ELECTRONICS", 2026, 89, "", "", "", ""]
    ];
 
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet["!cols"] = calculateColumnWidths(data);
 
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
 
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = 1; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }
 
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "Sample_Student_File.xlsx");
  };
 
  const isOtherCourse = formData.course === "Others";
  const currentSpecializations = courseSpecializations[formData.course] || [];
 
  return (
    <section>
      <div className="p-5 bg-white shadow-lg rounded-xl border border-gray-200 space-y-4">
        <h3 className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-500 pb-2">Student Breakdown</h3>
 
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="font-medium">Course <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.course} onChange={(e) => handleChange("course", e.target.value)} required>
              <option value="">Select Course</option>
              {courseOptions.map(course => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>
 
          {isOtherCourse && (
            <div className="space-y-1">
              <label className="font-medium">Other Course <span className="text-red-500">*</span></label>
              <input type="text" className={inputClass} value={formData.otherCourseText || ""} onChange={(e) => handleChange("otherCourseText", e.target.value)} required />
            </div>
          )}
 
          <div className="space-y-1">
            <label className="font-medium">Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.year} onChange={(e) => handleChange("year", e.target.value)} required>
              <option value="">Select Year</option>
              {(courseYears[formData.course] || []).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
 
          <div className="space-y-1">
            <label className="font-medium">Delivery Type <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.deliveryType} onChange={(e) => handleChange("deliveryType", e.target.value)} required>
              <option value="">Delivery Type</option>
              {deliveryTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
 
          <div className="space-y-1">
            <label className="font-medium">Passing Year <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.passingYear} onChange={(e) => handleChange("passingYear", e.target.value)} required>
              <option value="">Passing Year</option>
              {generatePassingYears().map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>
 
        <div className="space-y-4">
          {(formData.courses || []).map((item, index) => {
            const isOthersSpec = item.specialization === "Other";
            return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-medium">Specialization <span className="text-red-500">*</span></label>
                  <select className={selectClass} value={item.specialization} onChange={(e) => updateCourseDetail(index, "specialization", e.target.value)} required>
                    <option value="">Select Specialization</option>
                    {currentSpecializations.map(spec => <option key={spec} value={spec}>{spec}</option>)}
                  </select>
                </div>
 
                {isOthersSpec && (
                  <div className="space-y-1">
                    <label className="font-medium">Other Specialization <span className="text-red-500">*</span></label>
                    <input type="text" className={inputClass} value={item.othersSpecText || ""} onChange={(e) => updateCourseDetail(index, "othersSpecText", e.target.value)} required />
                  </div>
                )}
 
                <div className="space-y-1">
                  <label className="font-medium">No. of Students <span className="text-red-500">*</span></label>
                  <input type="number" className={inputClass} value={item.students} disabled={isOthersSpec && !item.othersSpecText} onChange={(e) => updateCourseDetail(index, "students", e.target.value)} required />
                </div>
 
                <div className="flex items-end gap-2">
                  {index === formData.courses.length - 1 && (
                    <button type="button" onClick={addCourseField} className="flex items-center gap-2 text-blue-600 font-medium cursor-pointer">
                      <FaPlus /> Add
                    </button>
                  )}
                  {formData.courses.length > 1 && (
                    <button type="button" onClick={() => removeCourseField(index)} className="flex items-center gap-2 text-red-600 font-medium cursor-pointer">
                      <FaTrash /> Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
 
        <div className="space-y-1 mt-4">
          <label className="font-medium">Upload Student Excel File <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <input
              type="file"
              accept=".xlsx, .xls"
              className={`${fileInputClass} ${hasFileErrors ? 'border-red-500 text-red-600' : ''}`}
              onChange={handleFileChange}
              required
            />
            <button type="button" onClick={generateSampleFile} className="flex items-center gap-2 text-black font-medium cursor-pointer">
              <FaDownload /> Download Sample
            </button>
            {studentFile && (
              <button
                type="button"
                onClick={handleFilePreview}
                className={`flex items-center gap-2 font-medium cursor-pointer ${
                  hasFileErrors ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {hasFileErrors ? <FaEye /> : <FaCheckCircle />}
                Preview File
                {hasFileErrors && <span className="text-red-500">(Contains Errors)</span>}
                {!hasFileErrors && validationErrors.length === 0 && <span className="text-green-500">(Valid)</span>}
              </button>
            )}
          </div>
          {studentFileError && <p className="text-red-500 text-sm mt-1">{studentFileError}</p>}
          {hasFileErrors && (
            <div className="text-red-500 text-sm mt-1 flex items-start gap-1">
              <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
              <span>{fileErrorMsg}</span>
            </div>
          )}
        </div>
      </div>
 
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
                <ul className="list-disc pl-5 text-red-600 mt-2 max-h-40 overflow-y-auto">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="py-1">{error}</li>
                  ))}
                </ul>
              </div>
            )}
           
            <div className="overflow-auto">
              <table className="table-auto border-collapse w-full text-sm">
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? "font-bold bg-gray-200" : ""}>
                      {row.map((cell, colIndex) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        const hasError = errorCells[cellKey];
                        return (
                          <td
                            key={colIndex}
                            className={`border px-3 py-2 text-center relative ${
                              hasError ? "bg-red-100 border-red-500" : ""
                            }`}
                            title={hasError}
                          >
                            {cell || ""}
                            {hasError && (
                              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                !
                              </div>
                            )}
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
    </section>
  );
};
 
export default StudentBreakdownSection;
 