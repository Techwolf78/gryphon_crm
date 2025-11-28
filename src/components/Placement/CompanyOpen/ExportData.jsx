import { useState, useRef, useEffect } from "react";
import {
  FiDownload,
  FiChevronDown,
  FiFilter,
  FiDatabase,
  FiInfo,
} from "react-icons/fi";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import StudentListExportModal from './StudentListExportModal';
import { formatSalary, formatStipend } from "../../../utils/salaryUtils";

const ExportData = ({ companies, filteredCompanies }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleExport = (option) => {
    const companiesToExport = option === "all" ? companies || [] : filteredCompanies || [];

    if (!companiesToExport || companiesToExport.length === 0) {
      alert("No companies available to export. Please check your data.");
      setMenuOpen(false);
      return;
    }

    // Group companies by status
    const grouped = {
      ongoing: [],
      complete: [],
      onhold: [],
      cancel: [],
      noapplications: []
    };

    companiesToExport.forEach((company) => {
      const status = company.status || 'ongoing';
      if (grouped[status]) {
        grouped[status].push({
          "Company Name": company.companyName || "",
          "College": company.college || "",
          "Job Designation": company.jobDesignation || "",
          "Course": company.course || "",
          "Specialization": company.specialization || "",
          "Job Type": company.jobType || "",
          "Source": company.source || "",
          "Salary (LPA)": company.salary ? formatSalary(company.salary) : "",
          "Stipend (₹/month)": company.stipend ? formatStipend(company.stipend) : "",
          "Job Location": company.jobLocation || "",
          "Company Website": company.companyWebsite || "",
          "Eligibility Criteria": company.marksCriteria || "",
          "Passing Year": company.passingYear || "",
          "Mode of Interview": company.modeOfInterview || "",
          "Joining Period": company.joiningPeriod || "",
          "Mode of Work": company.modeOfWork || "",
          "Job Description": company.jobDescription || "",
          "Internship Duration (months)": company.internshipDuration || "",
          "Company Open Date": company.companyOpenDate || "",
          "Status": company.status || "ongoing",
          "Created Date": company.createdAt?.seconds
            ? new Date(company.createdAt.seconds * 1000).toLocaleDateString()
            : "",
          "Assigned To": company.assignedTo?.name || "",
        });
      }
    });

    const wb = XLSX.utils.book_new();

    const statusColors = {
      ongoing: "FFFFFFCC", // Light yellow
      complete: "CCFFCC",   // Light green
      onhold: "CCECFF",     // Light blue
      cancel: "FFCCCC",     // Light red
      noapplications: "F0F0F0" // Light gray
    };

    const statusLabels = {
      ongoing: "Ongoing",
      complete: "Complete",
      onhold: "On Hold",
      cancel: "Cancelled",
      noapplications: "No Applications"
    };

    let sheetsAdded = 0;

    Object.entries(grouped).forEach(([status, data]) => {
      if (data.length === 0) return;

      const headers = Object.keys(data[0]);
      const sheetData = [
        headers,
        ...data.map((obj) => headers.map((h) => obj[h])),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      ws["!cols"] = headers.map((header) => {
        if (header.includes("Description") || header.includes("Website")) {
          return { wch: 25 };
        }
        if (header.includes("Company Name") || header.includes("College")) {
          return { wch: 20 };
        }
        if (header.includes("Job Designation") || header.includes("Location")) {
          return { wch: 18 };
        }
        return { wch: 15 };
      });

      const range = XLSX.utils.decode_range(ws["!ref"]);

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];

          if (cell) {
            if (R === 0) {
              // Header row styling
              cell.s = {
                fill: {
                  fgColor: { rgb: statusColors[status] },
                },
                font: {
                  bold: true,
                  color: { rgb: "000000" },
                },
                alignment: {
                  horizontal: "center",
                  vertical: "center",
                },
                border: {
                  top: { style: "thin", color: { rgb: "000000" } },
                  bottom: { style: "thin", color: { rgb: "000000" } },
                  left: { style: "thin", color: { rgb: "000000" } },
                  right: { style: "thin", color: { rgb: "000000" } },
                },
              };
            } else {
              // Data row styling
              const isEven = R % 2 === 0;
              cell.s = {
                fill: {
                  fgColor: { rgb: isEven ? "F9F9F9" : "FFFFFF" },
                },
                border: {
                  top: { style: "thin", color: { rgb: "CCCCCC" } },
                  bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                  left: { style: "thin", color: { rgb: "CCCCCC" } },
                  right: { style: "thin", color: { rgb: "CCCCCC" } },
                },
                alignment: {
                  horizontal: "left",
                  vertical: "center",
                  wrapText: headers[C] === "Job Description",
                },
              };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        `${statusLabels[status]} Companies`
      );

      sheetsAdded++;
    });

    if (sheetsAdded === 0) {
      alert("No valid data found to export.");
      setMenuOpen(false);
      return;
    }

    const fileName = option === "all"
      ? "All_Companies.xlsx"
      : Object.keys(grouped)
          .filter((key) => grouped[key].length > 0)
          .map((key) => `${statusLabels[key]}_Companies`)
          .join("_") + ".xlsx";

    try {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again or contact support.");
    }

    setMenuOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center justify-center px-2 py-1 bg-white border border-gray-300 rounded-lg shadow-sm text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out hover:shadow-md"
      >
        <FiDownload className="w-4 h-4 mr-2" />
        Export Data
        <FiChevronDown
          className={`w-4 h-4 ml-2 transition-transform ${
            menuOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 divide-y divide-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Export Options
            </p>
          </div>
          <div className="py-1">
            <button
              onClick={() => handleExport("section")}
              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
            >
              <FiFilter className="w-4 h-4 mr-3 text-blue-500" />
              Current View
              <span className="ml-auto text-xs text-gray-400">Filtered</span>
            </button>
            <button
              onClick={() => handleExport("all")}
              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
            >
              <FiDatabase className="w-4 h-4 mr-3 text-blue-500" />
              All Companies
              <span className="ml-auto text-xs text-gray-400">Complete</span>
            </button>
            <button
              onClick={() => { setMenuOpen(false); setModalOpen(true); }}
              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
            >
              <FiDatabase className="w-4 h-4 mr-3 text-blue-500" />
              Student List Export
              <span className="ml-auto text-xs text-gray-400">By Company / Upload</span>
            </button>
          </div>
          <div className="px-2 py-1 bg-gray-50 text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
            <FiInfo className="w-3 h-3 text-blue-400" />
            Exports as Excel with formatted sheets
          </div>
        </div>
      )}
      {modalOpen && (
        <StudentListExportModal
          companies={companies}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ExportData;